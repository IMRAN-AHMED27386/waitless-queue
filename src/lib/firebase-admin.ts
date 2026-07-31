import * as admin from 'firebase-admin';

let db: admin.firestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;

if (!admin.apps.length) {
  try {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = admin.credential.cert(serviceAccount);
      } catch (parseErr) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON', parseErr);
        throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON format");
      }
    } else {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables");
    }

    admin.initializeApp({
      credential,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    
    db = admin.firestore();
    auth = admin.auth();
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
} else {
  db = admin.firestore();
  auth = admin.auth();
}

export const adminDb = db;
export const adminAuth = auth;
