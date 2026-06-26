import admin from "firebase-admin";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
}

const serviceAccount = JSON.parse(raw);

if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT is missing required fields (project_id, private_key, client_email)");
}

if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const firestore = admin.firestore();
