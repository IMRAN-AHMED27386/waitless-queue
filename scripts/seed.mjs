// Seeds the local Firestore emulator with Waitless demo data.
// Run with the emulator running:  npm run seed
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const CLOUD = process.env.SEED_TARGET === "cloud";
if (!CLOUD) {
  process.env.FIRESTORE_EMULATOR_HOST =
    process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST =
    process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
}

// Cloud target uses ADC from GOOGLE_APPLICATION_CREDENTIALS; emulator needs none.
initializeApp({ projectId: CLOUD ? (process.env.SEED_PROJECT || "waitless-mv") : "demo-waitless" });
console.log(`Seeding target: ${CLOUD ? (process.env.SEED_PROJECT || "waitless-mv") + " (CLOUD)" : "emulator"}`);
const db = getFirestore();
const adminAuth = getAuth();

// Business metadata for the Super Admin table.
const meta = {
  "sunshine-clinic": { plan: "pro", status: "active", monthlyTokens: 8420, industry: "Hospital" },
  "city-salon": { plan: "free", status: "active", monthlyTokens: 1240, industry: "Salon" },
  "bank-maldives": { plan: "enterprise", status: "active", monthlyTokens: 22100, industry: "Bank" },
  "civil-service": { plan: "pro", status: "active", monthlyTokens: 5640, industry: "Govt" },
  "harbor-restaurant": { plan: "free", status: "trial", monthlyTokens: 320, industry: "Restaurant" },
};

// Demo login accounts (password is the same for all): waitless123
const users = [
  { uid: "admin-user", email: "admin@waitless.app", role: "admin", name: "Admin User" },
  { uid: "staff-user", email: "staff@waitless.app", role: "staff", name: "Ahmed Rasheed" },
  { uid: "super-user", email: "super@waitless.app", role: "super", name: "Platform Admin" },
];
for (const u of users) {
  try { await adminAuth.createUser({ uid: u.uid, email: u.email, password: "waitless123", emailVerified: true }); }
  catch { await adminAuth.updateUser(u.uid, { email: u.email, password: "waitless123" }); }
  await db.doc(`users/${u.uid}`).set({ email: u.email, role: u.role, name: u.name, businessId: "sunshine-clinic" });
}
console.log(`✓ Seeded ${users.length} demo users (password: waitless123)`);

// lastIssued = currentServing + waiting (so waiting count derives as lastIssued - currentServing)
const businesses = [
  {
    id: "sunshine-clinic", name: "Sunshine Clinic", category: "Hospitals", categoryIcon: "🏥",
    logo: "🩺", location: "Healthcare City, Dubai", country: "AE", distanceKm: 1.2, likes: 124,
    services: [
      { id: "gen", name: "General Doctor", icon: "👨‍⚕️", prefix: "A", currentServing: 18, lastIssued: 21, avgMins: 4 },
      { id: "ped", name: "Pediatrics", icon: "👶", prefix: "B", currentServing: 11, lastIssued: 15, avgMins: 6 },
      { id: "pha", name: "Pharmacy", icon: "💊", prefix: "C", currentServing: 7, lastIssued: 7, avgMins: 3 },
      { id: "lab", name: "Lab Tests", icon: "🧪", prefix: "D", currentServing: 14, lastIssued: 16, avgMins: 5 },
      { id: "den", name: "Dental", icon: "🦷", prefix: "E", currentServing: 5, lastIssued: 5, avgMins: 8 },
      { id: "eye", name: "Eye Care", icon: "👁️", prefix: "F", currentServing: 9, lastIssued: 12, avgMins: 7 },
    ],
  },
  {
    id: "city-salon", name: "City Salon", category: "Salons", categoryIcon: "✂️",
    logo: "💈", location: "Soho, London", country: "GB", distanceKm: 2.4, likes: 88,
    services: [
      { id: "cut", name: "Haircut", icon: "✂️", prefix: "A", currentServing: 12, lastIssued: 14, avgMins: 20 },
      { id: "beard", name: "Beard Trim", icon: "🧔", prefix: "B", currentServing: 8, lastIssued: 9, avgMins: 12 },
      { id: "color", name: "Hair Color", icon: "🎨", prefix: "C", currentServing: 4, lastIssued: 4, avgMins: 45 },
      { id: "spa", name: "Hair Spa", icon: "💆", prefix: "D", currentServing: 6, lastIssued: 9, avgMins: 30 },
    ],
  },
  {
    id: "bank-maldives", name: "Apex Bank", category: "Banks", categoryIcon: "🏦",
    logo: "🏦", location: "Bandra, Mumbai", country: "IN", distanceKm: 3.1, likes: 203,
    services: [
      { id: "cash", name: "Cash Deposit", icon: "💵", prefix: "A", currentServing: 230, lastIssued: 242, avgMins: 4 },
      { id: "wd", name: "Withdrawal", icon: "🏧", prefix: "B", currentServing: 145, lastIssued: 153, avgMins: 3 },
      { id: "acct", name: "New Account", icon: "📋", prefix: "C", currentServing: 40, lastIssued: 45, avgMins: 15 },
      { id: "loan", name: "Loans", icon: "🏠", prefix: "D", currentServing: 18, lastIssued: 21, avgMins: 25 },
    ],
  },
  {
    id: "civil-service", name: "Passport Office", category: "Government", categoryIcon: "🏛️",
    logo: "🏛️", location: "Civic District, Singapore", country: "SG", distanceKm: 4.0, likes: 32,
    services: [
      { id: "id", name: "ID Card", icon: "🪪", prefix: "A", currentServing: 88, lastIssued: 105, avgMins: 10 },
      { id: "cert", name: "Certificates", icon: "📜", prefix: "B", currentServing: 33, lastIssued: 39, avgMins: 12 },
      { id: "pay", name: "Payments", icon: "💳", prefix: "C", currentServing: 21, lastIssued: 23, avgMins: 5 },
    ],
  },
  {
    id: "harbor-restaurant", name: "Harbor Restaurant", category: "Restaurants", categoryIcon: "🍽️",
    logo: "🍽️", location: "Hulhumalé, Maldives", country: "MV", distanceKm: 6.5, likes: 72,
    services: [
      { id: "t2", name: "Table for 2", icon: "🍽️", prefix: "A", currentServing: 12, lastIssued: 16, avgMins: 25 },
      { id: "t4", name: "Table for 4", icon: "🍴", prefix: "B", currentServing: 7, lastIssued: 9, avgMins: 30 },
      { id: "take", name: "Takeaway", icon: "🥡", prefix: "C", currentServing: 18, lastIssued: 19, avgMins: 8 },
    ],
  },
];

