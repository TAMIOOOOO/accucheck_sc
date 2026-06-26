import { firestore } from "./firestore";
import type { Response } from "express";

const clients = new Set<Response>();

export function addSSEClient(res: Response): () => void {
  clients.add(res);
  return () => clients.delete(res);
}

function broadcast(collection: string): void {
  const message = `event: change\ndata: ${collection}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

export function startFirestoreListeners(): void {
  const watched = ["queue", "patients", "consultations"];

  for (const col of watched) {
    let initialized = false;

    firestore.collection(col).onSnapshot(
      () => {
        if (!initialized) {
          initialized = true;
          return;
        }
        broadcast(col);
      },
      (err) => {
        console.error(`[realtime] Firestore listener error for "${col}":`, err.message);
      }
    );
  }

  console.log("[realtime] Firestore real-time listeners started for: queue, patients, consultations");
}
