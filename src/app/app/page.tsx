"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listenBusinesses, listenAllServices, listenToken, issueToken, cancelToken, saveFeedback,
  waitingOf, paceOf, hasLivePace, type Biz, type Svc, type Tok,
} from "@/lib/db";
import { setupPush } from "@/lib/messaging";

const categories = ["All", "Hospitals", "Clinics", "Salons", "Banks", "Government", "Restaurants"];

type Step = "discover" | "service" | "details" | "token" | "feedback";
const STEP_ORDER: Step[] = ["discover", "service", "details", "token", "feedback"];
type MergedBiz = Biz & { services: (Svc & { waiting: number })[]; totalWaiting: number };
type Issued = { id: string; businessId: string; serviceId: string; number: string; numericValue: number };

export default function CustomerApp() {
  const [step, setStep] = useState<Step>("discover");
  const [bizList, setBizList] = useState<Biz[]>([]);
  const [svcList, setSvcList] = useState<Svc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [cat, setCat] = useState("All");
  const [query, setQuery] = useState("");
  const [bizId, setBizId] = useState<string | null>(null);
  const [svcId, setSvcId] = useState<string | null>(null);
  const [name, setName] = useState("Alex Carter");
  const [phone, setPhone] = useState("");
  const [priority, setPriority] = useState("Regular");
  const [issued, setIssued] = useState<Issued | null>(null);
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    const u1 = listenBusinesses((b) => { setBizList(b); setLoaded(true); });
    const u2 = listenAllServices(setSvcList);
    return () => { u1(); u2(); };
  }, []);

  // QR deep-link: /app?biz=<id> jumps straight to that business's services.
  useEffect(() => {
    const b = new URLSearchParams(window.location.search).get("biz");
    if (b) { setBizId(b); setStep("service"); }
  }, []);

  const merged: MergedBiz[] = useMemo(() => {
    return bizList.map((b) => {
      const services = svcList.filter((s) => s.businessId === b.id).map((s) => ({ ...s, waiting: waitingOf(s) }));
      return { ...b, services, totalWaiting: services.reduce((n, s) => n + s.waiting, 0) };
    });
  }, [bizList, svcList]);

  const list = useMemo(() => merged.filter((b) =>
    (cat === "All" || b.category === cat) && b.name.toLowerCase().includes(query.toLowerCase())
  ), [merged, cat, query]);

  const biz = merged.find((b) => b.id === bizId) ?? null;
  const svc = biz?.services.find((s) => s.id === svcId) ?? null;
  const stepIndex = STEP_ORDER.indexOf(step);

  async function generate() {
    if (!bizId || !svcId) return;
    const t = await issueToken(bizId, svcId, { name, phone, priority });
    setIssued({ id: t.id, businessId: bizId, serviceId: svcId, number: t.number, numericValue: t.numericValue });
    setStep("token");
  }
  async function doCancel() {
    if (issued) await cancelToken(issued.id);
    reset();
  }
  function reset() {
    setStep("discover"); setBizId(null); setSvcId(null); setIssued(null); setRating(null);
  }

  return (
    <main className="flex-1 w-full bg-page flex flex-col items-center sm:py-10 sm:px-4">
      <div className="w-full max-w-md px-4 pb-10 sm:px-5 sm:pt-2 sm:pb-6 sm:bg-surface sm:rounded-[28px] sm:border sm:border-border sm:shadow-[0_12px_40px_rgba(13,27,62,0.10)]">
        <header className="flex items-center gap-3 h-14 sticky sm:static top-0 z-20 bg-page sm:bg-surface">
          {step === "discover" ? (
            <Link href="/" className="grid place-items-center w-9 h-9 rounded-[10px] border border-border bg-surface text-ink-2" aria-label="Home">←</Link>
          ) : (
            <button onClick={() => setStep(STEP_ORDER[Math.max(0, stepIndex - 1)])} className="grid place-items-center w-9 h-9 rounded-[10px] border border-border bg-surface text-ink-2" aria-label="Back">←</button>
          )}
          <div className="flex items-center gap-2">
            <span className="grid place-items-center w-8 h-8 rounded-lg text-white text-base" style={{ background: "linear-gradient(135deg,#4361EE,#818CF8)" }}>⚡</span>
            <span className="font-display text-lg font-bold text-ink">Wait<span className="text-acc">less</span></span>
          </div>
        </header>

        <div className="flex gap-1.5 mb-5">
          {STEP_ORDER.map((s, i) => (
            <span key={s} className="h-1 rounded-full transition-all" style={{ width: i === stepIndex ? 34 : 20, background: i <= stepIndex ? "var(--acc)" : "var(--bd)" }} />
          ))}
        </div>

        {step === "discover" && <Discover list={list} loaded={loaded} cat={cat} setCat={setCat} query={query} setQuery={setQuery} onPick={(b) => { setBizId(b.id); setStep("service"); }} />}
        {step === "service" && biz && <ServicePick biz={biz} onPick={(s) => { setSvcId(s.id); setStep("details"); }} />}
        {step === "details" && biz && svc && (
          <Details biz={biz} svc={svc} name={name} setName={setName} phone={phone} setPhone={setPhone} priority={priority} setPriority={setPriority} onSubmit={generate} />
        )}
        {step === "token" && biz && issued && (
          <TokenView biz={biz} issued={issued} onCancel={doCancel} onDone={() => setStep("feedback")} />
        )}
        {step === "feedback" && <Feedback rating={rating} onDone={reset} onRate={(i, label) => {
          setRating(i);
          if (issued) saveFeedback({ businessId: issued.businessId, serviceId: issued.serviceId, tokenId: issued.id, rating: i, label });
        }} />}
      </div>
      <p className="hidden sm:block text-xs text-ink-3 mt-4">📱 This is what customers see on their phone</p>
    </main>
  );
}

