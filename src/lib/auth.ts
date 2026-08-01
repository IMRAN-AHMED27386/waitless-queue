"use client";

import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type AppUser = { uid: string; email: string | null; role: string; name?: string; businessId?: string; roomId?: string };

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

/** Creates the Firebase Auth account for a new business owner signing up. Signs them in immediately. */
export function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signOutUser() {
  return signOut(auth);
}

export function signInWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function getRole(uid: string): Promise<string> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? ((snap.data().role as string) ?? "customer") : "customer";
}

export function homeFor(role: string) {
  return role === "super" ? "/super" : role === "doctor" ? "/doctor" : role === "staff" ? "/staff" : role === "admin" ? "/admin" : "/app";
}

export function onUser(cb: (u: AppUser | null) => void) {
  let unsubSnapshot: (() => void) | null = null;
  const unsubAuth = onAuthStateChanged(auth, (fb) => {
    if (unsubSnapshot) { unsubSnapshot(); unsubSnapshot = null; }
    if (!fb) { cb(null); return; }
    // Use onSnapshot for instant load + live sync — no extra round-trip delay
    unsubSnapshot = onSnapshot(doc(db, "users", fb.uid), (snap) => {
      const data = snap.exists() ? snap.data() : {};
      cb({ uid: fb.uid, email: fb.email, role: (data.role as string) ?? "customer", name: data.name, businessId: data.businessId, roomId: data.roomId });
    }, () => {
      // Firestore read failed — still return minimal user so pages don't stall
      cb({ uid: fb.uid, email: fb.email, role: "customer", name: undefined, businessId: undefined, roomId: undefined });
    });
  });
  return () => {
    unsubAuth();
    if (unsubSnapshot) { unsubSnapshot(); }
  };
}

/** Client hook: redirects to /login unless signed in with an allowed role. */
export function useAuthGuard(allowed: string[]) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  useEffect(() => onUser((u) => {
    if (!u) { router.replace("/login"); return; }
    if (allowed.length && !allowed.includes(u.role)) { router.replace("/login"); return; }
    setUser(u);
    setReady(true);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps
  return { user, ready };
}
