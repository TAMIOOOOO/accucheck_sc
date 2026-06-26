import {
  type User,
  type InsertUser,
  type Patient,
  type InsertPatient,
  type QueueEntry,
  type InsertQueue,
  type Consultation,
  type InsertConsultation,
  type QueueWithPatient,
  type LabResult,
  type InsertLabResult,
} from "@shared/schema";
import { firestore } from "./firestore";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

function toDate(val: any): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (val.toDate) return val.toDate();
  if (typeof val === "string" || typeof val === "number") return new Date(val);
  return null;
}

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPassword(id: number, hashedPassword: string): Promise<void>;

  getPatients(search?: string): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: Partial<InsertPatient>): Promise<Patient>;
  deletePatient(id: number): Promise<void>;

  getQueue(): Promise<QueueWithPatient[]>;
  getQueueEntry(id: number): Promise<QueueEntry | undefined>;
  createQueueEntry(entry: InsertQueue): Promise<QueueEntry>;
  updateQueueStatus(id: number, status: string): Promise<QueueEntry>;

  getConsultationsByPatient(patientId: number): Promise<Consultation[]>;
  createConsultation(consultation: InsertConsultation): Promise<Consultation>;
  deleteConsultation(id: number): Promise<void>;
  getAllConsultations(): Promise<Consultation[]>;

  createLabResult(data: InsertLabResult): Promise<LabResult>;
  getLabResult(id: number): Promise<LabResult | undefined>;
  getLabResultsByPatient(patientId: number): Promise<LabResult[]>;
  getLabResultsByQueueEntry(queueEntryId: number): Promise<LabResult[]>;
  deleteLabResult(id: number): Promise<void>;

  getStats(): Promise<{ patientsToday: number; waitingPatients: number; completedConsultations: number; totalPatients: number; noShowPatients: number }>;
  reorderQueue(entries: { id: number; order: number }[]): Promise<void>;
  markStaleWaitingEntriesNoShow(): Promise<number>;
  sessionStore: session.Store;
}

async function getNextId(counterName: string): Promise<number> {
  const counterRef = firestore.collection("counters").doc(counterName);
  const result = await firestore.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    const current = doc.exists ? (doc.data()!.value as number) : 0;
    const next = current + 1;
    t.set(counterRef, { value: next });
    return next;
  });
  return result;
}

function docToUser(data: FirebaseFirestore.DocumentData): User {
  return {
    id: data.id,
    username: data.username,
    password: data.password,
  };
}

function docToPatient(data: FirebaseFirestore.DocumentData): Patient {
  return {
    id: data.id,
    patientId: data.patientId,
    name: data.name,
    birthdate: data.birthdate,
    gender: data.gender,
    contact: data.contact,
    address: data.address,
    photo: data.photo ?? null,
    allergies: data.allergies ?? null,
    existingConditions: data.existingConditions ?? null,
    familyHistory: data.familyHistory ?? null,
    pastMedicalHistory: data.pastMedicalHistory ?? null,
    personalSocialHistory: data.personalSocialHistory ?? null,
    createdAt: toDate(data.createdAt),
  };
}

function docToQueueEntry(data: FirebaseFirestore.DocumentData): QueueEntry {
  return {
    id: data.id,
    patientId: data.patientId,
    complaint: data.complaint,
    time: toDate(data.time),
    status: data.status,
    type: data.type,
    order: data.order ?? 0,
    weight: data.weight ?? null,
    bloodPressure: data.bloodPressure ?? null,
    pulseRate: data.pulseRate ?? null,
    temperature: data.temperature ?? null,
  };
}

function docToConsultation(data: FirebaseFirestore.DocumentData): Consultation {
  return {
    id: data.id,
    patientId: data.patientId,
    date: toDate(data.date),
    symptoms: data.symptoms,
    historyOfPresentIllness: data.historyOfPresentIllness ?? null,
    diagnosis: data.diagnosis,
    prescription: data.prescription,
    notes: data.notes ?? null,
    followUpDate: toDate(data.followUpDate),
    queueEntryId: data.queueEntryId ?? null,
    weight: data.weight ?? null,
    bloodPressure: data.bloodPressure ?? null,
    pulseRate: data.pulseRate ?? null,
    temperature: data.temperature ?? null,
  };
}

function docToLabResult(data: FirebaseFirestore.DocumentData): LabResult {
  return {
    id: data.id,
    patientId: data.patientId,
    queueEntryId: data.queueEntryId ?? null,
    filename: data.filename,
    mimeType: data.mimeType,
    data: data.data,
    uploadedAt: toDate(data.uploadedAt),
  };
}

