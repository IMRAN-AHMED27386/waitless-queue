import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

const useEmulator = process.env.NEXT_PUBLIC_USE_EMULATOR === "true";

const firebaseConfig = useEmulator
  ? { projectId: "demo-waitless", apiKey: "demo-key", authDomain: "demo-waitless.firebaseapp.com" }
  : {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

export const firebaseReady =
  useEmulator || Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const functions: Functions = getFunctions(app, "asia-south1");
export const storage: FirebaseStorage = getStorage(app);

// Connect to the local emulator once, in the browser.
if (useEmulator && typeof window !== "undefined") {
  const g = globalThis as unknown as { __waitlessEmu?: boolean };
  if (!g.__waitlessEmu) {
    g.__waitlessEmu = true;
    connectFirestoreEmulator(db, "localhost", 8080);
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFunctionsEmulator(functions, "localhost", 5001);
    connectStorageEmulator(storage, "localhost", 9199);
  }
}

export default app;
