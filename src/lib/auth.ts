"use client";

import { auth, db } from "./firebase";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type AppUser = { uid: string; email: string | null; role: string; name?: string };

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
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
  return role === "super" ? "/super" : role === "staff" ? "/staff" : role === "admin" ? "/admin" : "/app";
}

export function onUser(cb: (u: AppUser | null) => void) {
  return onAuthStateChanged(auth, async (fb) => {
    if (!fb) { cb(null); return; }
    const snap = await getDoc(doc(db, "users", fb.uid));
    const data = snap.exists() ? snap.data() : {};
    cb({ uid: fb.uid, email: fb.email, role: (data.role as string) ?? "customer", name: data.name });
  });
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
