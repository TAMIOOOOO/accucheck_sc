import { z } from "zod";

export interface User {
  id: number;
  username: string;
  password: string;
}

export interface Patient {
  id: number;
  patientId: string;
  name: string;
  birthdate: string;
  gender: string;
  contact: string;
  address: string;
  photo: string | null;
  allergies: string | null;
  existingConditions: string | null;
  familyHistory: string | null;
  pastMedicalHistory: string | null;
  personalSocialHistory: string | null;
  createdAt: Date | null;
}

export interface QueueEntry {
  id: number;
  patientId: number;
  complaint: string;
  time: Date | null;
  status: string;
  type: string;
  order: number;
  weight: string | null;
  bloodPressure: string | null;
  pulseRate: string | null;
  temperature: string | null;
}

export interface Consultation {
  id: number;
  patientId: number;
  date: Date | null;
  symptoms: string;
  historyOfPresentIllness: string | null;
  diagnosis: string;
  prescription: string;
  notes: string | null;
  followUpDate: Date | null;
  queueEntryId: number | null;
  weight: string | null;
  bloodPressure: string | null;
  pulseRate: string | null;
  temperature: string | null;
}

export type QueueWithPatient = QueueEntry & { patient: Patient };
export type ConsultationWithPatient = Consultation & { patient: Patient };

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export const insertPatientSchema = z.object({
  patientId: z.string().min(1, "Patient ID is required"),
  name: z.string().min(1, "Full name is required"),
  birthdate: z.string().min(1, "Birthdate is required"),
  gender: z.string().min(1, "Gender is required"),
  contact: z.string().min(1, "Contact number is required"),
  address: z.string().min(1, "Address is required"),
  photo: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  existingConditions: z.string().nullable().optional(),
  familyHistory: z.string().nullable().optional(),
  pastMedicalHistory: z.string().nullable().optional(),
  personalSocialHistory: z.string().nullable().optional(),
});

export const insertQueueSchema = z.object({
  patientId: z.number(),
  complaint: z.string(),
  status: z.string().default("Waiting"),
  type: z.string().default("Walk-in"),
  time: z.date().nullable().optional(),
  order: z.number().optional(),
  weight: z.string().nullable().optional(),
  bloodPressure: z.string().nullable().optional(),
  pulseRate: z.string().nullable().optional(),
  temperature: z.string().nullable().optional(),
});

export const insertConsultationSchema = z.object({
  patientId: z.number(),
  symptoms: z.string(),
  historyOfPresentIllness: z.string().nullable().optional(),
  diagnosis: z.string(),
  prescription: z.string(),
  notes: z.string().nullable().optional(),
  followUpDate: z.date().nullable().optional(),
  queueEntryId: z.number().nullable().optional(),
  weight: z.string().nullable().optional(),
  bloodPressure: z.string().nullable().optional(),
  pulseRate: z.string().nullable().optional(),
  temperature: z.string().nullable().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type InsertConsultation = z.infer<typeof insertConsultationSchema>;

export interface LabResult {
  id: number;
  patientId: number;
  queueEntryId: number | null;
  filename: string;
  mimeType: string;
  data: string;
  uploadedAt: Date | null;
}

export const insertLabResultSchema = z.object({
  patientId: z.number(),
  queueEntryId: z.number().nullable().optional(),
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  data: z.string().min(1),
});

export type InsertLabResult = z.infer<typeof insertLabResultSchema>;
