# AccuCheck Clinic Management System

## Overview
A full-stack Clinic Management System for managing patients, consultations, queues, and reports. Built with Express + React + TypeScript, using Google Cloud Firestore for persistent data storage.

## Architecture
- **Frontend**: React 18 with Vite, Tailwind CSS, Radix UI components, TanStack Query, PWA (vite-plugin-pwa)
- **Backend**: Express 5 with TypeScript, Passport.js authentication
- **Database**: Google Cloud Firestore (Firebase Admin SDK)
- **Session Store**: In-memory (memorystore)
- **Routing**: Wouter (client-side), Express (server-side API)
- **Timezone**: All dates/times displayed in Philippine Time (Asia/Manila) via `client/src/lib/ph-time.ts`

## Project Structure
```
client/           - React frontend
  src/pages/      - Page components (Dashboard, Patients, Queue, etc.)
  src/components/ - Reusable UI components (Radix-based)
  src/hooks/      - Custom React hooks
  src/lib/        - Utilities (queryClient, ph-time, utils)
server/           - Express backend
  index.ts        - Server entry point
  routes.ts       - API route handlers
  storage.ts      - Firestore data access layer (IStorage interface)
  firestore.ts    - Firebase Admin SDK initialization
  vite.ts         - Vite dev server integration
  static.ts       - Production static file serving
shared/           - Shared types, schemas, route definitions
  schema.ts       - Data types and Zod validation schemas
  routes.ts       - API path and schema definitions
```

## Firestore Collections
- `users` - Authentication (username/password)
- `patients` - Patient profiles
- `queue` - Patient queue entries (with `order` field for reordering)
- `consultations` - Medical consultation records
- `counters` - Auto-increment ID counters

## Key Design Decisions
- Firestore queries avoid composite indexes by sorting in-memory (e.g., getConsultationsByPatient, getPatients)
- Queue entries have an `order` field for staff-controlled ordering via up/down arrows
- `firebase-admin` is always marked as external in `script/build.ts` to prevent esbuild resolution errors
- `SESSION_SECRET` is required (no fallback) for security

## API Endpoints
- `POST /api/login`, `POST /api/logout`, `GET /api/user` - Auth
- `GET/POST /api/patients`, `GET/PUT /api/patients/:id` - Patients
- `GET/POST /api/queue`, `PATCH /api/queue/:id/status`, `PATCH /api/queue/reorder` - Queue
- `GET /api/patients/:id/consultations`, `POST /api/consultations` - Consultations
- `GET /api/stats`, `GET /api/reports` - Dashboard stats

## Environment Variables
- `FIREBASE_SERVICE_ACCOUNT` - Firebase service account JSON (required)
- `SESSION_SECRET` - Express session secret (required)
- `PORT` - Server port (defaults to 5000)

## Running
- Development: `npm run dev` (runs tsx with Vite HMR)
- Production: `npm run build` then `npm start`

## Default Login
- Username: `admin`
- Password: `password`
