"use client";

import { getMessaging, getToken, isSupported } from "firebase/messaging";
import app from "./firebase";
import { registerPush } from "./db";

/**
 * Show a local notification for the tab that's open.
 * On Android Chrome `new Notification()` throws "Illegal constructor" — you MUST
 * use the service worker's showNotification(). We prefer that everywhere and only
 * fall back to the constructor on desktop, and swallow any error so a notification
 * can never crash the page.
 */
export async function showLocalNotification(title: string, body: string) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg?.showNotification) {
        await reg.showNotification(title, { body });
        return;
      }
    }
    new Notification(title, { body });
  } catch {
    /* notifications unavailable on this device — the live on-screen UI still updates */
  }
}

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