export class FirestoreStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const snap = await firestore.collection("users").where("id", "==", id).limit(1).get();
    if (snap.empty) return undefined;
    return docToUser(snap.docs[0].data());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const snap = await firestore.collection("users").where("username", "==", username).limit(1).get();
    if (snap.empty) return undefined;
    return docToUser(snap.docs[0].data());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = await getNextId("users");
    const user: User = { id, ...insertUser };
    await firestore.collection("users").doc(String(id)).set(user);
    return user;
  }

  async updateUserPassword(id: number, hashedPassword: string): Promise<void> {
    await firestore.collection("users").doc(String(id)).update({ password: hashedPassword });
  }

  async getPatients(search?: string): Promise<Patient[]> {
    const snap = await firestore.collection("patients").get();
    let results = snap.docs.map((d) => docToPatient(d.data()));
    results.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    if (search) {
      const lower = search.toLowerCase();
      results = results.filter(
        (p) => p.name.toLowerCase().includes(lower) || p.patientId.includes(search)
      );
    }
    return results;
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const doc = await firestore.collection("patients").doc(String(id)).get();
    if (!doc.exists) return undefined;
    return docToPatient(doc.data()!);
  }

  async createPatient(patient: InsertPatient): Promise<Patient> {
    const id = await getNextId("patients");
    const now = new Date();
    const newPatient: Patient = {
      id,
      patientId: patient.patientId,
      name: patient.name,
      birthdate: patient.birthdate,
      gender: patient.gender,
      contact: patient.contact,
      address: patient.address,
      photo: patient.photo ?? null,
      allergies: patient.allergies ?? null,
      existingConditions: patient.existingConditions ?? null,
      familyHistory: patient.familyHistory ?? null,
      pastMedicalHistory: patient.pastMedicalHistory ?? null,
      personalSocialHistory: patient.personalSocialHistory ?? null,
      createdAt: now,
    };
    await firestore.collection("patients").doc(String(id)).set(newPatient);
    return newPatient;
  }

  async updatePatient(id: number, updates: Partial<InsertPatient>): Promise<Patient> {
    const ref = firestore.collection("patients").doc(String(id));
    await ref.update(updates as Record<string, any>);
    const doc = await ref.get();
    return docToPatient(doc.data()!);
  }

  async deletePatient(id: number): Promise<void> {
    await firestore.collection("patients").doc(String(id)).delete();
  }

  async getQueue(): Promise<QueueWithPatient[]> {
    const snap = await firestore.collection("queue").get();
    const entries = snap.docs.map((d) => docToQueueEntry(d.data()));
    entries.sort((a, b) => a.order - b.order);

    const results: QueueWithPatient[] = [];
    for (const entry of entries) {
      const patient = await this.getPatient(entry.patientId);
      if (patient) {
        results.push({ ...entry, patient });
      }
    }
    return results;
  }

  async createQueueEntry(entry: InsertQueue): Promise<QueueEntry> {
    const id = await getNextId("queue");
    const now = new Date();
    const allSnap = await firestore.collection("queue").get();
    const allEntries = allSnap.docs.map((d) => docToQueueEntry(d.data()));
    const maxOrder = allEntries.reduce((max, e) => Math.max(max, e.order), 0);
    const newEntry: QueueEntry = {
      id,
      patientId: entry.patientId,
      complaint: entry.complaint,
      time: entry.time ?? now,
      status: entry.status ?? "Waiting",
      type: entry.type ?? "Walk-in",
      order: entry.order ?? maxOrder + 1,
      weight: entry.weight ?? null,
      bloodPressure: entry.bloodPressure ?? null,
      pulseRate: entry.pulseRate ?? null,
      temperature: entry.temperature ?? null,
    };
    await firestore.collection("queue").doc(String(id)).set(newEntry);
    return newEntry;
  }

  async updateQueueStatus(id: number, status: string): Promise<QueueEntry> {
    const ref = firestore.collection("queue").doc(String(id));
    await ref.update({ status });
    const doc = await ref.get();
    return docToQueueEntry(doc.data()!);
  }

  async getConsultationsByPatient(patientId: number): Promise<Consultation[]> {
    const snap = await firestore
      .collection("consultations")
      .where("patientId", "==", patientId)
      .get();
    const results = snap.docs.map((d) => docToConsultation(d.data()));
    results.sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });
    return results;
  }

  async getQueueEntry(id: number): Promise<QueueEntry | undefined> {
    const doc = await firestore.collection("queue").doc(String(id)).get();
    if (!doc.exists) return undefined;
    return docToQueueEntry(doc.data()!);
  }

  async createConsultation(consultation: InsertConsultation): Promise<Consultation> {
    const id = await getNextId("consultations");
    const now = new Date();
    const newConsultation: Consultation = {
      id,
      patientId: consultation.patientId,
      date: now,
      symptoms: consultation.symptoms,
      historyOfPresentIllness: consultation.historyOfPresentIllness ?? null,
      diagnosis: consultation.diagnosis,
      prescription: consultation.prescription,
      notes: consultation.notes ?? null,
      followUpDate: consultation.followUpDate ?? null,
      queueEntryId: consultation.queueEntryId ?? null,
      weight: consultation.weight ?? null,
      bloodPressure: consultation.bloodPressure ?? null,
      pulseRate: consultation.pulseRate ?? null,
      temperature: consultation.temperature ?? null,
    };
    await firestore.collection("consultations").doc(String(id)).set(newConsultation);
    return newConsultation;
  }

  async deleteConsultation(id: number): Promise<void> {
    await firestore.collection("consultations").doc(String(id)).delete();
  }

  async getAllConsultations(): Promise<Consultation[]> {
    const snap = await firestore.collection("consultations").get();
    return snap.docs.map((d) => docToConsultation(d.data()));
  }

  async createLabResult(data: InsertLabResult): Promise<LabResult> {
    const id = await getNextId("labResults");
    const now = new Date();
    const newLabResult: LabResult = {
      id,
      patientId: data.patientId,
      queueEntryId: data.queueEntryId ?? null,
      filename: data.filename,
      mimeType: data.mimeType,
      data: data.data,
      uploadedAt: now,
    };
    await firestore.collection("labResults").doc(String(id)).set(newLabResult);
    return newLabResult;
  }

  async getLabResult(id: number): Promise<LabResult | undefined> {
    const doc = await firestore.collection("labResults").doc(String(id)).get();
    if (!doc.exists) return undefined;
    return docToLabResult(doc.data()!);
  }

  async getLabResultsByPatient(patientId: number): Promise<LabResult[]> {
    const snap = await firestore
      .collection("labResults")
      .where("patientId", "==", patientId)
      .get();
    const results = snap.docs.map((d) => docToLabResult(d.data()));
    results.sort((a, b) => {
      const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return bTime - aTime;
    });
    return results;
  }

  async getLabResultsByQueueEntry(queueEntryId: number): Promise<LabResult[]> {
    const snap = await firestore
      .collection("labResults")
      .where("queueEntryId", "==", queueEntryId)
      .get();
    const results = snap.docs.map((d) => docToLabResult(d.data()));
    results.sort((a, b) => {
      const aTime = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const bTime = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return aTime - bTime;
    });
    return results;
  }

  async deleteLabResult(id: number): Promise<void> {
    await firestore.collection("labResults").doc(String(id)).delete();
  }

  async reorderQueue(entries: { id: number; order: number }[]): Promise<void> {
    const batch = firestore.batch();
    for (const entry of entries) {
      const ref = firestore.collection("queue").doc(String(entry.id));
      batch.update(ref, { order: entry.order });
    }
    await batch.commit();
  }

  async markStaleWaitingEntriesNoShow(): Promise<number> {
    const snap = await firestore.collection("queue").get();
    const entries = snap.docs.map((d) => docToQueueEntry(d.data()));

    const phOffset = 8 * 60 * 60 * 1000;
    const phNow = new Date(Date.now() + phOffset);
    const todayPH = new Date(phNow);
    todayPH.setUTCHours(0, 0, 0, 0);
    const todayStartUtc = todayPH.getTime() - phOffset;

    const stale = entries.filter((e) =>
      e.status === "Waiting" &&
      e.time !== null &&
      new Date(e.time).getTime() < todayStartUtc
    );

    await Promise.all(stale.map((e) => this.updateQueueStatus(e.id, "No-show")));
    return stale.length;
  }

  async getStats() {
    const allPatientsSnap = await firestore.collection("patients").get();
    const allQueueSnap = await firestore.collection("queue").get();
    const allQueue = allQueueSnap.docs.map((d) => docToQueueEntry(d.data()));

    const now = new Date();
    const phOffset = 8 * 60 * 60 * 1000;
    const phNow = new Date(now.getTime() + phOffset);
    const today = new Date(phNow);
    today.setUTCHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime() - phOffset;
    const tomorrowTimestamp = todayTimestamp + 24 * 60 * 60 * 1000;

    const isToday = (t: any) => {
      if (!t) return false;
      const ms = new Date(t).getTime();
      return ms >= todayTimestamp && ms < tomorrowTimestamp;
    };

    const patientsToday = allQueue.filter((q) => isToday(q.time)).length;
    const waitingPatients = allQueue.filter((q) => q.status === "Waiting" && isToday(q.time)).length;
    const completedConsultations = allQueue.filter((q) => q.status === "Completed" && isToday(q.time)).length;
    const noShowPatients = allQueue.filter((q) => q.status === "No-show" && isToday(q.time)).length;

    return {
      patientsToday,
      waitingPatients,
      completedConsultations,
      totalPatients: allPatientsSnap.size,
      noShowPatients,
    };
  }
}

export const storage = new FirestoreStorage();