let count = 0;
for (const b of businesses) {
  const { services, ...biz } = b;
  await db.doc(`businesses/${b.id}`).set({ alertHeadsUp: 10, alertComeNow: 3, ...biz, ...(meta[b.id] ?? {}) });
  for (const s of services) {
    await db.doc(`businesses/${b.id}/services/${s.id}`).set(s);
    count++;
  }
}
console.log(`✓ Seeded ${businesses.length} businesses, ${count} services`);

// Branches for Sunshine Clinic (shown live on the admin dashboard).
const branches = [
  { id: "main", name: "Main Branch", location: "Healthcare City, Dubai", status: "open", inQueue: 28, counters: 4, avgWait: "22m" },
  { id: "marina", name: "Marina Branch", location: "Dubai Marina, Dubai", status: "open", inQueue: 11, counters: 3, avgWait: "10m" },
  { id: "airport", name: "Airport Branch", location: "Terminal 3, Dubai", status: "busy", inQueue: 5, counters: 2, avgWait: "7m" },
];
for (const b of branches) {
  await db.doc(`businesses/sunshine-clinic/branches/${b.id}`).set(b);
}
console.log(`✓ Seeded ${branches.length} branches (Sunshine Clinic)`);

// Clear any existing tokens so re-seeding always gives a clean state.
const existing = await db.collection("tokens").get();
if (!existing.empty) {
  const delBatch = db.batch();
  existing.forEach((d) => delBatch.delete(d.ref));
  await delBatch.commit();
  console.log(`✓ Cleared ${existing.size} old tokens`);
}

// A few waiting tokens for Sunshine Clinic / General Doctor so the staff queue
// isn't empty on first load. (currentServing is 18, lastIssued 21.)
const seedTokens = [
  { n: 19, customerName: "Sara Khan", priority: "vip" },
  { n: 20, customerName: "David Chen", priority: "regular" },
  { n: 21, customerName: "Omar Farouk", priority: "regular" },
];
for (const t of seedTokens) {
  await db.doc(`tokens/t-gen-${t.n}`).set({
    businessId: "sunshine-clinic", serviceId: "gen", prefix: "A",
    numericValue: t.n, number: `A-${t.n}`,
    customerName: t.customerName, phone: "+1 555 0100",
    priority: t.priority, status: "waiting", createdAt: new Date(),
  });
}
console.log(`✓ Seeded ${seedTokens.length} demo tokens (Sunshine / General Doctor)`);

// Historical tokens (today) for Sunshine Clinic so Analytics has real data.
// All 'served' or 'cancelled' so they don't pollute the live staff queue.
const svcWeights = [
  { id: "gen", prefix: "A", w: 40 }, { id: "pha", prefix: "C", w: 26 },
  { id: "ped", prefix: "B", w: 18 }, { id: "lab", prefix: "D", w: 10 },
  { id: "den", prefix: "E", w: 3 }, { id: "eye", prefix: "F", w: 3 },
];
// Relative volume per hour (7am..6pm) — shapes the peak around 10am & 3pm.
const hourWeights = [28, 45, 62, 95, 78, 55, 40, 50, 85, 65, 38, 20];
const pick = (arr, key) => {
  const total = arr.reduce((n, x) => n + x[key], 0);
  let r = Math.random() * total;
  for (const x of arr) { r -= x[key]; if (r <= 0) return x; }
  return arr[arr.length - 1];
};
const today = new Date();
let hist = 0, hcount = {};
const aBatch = db.batch();
for (let i = 0; i < 160; i++) {
  const svc = pick(svcWeights, "w");
  const hourIdx = pick(hourWeights.map((w, idx) => ({ idx, w })), "w").idx;
  const hour = 7 + hourIdx;
  const created = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, Math.floor(Math.random() * 60));
  const cancelled = Math.random() < 0.14;
  const status = cancelled ? "cancelled" : "served";
  const STAFF = ["Ahmed Rasheed", "Fathimath Nisha", "Mohamed Saleem", "Aminath Shira"];
  const n = 100 + i;
  aBatch.set(db.doc(`tokens/hist-${i}`), {
    businessId: "sunshine-clinic", serviceId: svc.id, prefix: svc.prefix,
    numericValue: n, number: `${svc.prefix}-${n}`, customerName: "Past Customer",
    phone: "+1 555 0100", priority: "regular", status,
    servedBy: status === "served" ? STAFF[Math.floor(Math.random() * STAFF.length)] : null,
    createdAt: created,
  });
  hist++;
  hcount[hour] = (hcount[hour] ?? 0) + 1;
}
await aBatch.commit();
console.log(`✓ Seeded ${hist} historical tokens for analytics`);
process.exit(0);
