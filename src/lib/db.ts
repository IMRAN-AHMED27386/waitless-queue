import { db, functions } from "./firebase";
import {
  collection, collectionGroup, doc, onSnapshot, query, where, orderBy,
  updateDoc, addDoc, getDoc, serverTimestamp,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

export type Biz = {
  id: string; name: string; category: string; categoryIcon: string;
  logo: string; location: string; country?: string; distanceKm: number; likes: number;
  alertHeadsUp?: number; alertComeNow?: number;
  plan?: string; status?: string; billingCycle?: string; paidUntil?: string;
  trialEndsAt?: { toDate: () => Date } | null;
  monthlyTokens?: number; tokensMonthKey?: string;
  waEnabled?: boolean; waPaidCount?: number; waPaidMonthKey?: string;
};

export const FREE_MONTHLY_TOKENS = 1000;

/** Plan the business is effectively on right now — an expired trial counts as free. */
export function effectivePlan(b?: Pick<Biz, "plan" | "status" | "trialEndsAt"> | null) {
  if (!b) return "free";
  if (b.status === "trial") {
    const ends = b.trialEndsAt?.toDate ? b.trialEndsAt.toDate().getTime() : 0;
    return ends > Date.now() ? "pro" : "free";
  }
  return b.plan ?? "free";
}

/** Whole days remaining on a trial (0 when none or expired). */
export function trialDaysLeft(b?: Pick<Biz, "status" | "trialEndsAt"> | null) {
  if (!b || b.status !== "trial" || !b.trialEndsAt?.toDate) return 0;
  return Math.max(0, Math.ceil((b.trialEndsAt.toDate().getTime() - Date.now()) / 86400000));
}

/** Tokens issued this calendar month (the server lazily resets the counter). */
export function tokensUsedThisMonth(b?: Pick<Biz, "monthlyTokens" | "tokensMonthKey"> | null) {
  if (!b) return 0;
  const d = new Date();
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return b.tokensMonthKey === key ? (b.monthlyTokens ?? 0) : 0;
}

export const ALERT_HEADS_UP_DEFAULT = 10;
export const ALERT_COME_NOW_DEFAULT = 3;
export const BUSINESS_CATEGORIES = ["Hospitals", "Clinics", "Banks", "Government", "Restaurants"];
export const CATEGORY_ICON: Record<string, string> = { Hospitals: "🏥", Clinics: "💊", Banks: "🏦", Government: "🏛️", Restaurants: "🍽️" };
export type Svc = {
  id: string; businessId: string; name: string; icon: string; prefix: string;
  currentServing: number; lastIssued: number; avgMins: number;
  delayMins?: number; delayAt?: { toDate: () => Date } | null;
  paceMins?: number;
};
export type JourneyStage = {
  serviceId: string; serviceName: string; number: string;
  servedBy?: string | null; at?: number;
};
export type Tok = {
  id: string; businessId: string; serviceId: string; prefix: string;
  numericValue: number; number: string; customerName: string; phone: string;
  priority: string; status: string; servedBy?: string | null;
  journey?: JourneyStage[]; parkedAt?: { toDate: () => Date } | null;
  waCode?: string; waTo?: string;
};

export const waitingOf = (s: Svc) => Math.max(0, s.lastIssued - s.currentServing);

/** Minutes per customer: the live measured pace when we have one, else the configured average. */
export const paceOf = (s: Svc) => (s.paceMins && s.paceMins > 0 ? s.paceMins : s.avgMins);
/** True when the estimate comes from real measured serving speed. */
export const hasLivePace = (s: Svc) => !!(s.paceMins && s.paceMins > 0);

export function listenBusinesses(cb: (b: Biz[]) => void) {
  return onSnapshot(collection(db, "businesses"), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Biz))
  );
}

export function listenAllServices(cb: (s: Svc[]) => void) {
  return onSnapshot(collectionGroup(db, "services"), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, businessId: d.ref.parent.parent!.id, ...d.data() }) as Svc))
  );
}

export function listenService(businessId: string, serviceId: string, cb: (s: Svc | null) => void) {
  return onSnapshot(doc(db, `businesses/${businessId}/services/${serviceId}`), (d) =>
    cb(d.exists() ? ({ id: d.id, businessId, ...d.data() } as Svc) : null)
  );
}

export function listenToken(id: string, cb: (t: Tok | null) => void) {
  return onSnapshot(doc(db, "tokens", id), (d) =>
    cb(d.exists() ? ({ id: d.id, ...d.data() } as Tok) : null)
  );
}

export type Branch = {
  id: string; name: string; location: string; status: string;
  inQueue: number; counters: number; avgWait: string;
};

export function listenBranches(businessId: string, cb: (b: Branch[]) => void) {
  return onSnapshot(collection(db, `businesses/${businessId}/branches`), (snap) =>
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Branch))
  );
}

export function addBranch(businessId: string, data: Omit<Branch, "id">) {
  return addDoc(collection(db, `businesses/${businessId}/branches`), data);
}

export function updateBranch(businessId: string, branchId: string, data: Partial<Branch>) {
  return updateDoc(doc(db, `businesses/${businessId}/branches/${branchId}`), data);
}

export function addService(businessId: string, data: { name: string; icon: string; prefix: string; avgMins: number }) {
  return addDoc(collection(db, `businesses/${businessId}/services`), { ...data, businessId, currentServing: 0, lastIssued: 0 });
}

export function updateService(businessId: string, serviceId: string, data: Partial<Svc>) {
  return updateDoc(doc(db, `businesses/${businessId}/services/${serviceId}`), data);
}

export function addBusiness(data: Record<string, unknown>) {
  return addDoc(collection(db, "businesses"), data);
}

