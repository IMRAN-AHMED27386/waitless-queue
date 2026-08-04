# Waitless — App Flow & Testing Guide

## What Waitless is (one line)
A smart queue/token SaaS: instead of standing in a line and watching a paper number,
customers join a queue from their phone, watch their position live, and get called —
while staff manage the line, owners see analytics, and you (the platform) manage all businesses.

## Live URL
https://waitlessqueue.com

---

## The 4 roles + 1 public screen

| Role | Who | URL | Login |
|------|-----|-----|-------|
| **Customer** | Person joining a queue | `/app` | none (or Google) |
| **TV Board** | Screen in the waiting area | `/board` | none (public) |
| **Staff** | Counter operator | `/staff` | Email/password |
| **Business Admin** | Business owner | `/admin`, `/analytics` | Email/password or Google |
| **Super Admin** | Platform owner (you) | `/super` | Google (imran27386@gmail.com) |

---

## Flow per role

### 1. Customer  (`/app`)
1. Open `/app` (or tap "Try Customer View" on the landing page).
2. **Find a place** — search or filter by category; see businesses with live waiting count, likes, distance.
3. Tap a business → **choose a service** (each shows its own live wait).
4. Enter **name + phone + priority** → **Get my token**.
5. **Token screen** — your number, people ahead, est. wait, a live queue list, progress bar. Updates by itself as staff serve people.
6. When served → **I'm done** → rate the visit (emoji) → thank you.
- Can **Cancel** the token anytime.

### 2. Staff  (`/staff`)
1. `/login` → sign in with staff credentials.
2. See the **live queue** (waiting tokens) + the big **Now Serving** number.
3. **Call Next** → advances to the next token (it leaves the queue, serving number climbs).
4. **Complete / No Show** → also advance (and count). **Recall / Skip / Transfer** → quick actions.
5. **Today's Progress** — served / skipped / waiting.

### 3. Business Admin  (`/admin` + `/analytics`)
1. `/login` → sign in with admin credentials.
2. **Dashboard** — active tokens, avg wait, branches active, completion rate.
3. **Branches** — each branch's in-queue / counters / avg-wait; Edit / View Queue.
4. **Feature Controls** — toggle features (online booking, SMS, WhatsApp, voice, etc.). Toggles **save to the database** (persist on reload).
5. **Analytics** (`/analytics`) — tokens per hour (real chart), by-service breakdown, staff performance.

### 4. Super Admin  (`/super`)
1. `/login` → sign in with Google (imran27386@gmail.com).
2. **Platform stats** — total businesses, monthly tokens, revenue, paid ratio (computed live).
3. **All businesses table** — search + filter by plan; plan/status/tokens per business; Manage.

---

## The real-time loop (the demo that sells it)
Open **two browser windows** side by side:
1. Window A → `/app` → take a token (e.g. Sunshine Clinic → General Doctor → you get **A-22**).
2. Window B → `/staff` (logged in as staff) → **A-22 appears in the queue instantly**.
3. In B, click **Call Next** a few times → in A your **position drops live**, and on `/board` the **Now Serving** number climbs — no refresh anywhere.

---

## Recommended testing sequence
1. **Landing** `/` — buttons, layout on phone + desktop.
2. **Customer** `/app` — full journey: discover → service → token → live screen → feedback.
3. **Staff** `/staff` — log in, find the token, Call Next / Complete / No Show.
4. **The loop** — confirm `/app` and `/board` update live while staff acts.
5. **Admin** `/admin` — flip a feature toggle, reload (it persists); check stats.
6. **Analytics** `/analytics` — charts render from real data.
7. **Super** `/super` — table, search, plan filter.
8. **Auth** — email login, Google login, Sign out; try opening `/admin` while logged out (should redirect to `/login`).

---

## 30-second client pitch
> "Waitless turns any waiting line into a digital queue. Your customers scan a QR or open a
> link, take a token from their phone, and watch their place in line live — no crowding at a
> counter. Your staff call the next person with one tap, and a TV screen shows who's up.
> You get analytics on wait times and peak hours. It works for clinics, banks, restaurants,
> government offices, restaurants — anywhere people wait."

Then **show the loop** (token on a phone → call it on staff → watch the TV board update).

---

## Screen inventory (8 pages / ~12 screens)

| # | Page | URL | Access | Key features |
|---|------|-----|--------|--------------|
| 1 | Landing | `/` | public | hero, 2 CTAs, 4 stats, 7 industry chips, 6 feature cards, footer |
| 2 | Login | `/login` | public | Google sign-in, email/password, demo buttons (Admin/Staff/Super), role redirect |
| 3 | Customer app | `/app` | public | 5-step flow: discover → service → details → live token → feedback |
| 4 | TV board | `/board` | public | live clock, 4 live counters, up-next chips, ticker, fullscreen, voice |
| 5 | Staff console | `/staff` | login | live queue, Now Serving, 6 actions (Call Next/Recall/Skip/Transfer/No Show/Complete), progress |
| 6 | Business admin | `/admin` | login | 4 stat cards, branch cards, feature toggles (persist) |
| 7 | Analytics | `/analytics` | login | 4 stats, tokens-per-hour chart, by-service, staff table, period + CSV |
| 8 | Super admin | `/super` | login | 4 platform stats, all-businesses table, search + plan filter |
| 9 | Developers | `/admin/developers` | login (Enterprise) | API key generation, copy, revoke; service ID lookup; API docs |

### Live vs placeholder
- **Live (real Firestore):** customer flow, staff queue/Call Next, TV board, admin feature toggles, admin stat cards, admin branch cards, analytics charts + stats, super-admin table + stats, auth, **Developer API (POST /api/v1/tokens)**.
- **Placeholder (static demo values):** landing stats (marketing copy), analytics "Staff Performance" table (needs per-staff serve tracking — future).

---

## Developer API (Enterprise Feature)

Enterprise users can generate API keys from `/admin/developers` and use them to programmatically add tokens to any of their queues.

### API Endpoint
- **URL:** `POST https://www.waitlessqueue.com/api/v1/tokens`
- **Auth:** `Authorization: Bearer wk_live_...`
- **Body (JSON):** `{ "serviceId": "...", "name": "...", "phone": "...", "priority": "regular" }`
- **Response:** `201 Created` with `{ "id", "number", "numericValue", "status" }`

### Testing with Postman
1. Create a new `POST` request to `https://www.waitlessqueue.com/api/v1/tokens`
2. Add headers: `Content-Type: application/json` and `Authorization: Bearer <KEY>`
3. Set body to raw JSON with serviceId, name, phone, priority
4. Hit Send — see `201 Created` with the generated token

> **Note:** `firebase-admin` is pinned to v11.11.1 due to a Vercel ESM compatibility issue with v14. No impact on performance or features.

