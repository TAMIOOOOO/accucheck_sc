import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import bcrypt from "bcryptjs";
import { addSSEClient, startFirestoreListeners } from "./realtime";
import { insertLabResultSchema } from "@shared/schema";

const DEFAULT_ADMIN_USERNAME = "angiesoberanomd";
const DEFAULT_ADMIN_PASSWORD_HASH =
  "$2b$12$5ZIoJEyX3YPbOEPLWW98G.23QqGtMMi8jdrwY5SguPV45MCDkEv1e";

const DEFAULT_DOCTOR_PASSWORD_HASH =
  "$2b$12$5ZIoJEyX3YPbOEPLWW98G.23QqGtMMi8jdrwY5SguPV45MCDkEv1e";

const LEGACY_DISABLED_HASH =
  "$2b$12$WPT6dBTSX2A0YgZnqpzQzOHd6eZceoC/RWlGMu8amCq.IZ.UvF1u.";

const DOCTOR_PASSWORD_HASH =
  process.env.DOCTOR_PASSWORD_HASH || DEFAULT_DOCTOR_PASSWORD_HASH;

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.use(session({
    secret: process.env.SESSION_SECRET || (() => { throw new Error("SESSION_SECRET environment variable is required"); })(),
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false);
        const match = await bcrypt.compare(password, user.password);
        if (!match) return done(null, false);
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    const { password, ...safeUser } = req.user as any;
    res.status(200).json(safeUser);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ success: true });
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated()) {
      const { password, ...safeUser } = req.user as any;
      return res.status(200).json(safeUser);
    }
    res.status(401).json({ message: "Not authenticated" });
  });

  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  const DOCTOR_SESSION_TTL_MS = 30 * 60 * 1000;

  const requireDoctorVerified = (req: any, res: any, next: any) => {
    const verifiedAt: number | undefined = req.session?.doctorVerifiedAt;
    if (verifiedAt && Date.now() - verifiedAt < DOCTOR_SESSION_TTL_MS) {
      return next();
    }
    res.status(403).json({ message: "Doctor verification required" });
  };

  app.post("/api/doctor/verify", requireAuth, async (req, res) => {
    const { password } = req.body as { password?: string };
    if (!password) return res.status(400).json({ message: "Password is required" });
    const match = await bcrypt.compare(password, DOCTOR_PASSWORD_HASH);
    if (!match) return res.status(403).json({ message: "Incorrect doctor password" });
    req.session.doctorVerifiedAt = Date.now();
    res.status(200).json({ ok: true });
  });

  app.get(api.patients.list.path, requireAuth, async (req, res) => {
    const search = req.query.search as string | undefined;
    const allPatients = await storage.getPatients(search);
    res.json(allPatients);
  });

  app.get(api.patients.get.path, requireAuth, async (req, res) => {
    const patient = await storage.getPatient(Number(req.params.id));
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json(patient);
  });

  app.post(api.patients.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.patients.create.input.parse(req.body);
      const patient = await storage.createPatient(input);
      res.status(201).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.put(api.patients.update.path, requireAuth, async (req, res) => {
    try {
      const input = api.patients.update.input.parse(req.body);
      const patient = await storage.updatePatient(Number(req.params.id), input);
      if (!patient) return res.status(404).json({ message: "Patient not found" });
      res.status(200).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(api.patients.delete.path, requireAuth, async (req, res) => {
    const patient = await storage.getPatient(Number(req.params.id));
    if (!patient) return res.status(404).json({ message: "Patient not found" });
    await storage.deletePatient(Number(req.params.id));
    res.status(200).json({ success: true });
  });

  app.get(api.queue.list.path, requireAuth, async (req, res) => {
    const queueEntries = await storage.getQueue();
    res.json(queueEntries);
  });

  app.post(api.queue.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.queue.create.input.parse({
        ...req.body,
        patientId: Number(req.body.patientId),
        time: req.body.time ? new Date(req.body.time) : undefined,
      });
      const entry = await storage.createQueueEntry(input);
      res.status(201).json(entry);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch(api.queue.reorder.path, requireAuth, async (req, res) => {
    try {
      const input = api.queue.reorder.input.parse(req.body);
      await storage.reorderQueue(input.entries);
      res.status(200).json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get("/api/queue/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const entry = await storage.getQueueEntry(id);
    if (!entry) return res.status(404).json({ message: "Queue entry not found" });
    res.json(entry);
  });

  app.patch(api.queue.updateStatus.path, requireAuth, async (req, res) => {
    try {
      const input = api.queue.updateStatus.input.parse(req.body);
      const entry = await storage.updateQueueStatus(Number(req.params.id), input.status);
      res.status(200).json(entry);
    } catch (err) {
      return res.status(404).json({ message: "Queue entry not found" });
    }
  });

  app.get(api.consultations.listByPatient.path, requireAuth, async (req, res) => {
    const history = await storage.getConsultationsByPatient(Number(req.params.id));
    res.json(history);
  });

  app.post(api.consultations.create.path, requireAuth, requireDoctorVerified, async (req, res) => {
    try {
      const body = {
        ...req.body,
        patientId: Number(req.body.patientId),
        followUpDate: req.body.followUpDate ? new Date(req.body.followUpDate) : null
      };

      const explicitQueueEntryId = body.queueEntryId ? Number(body.queueEntryId) : null;

      // Merge vitals from the queue entry automatically
      let vitalsFromQueue: { weight?: string | null; bloodPressure?: string | null; pulseRate?: string | null; temperature?: string | null } = {};
      if (explicitQueueEntryId && !isNaN(explicitQueueEntryId) && explicitQueueEntryId > 0) {
        const queueEntry = await storage.getQueueEntry(explicitQueueEntryId);
        if (!queueEntry) {
          return res.status(400).json({ message: "Queue entry not found" });
        }
        // Verify the queue entry belongs to the same patient to prevent cross-patient linkage
        if (queueEntry.patientId !== Number(body.patientId)) {
          return res.status(400).json({ message: "Queue entry does not belong to this patient" });
        }
        vitalsFromQueue = {
          weight: queueEntry.weight,
          bloodPressure: queueEntry.bloodPressure,
          pulseRate: queueEntry.pulseRate,
          temperature: queueEntry.temperature,
        };
      }

      const input = api.consultations.create.input.parse({
        ...body,
        queueEntryId: explicitQueueEntryId,
        weight: vitalsFromQueue.weight ?? null,
        bloodPressure: vitalsFromQueue.bloodPressure ?? null,
        pulseRate: vitalsFromQueue.pulseRate ?? null,
        temperature: vitalsFromQueue.temperature ?? null,
      });
      const consultation = await storage.createConsultation(input);

      if (explicitQueueEntryId && !isNaN(explicitQueueEntryId) && explicitQueueEntryId > 0) {
        await storage.updateQueueStatus(explicitQueueEntryId, 'Completed');
      } else {
        const queueEntries = await storage.getQueue();
        const phOffset = 8 * 60 * 60 * 1000;
        const phNow = new Date(Date.now() + phOffset);
        const todayPH = new Date(phNow);
        todayPH.setUTCHours(0, 0, 0, 0);
        const todayStart = todayPH.getTime() - phOffset;
        const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;

        const activeEntry = queueEntries.find((q) => {
          const t = q.time ? new Date(q.time).getTime() : 0;
          return (
            q.patientId === input.patientId &&
            (q.status === 'Waiting' || q.status === 'In Consultation') &&
            t >= todayStart &&
            t < tomorrowStart
          );
        });
        if (activeEntry) {
          await storage.updateQueueStatus(activeEntry.id, 'Completed');
        }
      }

      if (input.followUpDate) {
        await storage.createQueueEntry({
          patientId: input.patientId,
          complaint: "Follow-up checkup",
          time: input.followUpDate,
          status: 'Waiting',
          type: 'Follow-up'
        });
      }

      res.status(201).json(consultation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete("/api/consultations/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid consultation ID" });

    const { password } = req.body as { password?: string };
    if (!password) return res.status(400).json({ message: "Password is required" });

    const user = await storage.getUserByUsername((req.user as any).username);
    if (!user) return res.status(403).json({ message: "Incorrect password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(403).json({ message: "Incorrect password" });

    await storage.deleteConsultation(id);
    res.json({ success: true });
  });

  app.post("/api/lab-results", requireAuth, async (req, res) => {
    try {
      const input = insertLabResultSchema.parse({
        ...req.body,
        patientId: Number(req.body.patientId),
        queueEntryId: req.body.queueEntryId != null ? Number(req.body.queueEntryId) : null,
      });
      if (input.data.length > 1_000_000) {
        return res.status(413).json({ message: "File is too large. Please upload a smaller file (under ~750 KB)." });
      }
      const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
      if (!allowedMimes.some((m) => input.mimeType.startsWith("image/") || input.mimeType === "application/pdf")) {
        return res.status(415).json({ message: "Unsupported file type. Only images and PDFs are allowed." });
      }
      const labResult = await storage.createLabResult(input);
      res.status(201).json({
        id: labResult.id,
        patientId: labResult.patientId,
        queueEntryId: labResult.queueEntryId,
        filename: labResult.filename,
        mimeType: labResult.mimeType,
        uploadedAt: labResult.uploadedAt,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get("/api/lab-results/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const labResult = await storage.getLabResult(id);
    if (!labResult) return res.status(404).json({ message: "Lab result not found" });
    res.json(labResult);
  });

  app.get("/api/patients/:id/lab-results", requireAuth, async (req, res) => {
    const patientId = Number(req.params.id);
    const results = await storage.getLabResultsByPatient(patientId);
    res.json(results.map((r) => ({
      id: r.id,
      patientId: r.patientId,
      queueEntryId: r.queueEntryId,
      filename: r.filename,
      mimeType: r.mimeType,
      uploadedAt: r.uploadedAt,
    })));
  });

  app.get("/api/queue/:id/lab-results", requireAuth, async (req, res) => {
    const queueEntryId = Number(req.params.id);
    if (isNaN(queueEntryId)) return res.status(400).json({ message: "Invalid ID" });
    const results = await storage.getLabResultsByQueueEntry(queueEntryId);
    res.json(results);
  });

  app.delete("/api/lab-results/:id", requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    await storage.deleteLabResult(id);
    res.json({ success: true });
  });

  app.get("/api/ping", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.get("/api/events", requireAuth, (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    res.write(":connected\n\n");

    const removeClient = addSSEClient(res);

    const ping = setInterval(() => {
      res.write(":ping\n\n");
    }, 30000);

    req.on("close", () => {
      clearInterval(ping);
      removeClient();
    });
  });

  app.get(api.stats.get.path, requireAuth, async (req, res) => {
    const stats = await storage.getStats();
    res.json(stats);
  });

  app.get(api.reports.get.path, requireAuth, async (req, res) => {
    const stats = await storage.getStats();

    const allConsults = await storage.getAllConsultations();
    const symptomMap: Record<string, number> = {};

    allConsults.forEach(c => {
      const symptoms = c.symptoms.split(',').map(s => s.trim());
      symptoms.forEach(s => {
        if (!s) return;
        symptomMap[s] = (symptomMap[s] || 0) + 1;
      });
    });

    const commonSymptoms = Object.entries(symptomMap)
      .map(([symptom, count]) => ({ symptom, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      dailyPatientCount: stats.patientsToday,
      monthlyConsultations: stats.completedConsultations,
      commonSymptoms
    });
  });

  const setupAdmin = async () => {
    try {
      const existingUser = await storage.getUserByUsername(DEFAULT_ADMIN_USERNAME);
      if (!existingUser) {
        await storage.createUser({ username: DEFAULT_ADMIN_USERNAME, password: DEFAULT_ADMIN_PASSWORD_HASH });
      }
      const legacyAdmin = await storage.getUserByUsername("admin");
      if (legacyAdmin) {
        await storage.updateUserPassword(legacyAdmin.id, LEGACY_DISABLED_HASH);
        console.log("[setup] Legacy 'admin' account disabled.");
      }
    } catch (e) {
      console.error("Failed to setup admin:", e);
    }
  };

  await setupAdmin();

  const runStaleNoShowCleanup = () => {
    storage.markStaleWaitingEntriesNoShow().then((n) => {
      if (n > 0) console.log(`[no-show cleanup] Marked ${n} stale Waiting entr${n === 1 ? "y" : "ies"} as No-show.`);
    }).catch((err) => console.error("[no-show cleanup] Error:", err));
  };

  runStaleNoShowCleanup();
  setInterval(runStaleNoShowCleanup, 5 * 60 * 1000);

  startFirestoreListeners();

  return httpServer;
}
