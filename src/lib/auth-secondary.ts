import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";

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

// Initialize a secondary app just for user creation
const secondaryApp: FirebaseApp = getApps().find(a => a.name === "SecondaryAuthApp") 
  || initializeApp(firebaseConfig, "SecondaryAuthApp");

const secondaryAuth = getAuth(secondaryApp);

/**
 * Creates a user via the secondary auth app so the primary Admin is NOT signed out.
 * Returns the newly created UID.
 */
export async function createStaffAuthAccount(email: string, pass: string) {
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
  await signOut(secondaryAuth);
  return cred.user.uid;
}