export function updateBusiness(businessId: string, data: Record<string, unknown>) {
  return updateDoc(doc(db, "businesses", businessId), data);
}

export function listenQueue(businessId: string, serviceId: string, cb: (t: Tok[]) => void) {
  const q = query(
    collection(db, "tokens"),
    where("businessId", "==", businessId),
    where("serviceId", "==", serviceId),
    where("status", "==", "waiting"),
    orderBy("numericValue")
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tok)));
}

/** Token issuance runs server-side (Cloud Function) so the number can't be faked. */
export async function issueToken(
  businessId: string, serviceId: string,
  info: { name: string; phone: string; priority: string }
) {
  const fn = httpsCallable(functions, "issueToken");
  const res = await fn({ businessId, serviceId, name: info.name, phone: info.phone, priority: info.priority });
  return res.data as { id: string; number: string; numericValue: number };
}

/** Queue advancement runs server-side (Cloud Function); requires staff auth. */
export async function advanceQueue(businessId: string, serviceId: string, servedBy?: string) {
  const fn = httpsCallable(functions, "advanceQueue");
  const res = await fn({ businessId, serviceId, servedBy: servedBy ?? null });
  return (res.data as { num: number | null }).num;
}

/** Staff announces (or clears, with 0) a delay — pushes new ETAs to everyone waiting. */
export async function setDelay(businessId: string, serviceId: string, delayMins: number) {
  const fn = httpsCallable(functions, "setDelay");
  const res = await fn({ businessId, serviceId, delayMins });
  return res.data as { ok: boolean; notified: number; waiting: number };
}

export type ParkedTok = Tok & { parkedDate: Date | null };

/** Live list of customers parked (held) for a service. */
export function listenParked(businessId: string, serviceId: string, cb: (t: ParkedTok[]) => void) {
  const q = query(
    collection(db, "tokens"),
    where("businessId", "==", businessId),
    where("serviceId", "==", serviceId),
    where("status", "==", "parked"),
  );
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown> & { parkedAt?: { toDate?: () => Date } };
    return { id: d.id, ...(x as object), parkedDate: x.parkedAt?.toDate ? x.parkedAt.toDate() : null } as ParkedTok;
  })));
}

/** Staff parks the customer at the counter (called but not present) — holds their slot. */
export async function parkToken(businessId: string, serviceId: string) {
  const res = await httpsCallable(functions, "parkToken")({ businessId, serviceId });
  return res.data as { ok: boolean; number: string };
}

/** Staff recalls a parked customer back to the counter (they've arrived). */
export async function recallToken(businessId: string, serviceId: string, tokenId: string) {
  const res = await httpsCallable(functions, "recallToken")({ businessId, serviceId, tokenId });
  return res.data as { ok: boolean; number: string };
}

/** Staff moves the customer being served into another service's queue (multi-stage journey). */
export async function transferToken(businessId: string, fromServiceId: string, toServiceId: string) {
  const fn = httpsCallable(functions, "transferToken");
  const res = await fn({ businessId, fromServiceId, toServiceId });
  return res.data as { id: string; number: string; numericValue: number; position: number; toName: string };
}

export function cancelToken(id: string) {
  return httpsCallable(functions, "cancelToken")({ tokenId: id });
}

export function registerPush(data: { tokenId: string; fcmToken: string }) {
  return httpsCallable(functions, "registerPush")(data);
}

export function saveFeedback(data: { businessId: string; serviceId: string; tokenId?: string; rating: number; label: string }) {
  return addDoc(collection(db, "feedback"), { ...data, createdAt: serverTimestamp() });
}

/** Look up active tokens by phone number for customer recovery. Returns waiting/parked tokens. */
export function listenTokensByPhone(phone: string, cb: (tokens: (Tok & { bizName?: string })[]) => void) {
  if (!phone.trim()) { cb([]); return () => {}; }
  return onSnapshot(
    query(collection(db, "tokens"), where("phone", "==", phone.trim()), where("status", "in", ["waiting", "parked"])),
    async (snap) => {
      const tokens = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tok));
      // Enrich with business name
      const enriched = await Promise.all(tokens.map(async (t) => {
        try {
          const bizSnap = await getDoc(doc(db, "businesses", t.businessId));
          return { ...t, bizName: bizSnap.exists() ? (bizSnap.data().name as string) : undefined };
        } catch { return t; }
      }));
      cb(enriched);
    },
    () => cb([])
  );
}

export type HistTok = Tok & { createdAt: Date | null };

export function listenBusinessTokens(businessId: string, cb: (t: HistTok[]) => void) {
  return onSnapshot(
    query(collection(db, "tokens"), where("businessId", "==", businessId)),
    (snap) => cb(snap.docs.map((d) => {
      const x = d.data() as Record<string, unknown> & { createdAt?: { toDate?: () => Date } };
      return { id: d.id, ...(x as object), createdAt: x.createdAt?.toDate ? x.createdAt.toDate() : null } as HistTok;
    }))
  );
}

export function listenBusiness(id: string, cb: (b: (Biz & { featureToggles?: Record<string, boolean> }) | null) => void) {
  return onSnapshot(doc(db, "businesses", id), (d) =>
    cb(d.exists() ? ({ id: d.id, ...d.data() } as Biz & { featureToggles?: Record<string, boolean> }) : null)
  );
}

export function setFeatureToggle(businessId: string, key: string, value: boolean) {
  return updateDoc(doc(db, "businesses", businessId), { [`featureToggles.${key}`]: value });
}

/** Self-signup: creates the caller's business + links their account to it as admin. */
export async function onboardBusiness(data: { businessName: string; category: string; country?: string; location: string; ownerName: string }) {
  const fn = httpsCallable(functions, "onboardBusiness");
  const res = await fn(data);
  return res.data as { businessId: string };
}
