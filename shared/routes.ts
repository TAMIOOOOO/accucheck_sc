import { z } from 'zod';
import { insertPatientSchema, insertQueueSchema, insertConsultationSchema } from './schema';
import type { Patient, QueueEntry, Consultation } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/login' as const,
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ id: z.number(), username: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/logout' as const,
      responses: { 200: z.object({ success: z.boolean() }) },
    },
    me: {
      method: 'GET' as const,
      path: '/api/user' as const,
      responses: {
        200: z.object({ id: z.number(), username: z.string() }),
        401: errorSchemas.unauthorized,
      },
    },
  },
  patients: {
    list: {
      method: 'GET' as const,
      path: '/api/patients' as const,
      input: z.object({ search: z.string().optional() }).optional(),
      responses: { 200: z.array(z.custom<Patient>()) },
    },
    get: {
      method: 'GET' as const,
      path: '/api/patients/:id' as const,
      responses: { 200: z.custom<Patient>(), 404: errorSchemas.notFound },
    },
    create: {
      method: 'POST' as const,
      path: '/api/patients' as const,
      input: insertPatientSchema,
      responses: { 201: z.custom<Patient>(), 400: errorSchemas.validation },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/patients/:id' as const,
      input: insertPatientSchema.partial(),
      responses: { 200: z.custom<Patient>(), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/patients/:id' as const,
      responses: { 200: z.object({ success: z.boolean() }), 404: errorSchemas.notFound },
    },
  },
  queue: {
    list: {
      method: 'GET' as const,
      path: '/api/queue' as const,
      responses: { 200: z.array(z.custom<any>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/queue' as const,
      input: insertQueueSchema,
      responses: { 201: z.custom<QueueEntry>(), 400: errorSchemas.validation },
    },
    updateStatus: {
      method: 'PATCH' as const,
      path: '/api/queue/:id/status' as const,
      input: z.object({ status: z.string() }),
      responses: { 200: z.custom<QueueEntry>(), 404: errorSchemas.notFound },
    },
    reorder: {
      method: 'PATCH' as const,
      path: '/api/queue/reorder' as const,
      input: z.object({ entries: z.array(z.object({ id: z.number(), order: z.number() })) }),
      responses: { 200: z.object({ success: z.boolean() }) },
    },
  },
  consultations: {
    listByPatient: {
      method: 'GET' as const,
      path: '/api/patients/:id/consultations' as const,
      responses: { 200: z.array(z.custom<Consultation>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/consultations' as const,
      input: insertConsultationSchema,
      responses: { 201: z.custom<Consultation>(), 400: errorSchemas.validation },
    },
  },
  stats: {
    get: {
      method: 'GET' as const,
      path: '/api/stats' as const,
      responses: {
        200: z.object({
          patientsToday: z.number(),
          waitingPatients: z.number(),
          completedConsultations: z.number(),
          totalPatients: z.number(),
          noShowPatients: z.number(),
        }),
      },
    },
  },
  reports: {
    get: {
      method: 'GET' as const,
      path: '/api/reports' as const,
      responses: {
        200: z.object({
          dailyPatientCount: z.number(),
          monthlyConsultations: z.number(),
          commonSymptoms: z.array(z.object({ symptom: z.string(), count: z.number() })),
        }),
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
