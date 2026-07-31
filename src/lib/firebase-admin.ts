import * as admin from 'firebase-admin';
import { getApps, initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let db;
let auth;

if (!getApps().length) {
  try {
    let credential;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        credential = cert(serviceAccount);
      } catch (parseErr) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY JSON', parseErr);
        throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON format");
      }
    } else {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is missing from environment variables");
    }

    initializeApp({
      credential,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    
    db = getFirestore();
    auth = getAuth();
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
} else {
  db = getFirestore();
  auth = getAuth();
}

export const adminDb = db as any;
export const adminAuth = auth as any;
