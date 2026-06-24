# Waitless — Going to Production

This guide takes Waitless from the local emulator to a real, public deployment.
The code already supports both: when `NEXT_PUBLIC_USE_EMULATOR=false`, the app
uses real Firebase from `NEXT_PUBLIC_FIREBASE_*` env vars instead of the emulator.

## Recommended architecture

| Piece | Service | Why |
|-------|---------|-----|
| Database + Auth | **Firebase (cloud)** | Real-time Firestore + Auth, same code as the emulator |
| Web app hosting | **Vercel** | Built for Next.js, free tier, one-click GitHub deploys (you already use it) |

> Firebase Hosting can also run Next.js (via App Hosting), but Vercel is the
> simplest path for a Next.js SSR app.

---

## Step 1 — Create the Firebase project  *(your Google account)*
1. Go to https://console.firebase.google.com → **Add project** → name it `waitless`.
2. Analytics is optional — you can skip it.

## Step 2 — Enable Firestore + Auth
1. **Build → Firestore Database → Create database** → *Production mode* → pick a region (e.g. `asia-south1` for Maldives/India).
2. **Build → Authentication → Get started → Email/Password → Enable.**

## Step 3 — Get the web config
1. **Project settings (gear) → Your apps → Web app (`</>`)** → register app `waitless-web`.
2. Copy the `firebaseConfig` values.

## Step 4 — Point the app at the cloud
```bash
cp .env.local.example .env.local
```
Fill in the values from Step 3 and set:
```
NEXT_PUBLIC_USE_EMULATOR=false
```
Run `npm run dev` and confirm it talks to the real project (data will be empty until seeded).

## Step 5 — Deploy security rules
The repo ships hardened rules in `firestore.rules.production`.
```bash
firebase login                 # opens your browser (your Google account)
firebase use --add             # select the waitless project
cp firestore.rules.production firestore.rules   # swap in the hardened rules
firebase deploy --only firestore:rules,firestore:indexes
```
> Keep a copy of the permissive `firestore.rules` for local emulator dev, or use
> a separate `firebase.json` target.

## Step 6 — Seed the cloud (first data + admin user)
Download a service-account key (**Project settings → Service accounts → Generate new private key**), then:
```bash
GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
FIRESTORE_EMULATOR_HOST= FIREBASE_AUTH_EMULATOR_HOST= \
node scripts/seed.mjs
```
(Clearing the EMULATOR_HOST vars makes the admin SDK target the real project.)
This creates the demo businesses + the `admin@waitless.app` login. **Change that
password** in the Auth console afterwards, or edit `scripts/seed.mjs` first.

## Step 7 — Deploy the web app to Vercel
1. Push this repo to GitHub.
2. https://vercel.com → **New Project** → import the repo → root directory = `web`.
3. In **Settings → Environment Variables**, add all six `NEXT_PUBLIC_FIREBASE_*`
   values **and** `NEXT_PUBLIC_USE_EMULATOR=false`.
4. **Deploy.** You get a public URL like `waitless.vercel.app`.
5. Add your Vercel domain to **Firebase Auth → Settings → Authorized domains.**

You're live. 🎉

---

## Security hardening — before real customers
The current customer flow issues tokens **client-side** (guests write to Firestore).
That's fine for a demo but should be locked down before real traffic:

1. **Move `issueToken` and `advanceQueue` into Cloud Functions** (callable) so the
   server controls token numbers and queue advancement — clients can't tamper.
2. **Enable Anonymous Auth** so even guest customers have a uid for rules.
3. Re-tighten `firestore.rules` so `services` can only be written by Functions/staff.
4. Add rate limiting / App Check to stop token spam.

These are the natural "Phase 3" follow-ups once the product has real users.