function SectionTitle({ t, s }: { t: string; s?: string }) {
  return (
    <div className="mb-4">
      <h1 className="font-display text-2xl font-bold text-ink">{t}</h1>
      {s && <p className="text-sm text-ink-3 mt-0.5">{s}</p>}
    </div>
  );
}

function Discover({ list, loaded, cat, setCat, query, setQuery, onPick }: {
  list: MergedBiz[]; loaded: boolean; cat: string; setCat: (c: string) => void; query: string; setQuery: (q: string) => void; onPick: (b: MergedBiz) => void;
}) {
  return (
    <div>
      <SectionTitle t="Find a place" s="Join a queue from your phone" />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍  Search businesses…" className="w-full px-3.5 py-3 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc mb-3" />
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {categories.map((c) => (
          <button key={c} onClick={() => setCat(c)} className="whitespace-nowrap text-[13px] font-semibold px-3.5 py-1.5 rounded-full border transition shrink-0"
            style={cat === c ? { background: "var(--al)", borderColor: "var(--acc)", color: "var(--acc)" } : { background: "var(--sf)", borderColor: "var(--bd)", color: "var(--t3)" }}>{c}</button>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {!loaded && <div className="text-center text-sm text-ink-3 py-10">Loading businesses…</div>}
        {loaded && list.map((b) => (
          <button key={b.id} onClick={() => onPick(b)} className="text-left bg-surface border border-border rounded-2xl p-3.5 flex items-center gap-3 hover:border-acc transition" style={{ boxShadow: "var(--sh)" }}>
            <span className="grid place-items-center w-12 h-12 rounded-xl text-2xl shrink-0 bg-surface-2">{b.logo}</span>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-ink truncate">{b.name}</div>
              <div className="text-xs text-ink-3 truncate">{b.categoryIcon} {b.category} · {b.location}</div>
              <div className="flex items-center gap-3 mt-1.5 text-xs">
                <span className="num font-semibold" style={{ color: "var(--acc)" }}>👥 {b.totalWaiting} waiting</span>
                <span className="num text-ink-3">👍 {b.likes}</span>
                <span className="num text-ink-3">📍 {b.distanceKm} km</span>
              </div>
            </div>
            <span className="text-ink-3">›</span>
          </button>
        ))}
        {loaded && list.length === 0 && <div className="text-center text-sm text-ink-3 py-10">No businesses match your search.</div>}
      </div>
    </div>
  );
}

function ServicePick({ biz, onPick }: { biz: MergedBiz; onPick: (s: Svc & { waiting: number }) => void }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="grid place-items-center w-12 h-12 rounded-xl text-2xl shrink-0 bg-surface-2 border border-border">{biz.logo}</span>
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{biz.name}</h1>
          <div className="text-xs text-ink-3">{biz.categoryIcon} {biz.category} · {biz.location}</div>
        </div>
      </div>
      <p className="text-sm font-semibold text-ink-2 mb-3">Please choose a service</p>
      <div className="flex flex-col gap-2.5">
        {biz.services.map((s) => (
          <button key={s.id} onClick={() => onPick(s)} className="text-left bg-surface border border-border rounded-2xl p-3.5 flex items-center gap-3 hover:border-acc transition" style={{ boxShadow: "var(--sh)" }}>
            <span className="grid place-items-center w-11 h-11 rounded-xl text-xl shrink-0 bg-surface-2">{s.icon}</span>
            <div className="flex-1">
              <div className="font-display font-bold text-ink">{s.name}</div>
              <div className="text-xs text-ink-3 mt-0.5">
                {s.waiting === 0 ? "No wait — walk right in" : `👥 ${s.waiting} waiting · ~${Math.round(s.waiting * paceOf(s) + (s.delayMins ?? 0))} min`}
                {(s.delayMins ?? 0) > 0 && <span className="font-semibold" style={{ color: "var(--wn)" }}> · ⏳ {s.delayMins} min delay</span>}
              </div>
            </div>
            <span className="text-ink-3">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Details({ biz, svc, name, setName, phone, setPhone, priority, setPriority, onSubmit }: {
  biz: MergedBiz; svc: Svc; name: string; setName: (v: string) => void; phone: string; setPhone: (v: string) => void; priority: string; setPriority: (v: string) => void; onSubmit: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const valid = name.trim() && phone.trim();
  return (
    <div>
      <SectionTitle t="Your details" s={`${svc.icon} ${svc.name} · ${biz.name}`} />
      <div className="bg-surface border border-border rounded-2xl p-4 flex flex-col gap-3" style={{ boxShadow: "var(--sh)" }}>
        <label className="block">
          <span className="text-[13px] font-semibold text-ink-2">Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc" />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold text-ink-2">Phone number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (with country code)" inputMode="tel" className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc" />
        </label>
        <label className="block">
          <span className="text-[13px] font-semibold text-ink-2">Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc">
            <option>Regular</option><option>Senior / Disability</option><option>Pregnant</option>
          </select>
        </label>
      </div>
      <button onClick={async () => { setBusy(true); await onSubmit(); }} disabled={!valid || busy} className="w-full mt-4 py-3 rounded-xl font-semibold text-white transition disabled:opacity-50 bg-acc hover:bg-acc-dark">
        {busy ? "Getting your token…" : "Get my token ✦"}
      </button>
      <p className="text-center text-xs text-ink-3 mt-2">No app install needed · You can cancel anytime</p>
    </div>
  );
}

function TokenView({ biz, issued, onCancel, onDone }: {
  biz: MergedBiz; issued: Issued; onCancel: () => void; onDone: () => void;
}) {
  const [tok, setTok] = useState<Tok | null>(null);
  const notifiedSoon = useRef(false);
  const notifiedTurn = useRef(false);
  useEffect(() => listenToken(issued.id, setTok), [issued.id]);
  useEffect(() => { setupPush(issued.id); }, [issued.id]);

  // The token doc is the source of truth — a staff transfer moves it to a new
  // service and number, and this page follows along live.
  const curSvcId = tok?.serviceId ?? issued.serviceId;
  const number = tok?.number ?? issued.number;
  const numeric = tok?.numericValue ?? issued.numericValue;
  const journey = tok?.journey ?? [];
  const svc = biz.services.find((s) => s.id === curSvcId);

  // New stage → let the local notifications fire again for the new queue.
  useEffect(() => { notifiedSoon.current = false; notifiedTurn.current = false; }, [curSvcId]);

  const serving = svc?.currentServing ?? 0;
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
    const away = numeric - serving;
    if (away <= 0 && !notifiedTurn.current) {
      notifiedTurn.current = true;
      new Notification("It's your turn! 🎉", { body: `${number} — please proceed to the counter.` });
    } else if (away > 0 && away <= 2 && !notifiedSoon.current) {
      notifiedSoon.current = true;
      new Notification("Almost your turn ⏰", { body: `${number} — you're ${away} away.` });
    }
  }, [serving, numeric, number]);

  if (!svc) return <div className="text-center text-sm text-ink-3 py-10">Loading your queue…</div>;

  const ahead = Math.max(0, numeric - serving - 1);
  const yourTurn = serving >= numeric || tok?.status === "served";
  const cancelled = tok?.status === "cancelled";
  const delay = yourTurn || cancelled ? 0 : svc.delayMins ?? 0;
  const pace = paceOf(svc);
  const livePace = hasLivePace(svc);
  const estWait = Math.round(ahead * pace + delay);
  const delayTime = svc.delayAt?.toDate?.().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const total = Math.max(numeric, svc.lastIssued);
  const pct = Math.min(100, Math.round((serving / numeric) * 100));

  const rows = [
    { num: `${svc.prefix}-${serving}`, label: "Serving", kind: "serving" as const },
    ...Array.from({ length: Math.min(ahead, 3) }, (_, i) => ({
      num: `${svc.prefix}-${serving + i + 1}`, label: `${Math.round((i + 1) * pace)} min`, kind: "wait" as const,
    })),
    { num: number, label: "You!", kind: "mine" as const },
  ];

  return (
    <div>
      {journey.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-3">Your visit · stage {journey.length + 1}</div>
          {journey.map((st, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-border bg-surface">
              <span className="grid place-items-center w-6 h-6 rounded-full text-[12px] font-bold text-white shrink-0" style={{ background: "#06D6A0" }}>✓</span>
              <span className="text-[13px] font-semibold text-ink-2 flex-1 truncate">{st.serviceName}</span>
              <span className="num text-xs text-ink-3">{st.number}</span>
            </div>
          ))}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl" style={{ background: "var(--al)", border: "1px solid var(--acc)" }}>
            <span className="grid place-items-center w-6 h-6 rounded-full text-[12px] font-bold text-white bg-acc shrink-0">{journey.length + 1}</span>
            <span className="text-[13px] font-semibold flex-1 truncate" style={{ color: "var(--acc)" }}>{svc.name} — current</span>
            <span className="num text-xs font-semibold" style={{ color: "var(--acc)" }}>{number}</span>
          </div>
        </div>
      )}

      {delay > 0 && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl mb-3" style={{ background: "rgba(247,127,0,.1)", border: "1px solid var(--wn)" }}>
          <span className="text-lg">⏳</span>
          <div className="flex-1">
            <div className="text-[13px] font-bold" style={{ color: "var(--wn)" }}>Running about {delay} min behind</div>
            <div className="text-[11.5px] text-ink-3">{biz.name} announced this{delayTime ? ` at ${delayTime}` : ""} — your estimate below already includes it.</div>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-[18px] p-5 text-white" style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#1A2F70 100%)" }}>
        <div className="text-[12.5px]" style={{ color: "rgba(255,255,255,.55)" }}>{svc.name} · {biz.name}</div>
        <div className="num font-bold text-[56px] leading-none tracking-tight mt-1">{number}</div>
        <span className="inline-block mt-2 text-[11.5px] font-semibold px-2.5 py-1 rounded-full"
          style={yourTurn ? { background: "rgba(6,214,160,.16)", color: "#06D6A0" } : { background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)" }}>
          {cancelled ? "● Cancelled" : yourTurn ? "● Your turn — proceed!" : "● Waiting"}
        </span>
        <div className="grid grid-cols-3 gap-2 mt-5">
          {[
            { l: "Ahead", v: ahead, u: "people" },
            { l: "Est. wait", v: estWait, u: livePace ? "min · live pace" : "minutes" },
            { l: "Serving", v: `${svc.prefix}-${serving}`, u: "now" },
          ].map((m) => (
            <div key={m.l}>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,.4)" }}>{m.l}</div>
              <div className="num text-[19px] font-bold mt-0.5">{m.v}</div>
              <div className="text-[11px]" style={{ color: "rgba(255,255,255,.45)" }}>{m.u}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-[11px] mb-1.5" style={{ color: "rgba(255,255,255,.5)" }}>
            <span>Queue position</span><span className="num">{ahead + 1} of {Math.max(1, total - serving)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.15)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#06D6A0" }} />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4 mt-3" style={{ boxShadow: "var(--sh)" }}>
        <div className="font-display font-bold text-ink mb-3 flex items-center gap-2">Queue status <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(6,214,160,.12)", color: "#06D6A0" }}>● Live</span></div>
        <div className="flex flex-col gap-1.5">
          {rows.map((q, i) => (
            <div key={i} className="flex justify-between items-center px-3 py-2 rounded-xl"
              style={q.kind === "serving" ? { background: "rgba(6,214,160,.12)", border: "1px solid #06D6A0" } : q.kind === "mine" ? { background: "var(--al)", border: "2px solid var(--acc)" } : { background: "var(--s2)", border: "1px solid var(--bd)" }}>
              <span className="num font-bold text-[13px]" style={{ color: q.kind === "serving" ? "#06D6A0" : q.kind === "mine" ? "var(--acc)" : "var(--t1)" }}>{q.num}{q.kind === "mine" ? " — You!" : ""}</span>
              <span className="text-xs font-medium" style={{ color: q.kind === "mine" ? "var(--acc)" : "var(--t3)" }}>{q.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mt-3">
        <button onClick={onCancel} className="py-3 rounded-xl font-semibold text-white" style={{ background: "var(--dng)" }}>Cancel token</button>
        <button onClick={onDone} className="py-3 rounded-xl font-semibold text-white bg-acc hover:bg-acc-dark transition">I&apos;m done →</button>
      </div>
      <p className="text-center text-xs text-ink-3 mt-2">📲 You&apos;ll be notified 2 tokens ahead · updates live</p>
    </div>
  );
}

function Feedback({ rating, onRate, onDone }: { rating: number | null; onRate: (i: number, label: string) => void; onDone: () => void }) {
  const faces = [
    { e: "😄", l: "Very good" }, { e: "🙂", l: "Good" }, { e: "😐", l: "Moderate" }, { e: "🙁", l: "Bad" }, { e: "😣", l: "Very bad" },
  ];
  if (rating !== null) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">🎉</div>
        <h1 className="font-display text-2xl font-bold text-ink mb-1">Thank you!</h1>
        <p className="text-sm text-ink-3 mb-6">Your feedback helps businesses serve you better.</p>
        <button onClick={onDone} className="px-6 py-3 rounded-xl font-semibold text-white bg-acc hover:bg-acc-dark transition">Back to home</button>
      </div>
    );
  }
  return (
    <div>
      <SectionTitle t="How was your visit?" s="We appreciate your feedback" />
      <p className="text-sm font-semibold text-ink mb-3">How would you rate the friendliness and service?</p>
      <div className="flex flex-col gap-2">
        {faces.map((f, i) => (
          <button key={f.l} onClick={() => onRate(i, f.l)} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:border-acc transition text-left">
            <span className="text-2xl">{f.e}</span><span className="font-semibold text-ink">{f.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
