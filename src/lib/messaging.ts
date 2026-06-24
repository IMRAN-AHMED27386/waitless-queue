"use client";

import { getMessaging, getToken, isSupported } from "firebase/messaging";
import app from "./firebase";
import { registerPush } from "./db";

/** Request permission, register the SW, get an FCM token, and attach it to the queue token. */
export async function setupPush(tokenId: string) {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) return;
    if (!(await isSupported())) return;
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) return;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(app);
    const fcmToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
    if (fcmToken) await registerPush({ tokenId, fcmToken });
  } catch {
    /* push unavailable — the in-tab notification still works */
  }
}
