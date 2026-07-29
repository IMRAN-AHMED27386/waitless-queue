"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  listenBusinesses, listenAllServices, listenToken, issueToken, cancelToken, saveFeedback,
  waitingOf, paceOf, hasLivePace, ALERT_HEADS_UP_DEFAULT, ALERT_COME_NOW_DEFAULT,
  listenTokensByPhone, listenCategories, type Category,
  type Biz, type Svc, type Tok,
} from "@/lib/db";
import { setupPush, showLocalNotification } from "@/lib/messaging";
import { countryByCode } from "@/lib/countries";
const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER ?? "";

type Step = "discover" | "service" | "details" | "token" | "feedback";
const STEP_ORDER: Step[] = ["discover", "service", "details", "token", "feedback"];
type MergedBiz = Biz & { services: (Svc & { waiting: number })[]; totalWaiting: number };
type Issued = { id: string; businessId: string; serviceId: string; number: string; numericValue: number };

/* ── Inline Styles ── */
const desktopBg = {
  background: "linear-gradient(120deg, rgba(14,23,38,.98), rgba(24,36,59,.92)), linear-gradient(90deg, rgba(0,168,135,.2) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,.06) 1px, transparent 1px)",
  backgroundSize: "auto, 88px 88px, 88px 88px",
};
const brandIconBox = {
  background: "linear-gradient(135deg, #315cff 0%, #315cff 64%, #59d4d1 100%)",
  boxShadow: "0 8px 20px rgba(49,92,255,.25)",
};
const boltIconSm = {
  display: "block", width: 12, height: 19,
  background: "linear-gradient(180deg, #ffe066, #ffb22c)",
  clipPath: "polygon(58% 0, 17% 48%, 45% 48%, 31% 100%, 88% 35%, 57% 35%)",
  filter: "drop-shadow(0 1px 2px rgba(16,24,40,.2))", transform: "rotate(8deg)",
};
const inputStyle = "w-full px-3.5 py-3 rounded-xl border border-border bg-white text-[15px] outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(49,92,255,0.1)] transition-all";
const cardStyle = "text-left bg-white border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-acc hover:-translate-y-px transition shadow-[0_4px_12px_rgba(16,24,40,0.03)] hover:shadow-[0_8px_20px_rgba(49,92,255,0.1)]";

export default function CustomerApp() {
  const [step, setStep] = useState<Step>("discover");
  const [bizList, setBizList] = useState<Biz[]>([]);
  const [svcList, setSvcList] = useState<Svc[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
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
  const [issueError, setIssueError] = useState("");

  useEffect(() => {
    const u1 = listenBusinesses((b) => { setBizList(b); setLoaded(true); });
    const u2 = listenAllServices(setSvcList);
    const u3 = listenCategories(setDbCategories);
    return () => { u1(); u2(); u3(); };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bizParam = params.get("biz");
    const tokenParam = params.get("token");
    if (tokenParam) {
      listenToken(tokenParam, (tok) => {
        if (tok && (tok.status === "waiting" || tok.status === "parked")) {
          const saved = { id: tok.id, businessId: tok.businessId, serviceId: tok.serviceId, number: tok.number, numericValue: tok.numericValue };
          setBizId(tok.businessId); setSvcId(tok.serviceId); setIssued(saved); setStep("token");
          try { localStorage.setItem("waitless-active-token", JSON.stringify(saved)); } catch {}
        }
      });
      return;
    }
    if (bizParam) { setBizId(bizParam); setStep("service"); return; }
    try {
      const saved = localStorage.getItem("waitless-active-token");
      if (saved) {
        const parsed = JSON.parse(saved) as Issued;
        if (parsed.id && parsed.businessId) {
          listenToken(parsed.id, (tok) => {
            if (tok && (tok.status === "waiting" || tok.status === "parked")) {
              setBizId(parsed.businessId); setSvcId(parsed.serviceId); setIssued(parsed); setStep("token");
            } else if (tok && tok.status === "served") {
              setBizId(parsed.businessId); setSvcId(parsed.serviceId); setIssued(parsed); setStep("feedback");
            } else {
              try { localStorage.removeItem("waitless-active-token"); } catch {}
            }
          });
        }
      }
    } catch {}
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

  async function generate(): Promise<boolean> {
    if (!bizId || !svcId) return false;
    setIssueError("");
    try {
      const t = await issueToken(bizId, svcId, { name, phone, priority });
      const token = { id: t.id, businessId: bizId, serviceId: svcId, number: t.number, numericValue: t.numericValue };
      setIssued(token);
      try { localStorage.setItem("waitless-active-token", JSON.stringify(token)); } catch {}
      setStep("token");
      return true;
    } catch (e) {
      const code = (e as { code?: string }).code ?? "";
      setIssueError(
        code.includes("resource-exhausted")
          ? "This business has reached its monthly token limit — please ask for help at the counter."
          : code.includes("failed-precondition")
            ? "This business isn't taking online tokens right now — please ask at the counter."
            : "Couldn't get your token. Please check your connection and try again."
      );
      return false;
    }
  }
  async function doCancel() {
    if (issued) { await cancelToken(issued.id); try { localStorage.removeItem("waitless-active-token"); } catch {} }
    reset();
  }
  function reset() {
    setStep("discover"); setBizId(null); setSvcId(null); setIssued(null); setRating(null);
    try { localStorage.removeItem("waitless-active-token"); } catch {}
  }

  return (
    <main className="relative flex-1 w-full flex flex-col items-center sm:py-10 sm:px-4 min-h-screen">
      {/* Desktop ambient backgrounds */}
      <div className="fixed inset-0 pointer-events-none -z-20 bg-[#f5f8fd] sm:bg-transparent" />
      <div className="fixed inset-0 pointer-events-none -z-20 hidden sm:block" style={desktopBg} />
      <div className="fixed inset-0 pointer-events-none -z-10 hidden sm:block opacity-40" style={{ background: "radial-gradient(circle, rgba(49,92,255,0.3) 0%, transparent 70%)" }} />
      
      <div className="relative z-10 w-full max-w-md px-4 pb-10 sm:px-6 sm:pt-2 sm:pb-8 sm:bg-white sm:rounded-[32px] sm:shadow-[0_30px_60px_rgba(0,0,0,0.4)] sm:border sm:border-white/20 sm:min-h-[800px]">
        <header className="flex items-center gap-3 h-16 sticky sm:static top-0 z-20 bg-[#f5f8fd] sm:bg-white border-b sm:border-b-0 border-border/50 sm:mb-2">
          {step === "discover" ? (
            <Link href="/" className="grid place-items-center w-10 h-10 rounded-[12px] border border-border bg-white text-ink-2 shadow-sm hover:border-acc transition" aria-label="Home">←</Link>
          ) : (
            <button onClick={() => setStep(STEP_ORDER[Math.max(0, stepIndex - 1)])} className="grid place-items-center w-10 h-10 rounded-[12px] border border-border bg-white text-ink-2 shadow-sm hover:border-acc transition" aria-label="Back">←</button>
          )}
          <div className="flex items-center gap-[10px]">
            <span className="grid place-items-center w-8 h-8 rounded-[8px]" style={brandIconBox}>
              <span style={{ ...boltIconSm, transform: "scale(0.8) rotate(8deg)" }} />
            </span>
            <span className="font-display text-[1.2rem] font-black text-ink tracking-tight">Wait<span className="text-acc">less</span></span>
          </div>
        </header>

        <div className="flex gap-1.5 mb-6 mt-4">
          {STEP_ORDER.map((s, i) => (
            <span key={s} className="h-1.5 rounded-full transition-all" style={{ width: i === stepIndex ? 34 : 20, background: i <= stepIndex ? "var(--acc)" : "var(--bd)" }} />
          ))}
        </div>

        {step === "discover" && <Discover list={list} loaded={loaded} cat={cat} setCat={setCat} query={query} setQuery={setQuery} onPick={(b) => { setBizId(b.id); setStep("service"); }} dbCategories={dbCategories} />}
        {step === "service" && biz && <ServicePick biz={biz} onPick={(s) => { setSvcId(s.id); setStep("details"); }} />}
        {step === "details" && biz && svc && (
          <Details biz={biz} svc={svc} name={name} setName={setName} phone={phone} setPhone={setPhone} priority={priority} setPriority={setPriority} onSubmit={generate} errorMsg={issueError} />
        )}
        {step === "token" && biz && issued && (
          <TokenView biz={biz} issued={issued} onCancel={doCancel} onDone={() => setStep("feedback")} />
        )}
        {step === "feedback" && <Feedback rating={rating} onDone={reset} onRate={(i, label) => {
          setRating(i);
          if (issued) saveFeedback({ businessId: issued.businessId, serviceId: issued.serviceId, tokenId: issued.id, rating: i, label });
        }} />}
      </div>
      <p className="hidden sm:block text-xs text-white/50 mt-4 relative z-10 font-medium tracking-wide">📱 This is what customers see on their phone</p>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-dot {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6,214,160,0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(6,214,160,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(6,214,160,0); }
        }
        .live-dot { animation: pulse-dot 2s infinite; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </main>
  );
}

function SectionTitle({ t, s }: { t: string; s?: string }) {
  return (
    <div className="mb-4">
      <h1 className="font-display text-[1.6rem] font-bold text-ink leading-tight">{t}</h1>
      {s && <p className="text-[0.85rem] text-ink-3 mt-1">{s}</p>}
    </div>
  );
}

function Discover({ list, loaded, cat, setCat, query, setQuery, onPick, dbCategories }: {
  list: MergedBiz[]; loaded: boolean; cat: string; setCat: (c: string) => void; query: string; setQuery: (q: string) => void; onPick: (b: MergedBiz) => void; dbCategories: Category[];
}) {
  const [recoverPhone, setRecoverPhone] = useState("");
  const [recoveredTokens, setRecoveredTokens] = useState<(Tok & { bizName?: string })[]>([]);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!recoverPhone.trim() || recoverPhone.trim().length < 5) { setRecoveredTokens([]); return; }
    setRecovering(true);
    const unsub = listenTokensByPhone(recoverPhone.trim(), (tokens) => {
      setRecoveredTokens(tokens);
      setRecovering(false);
    });
    return unsub;
  }, [recoverPhone]);

  return (
    <div>
      <div className="bg-white border border-border rounded-2xl p-5 mb-6 shadow-[0_8px_20px_rgba(16,24,40,0.04)]">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-xl">🔍</span>
          <div className="font-display text-[0.95rem] font-bold text-ink">Find my token</div>
        </div>
        <p className="text-[0.8rem] text-ink-3 mb-3">Enter the phone number you used to join a queue</p>
        <input value={recoverPhone} onChange={(e) => setRecoverPhone(e.target.value)}
          placeholder="Phone (e.g. +960 7771234)" inputMode="tel" className={inputStyle} />
        {recovering && <div className="text-xs text-ink-3 mt-2">Searching…</div>}
        {recoveredTokens.length > 0 && (
          <div className="flex flex-col gap-2 mt-3">
            <div className="text-xs font-semibold text-ink-2">{recoveredTokens.length} active token{recoveredTokens.length > 1 ? "s" : ""} found</div>
            {recoveredTokens.map((t) => (
              <button key={t.id} onClick={() => {
                try { localStorage.setItem("waitless-active-token", JSON.stringify({ id: t.id, businessId: t.businessId, serviceId: t.serviceId, number: t.number, numericValue: t.numericValue })); } catch {}
                window.location.href = `/app?token=${t.id}`;
              }}
              className={cardStyle}>
                <span className="num font-bold text-sm px-2.5 py-1 rounded-lg text-white bg-acc">{t.number}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-ink">{t.bizName ?? "Business"}</div>
                  <div className="text-xs text-ink-3">{t.status === "parked" ? "🅿️ Parked — held for you" : "● Active"}</div>
                </div>
                <span className="text-xs font-bold text-acc">Resume &rsaquo;</span>
              </button>
            ))}
          </div>
        )}
        {!recovering && recoverPhone.length >= 5 && recoveredTokens.length === 0 && (
          <div className="text-xs text-ink-3 mt-2">No active tokens found for this number.</div>
        )}
      </div>

      <SectionTitle t="Find a place" s="Join a queue from your phone" />
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍  Search businesses…" className={`${inputStyle} mb-4`} />
      
      <div className="flex gap-2.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1 no-scrollbar">
        {["All", ...dbCategories.map(c => c.name)].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)} 
            className={`whitespace-nowrap text-[0.8rem] px-4 py-2 rounded-full border transition shrink-0 ${
              cat === c ? 'font-bold border-acc bg-acc/10 text-acc' : 'font-semibold border-border bg-gray-50 text-ink-3 hover:border-acc hover:text-acc'
            }`}>
            {c}
          </button>
        ))}
      </div>
      
      <div className="flex flex-col gap-3">
        {!loaded && <div className="text-center text-sm text-ink-3 py-10">Loading businesses…</div>}
        {loaded && list.map((b) => {
          const paused = b.status === "suspended";
          return (
          <button key={b.id} onClick={() => !paused && onPick(b)} disabled={paused} aria-disabled={paused} className={`${cardStyle} ${paused ? 'opacity-60 cursor-not-allowed hover:-translate-y-0 hover:shadow-none' : ''}`}>
            <span className="grid place-items-center w-[52px] h-[52px] rounded-xl text-3xl shrink-0 bg-gray-50 border border-border/50">{b.logo}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="font-display font-bold text-[1.05rem] text-ink truncate">{b.name}</div>
                {paused && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "rgba(247,127,0,.12)", color: "var(--wn)" }}>Paused</span>}
              </div>
              <div className="text-[0.75rem] text-ink-3 truncate mb-1">{b.categoryIcon} {b.category} &middot; {b.country ? `${countryByCode(b.country)?.flag ?? ""} ` : ""}{b.location}</div>
              {paused ? (
                <div className="text-[0.75rem] text-ink-3 mt-1">Not accepting tokens right now</div>
              ) : (
                <div className="flex items-center gap-3 text-[0.75rem] mt-1">
                  <span className="font-bold text-acc">👥 {b.totalWaiting} waiting</span>
                  <span className="text-ink-3">👍 {b.likes}</span>
                  <span className="text-ink-3">📍 {b.distanceKm} km</span>
                </div>
              )}
            </div>
            <span className="text-ink-3 text-lg font-bold text-acc">&rsaquo;</span>
          </button>
          );
        })}
        {loaded && list.length === 0 && <div className="text-center text-sm text-ink-3 py-10">No businesses match your search.</div>}
      </div>
    </div>
  );
}

function ServicePick({ biz, onPick }: { biz: MergedBiz; onPick: (s: Svc & { waiting: number }) => void }) {
  const paused = biz.status === "suspended";
  return (
    <div>
      <div className="flex items-center gap-4 mb-6 mt-2">
        <span className="grid place-items-center w-[60px] h-[60px] rounded-2xl text-3xl shrink-0 bg-gray-50 border border-border/50 shadow-sm">{biz.logo}</span>
        <div>
          <h1 className="font-display text-[1.4rem] font-bold text-ink leading-tight">{biz.name}</h1>
          <div className="text-[0.8rem] text-ink-3 mt-0.5">{biz.categoryIcon} {biz.category} &middot; {biz.country ? `${countryByCode(biz.country)?.flag ?? ""} ` : ""}{biz.location}</div>
        </div>
      </div>
      {paused ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">⏸️</div>
          <h2 className="font-display text-xl font-bold text-ink mb-1.5">Not accepting tokens right now</h2>
          <p className="text-[0.85rem] text-ink-3 px-4">{biz.name} has paused its online queue. Please check back later or contact them directly.</p>
        </div>
      ) : (
      <>
      <p className="text-[0.85rem] font-bold text-ink-2 mb-3">Please choose a service</p>
      <div className="flex flex-col gap-3">
        {biz.services.map((s) => (
          <button key={s.id} onClick={() => onPick(s)} className={cardStyle}>
            <span className="grid place-items-center w-[52px] h-[52px] rounded-xl text-2xl shrink-0 bg-gray-50 border border-border/50">{s.icon}</span>
            <div className="flex-1 text-left">
              <div className="font-display font-bold text-[1.05rem] text-ink">{s.name}</div>
              <div className="text-[0.75rem] text-ink-3 mt-1">
                {s.waiting === 0 ? "No wait — walk right in" : <><span className="font-bold text-acc">👥 {s.waiting} waiting</span> &middot; ~{Math.round(s.waiting * paceOf(s) + (s.delayMins ?? 0))} min</>}
                {(s.delayMins ?? 0) > 0 && <span className="font-bold" style={{ color: "var(--wn)" }}> &middot; ⏳ {s.delayMins} min delay</span>}
              </div>
            </div>
            <span className="text-ink-3 text-lg font-bold text-acc">&rsaquo;</span>
          </button>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

function Details({ biz, svc, name, setName, phone, setPhone, priority, setPriority, onSubmit, errorMsg }: {
  biz: MergedBiz; svc: Svc; name: string; setName: (v: string) => void; phone: string; setPhone: (v: string) => void; priority: string; setPriority: (v: string) => void; onSubmit: () => Promise<boolean>; errorMsg?: string;
}) {
  const [busy, setBusy] = useState(false);
  const valid = name.trim() && phone.trim();
  return (
    <div>
      <SectionTitle t="Your details" s={`${svc.icon} ${svc.name} · ${biz.name}`} />
      <div className="bg-white border border-border rounded-2xl p-5 flex flex-col gap-4 shadow-[0_8px_20px_rgba(16,24,40,0.04)] mb-2">
        <label className="block">
          <span className="block text-[0.81rem] font-semibold text-ink-2 mb-1.5">Full name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputStyle} />
        </label>
        <label className="block">
          <span className="block text-[0.81rem] font-semibold text-ink-2 mb-1.5">Phone number</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (with country code)" inputMode="tel" className={inputStyle} />
        </label>
        <label className="block">
          <span className="block text-[0.81rem] font-semibold text-ink-2 mb-1.5">Priority</span>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputStyle}>
            <option>Regular</option><option>Senior / Disability</option><option>Pregnant</option>
          </select>
        </label>
      </div>
      {errorMsg && (
        <div className="mt-3 px-4 py-3 rounded-xl text-[0.85rem] font-bold" style={{ background: "rgba(239,35,60,.08)", border: "1px solid var(--dng)", color: "var(--dng)" }}>
          {errorMsg}
        </div>
      )}
      <button onClick={async () => { setBusy(true); const ok = await onSubmit(); if (!ok) setBusy(false); }} disabled={!valid || busy} 
        className="w-full mt-4 py-[14px] rounded-xl text-[0.92rem] font-bold text-white transition-all disabled:opacity-50 cursor-pointer hover:-translate-y-px"
        style={{ background: "#315cff", boxShadow: "0 14px 30px rgba(49,92,255,.28)" }}>
        {busy ? "Getting your token…" : "Get my token ✦"}
      </button>
      <p className="text-center text-[0.75rem] text-ink-3 mt-3">No app install needed &middot; You can cancel anytime</p>
    </div>
  );
}

function TokenView({ biz, issued, onCancel, onDone }: {
  biz: MergedBiz; issued: Issued; onCancel: () => void; onDone: () => void;
}) {
  const [tok, setTok] = useState<Tok | null>(null);
  const alertStageRef = useRef(0);
  const prevServingRef = useRef<number | null>(null);
  useEffect(() => listenToken(issued.id, setTok), [issued.id]);
  useEffect(() => { setupPush(issued.id); }, [issued.id]);

  const curSvcId = tok?.serviceId ?? issued.serviceId;
  const number = tok?.number ?? issued.number;
  const numeric = tok?.numericValue ?? issued.numericValue;
  const journey = tok?.journey ?? [];
  const svc = biz.services.find((s) => s.id === curSvcId);

  useEffect(() => { alertStageRef.current = 0; prevServingRef.current = null; }, [curSvcId]);

  const serving = svc?.currentServing ?? 0;
  const headsUp = biz.alertHeadsUp ?? ALERT_HEADS_UP_DEFAULT;
  const comeNow = biz.alertComeNow ?? ALERT_COME_NOW_DEFAULT;
  
  useEffect(() => {
    const away = numeric - serving;
    const jump = prevServingRef.current == null ? 1 : Math.max(1, serving - prevServingRef.current);
    prevServingRef.current = serving;
    const spedUp = jump > 1;
    let stage = 0;
    if (away <= 0) stage = 3;
    else if (away <= comeNow) stage = 2;
    else if (away <= headsUp) stage = 1;
    if (stage <= alertStageRef.current) return;
    alertStageRef.current = stage;
    if (stage === 3) showLocalNotification("It's your turn! 🎉", `${number} — please proceed to the counter.`);
    else if (stage === 2) showLocalNotification(
      spedUp ? "Queue moving fast — come now ⚡" : "You're almost up ⏰",
      spedUp ? `${number} — the queue sped up, you're ${away} away. Please come now.` : `${number} — you're ${away} away. Please head to the counter.`,
    );
    else showLocalNotification("Get ready 🔔", `${number} — ${away} people ahead. Time to start heading over.`);
  }, [serving, numeric, number, headsUp, comeNow]);

  if (!svc) return <div className="text-center text-sm text-ink-3 py-10">Loading your queue…</div>;

  const ahead = Math.max(0, numeric - serving - 1);
  const parked = tok?.status === "parked";
  const expired = tok?.status === "noshow";
  const yourTurn = !parked && (serving >= numeric || tok?.status === "served");
  const cancelled = tok?.status === "cancelled";
  const delay = yourTurn || parked || expired || cancelled ? 0 : svc.delayMins ?? 0;
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
        <div className="flex flex-col gap-1.5 mb-4">
          <div className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-3 mb-1">Your visit &middot; stage {journey.length + 1}</div>
          {journey.map((st, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-gray-50">
              <span className="grid place-items-center w-6 h-6 rounded-full text-[12px] font-bold text-white shrink-0" style={{ background: "#06D6A0" }}>✓</span>
              <span className="text-[0.85rem] font-semibold text-ink-2 flex-1 truncate">{st.serviceName}</span>
              <span className="num text-[0.8rem] text-ink-3 font-bold">{st.number}</span>
            </div>
          ))}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-acc/10 border border-acc/30">
            <span className="grid place-items-center w-6 h-6 rounded-full text-[12px] font-bold text-white bg-acc shrink-0">{journey.length + 1}</span>
            <span className="text-[0.85rem] font-bold flex-1 truncate text-acc">{svc.name} — current</span>
            <span className="num text-[0.8rem] font-bold text-acc">{number}</span>
          </div>
        </div>
      )}

      {parked && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: "rgba(247,127,0,.12)", border: "1px solid var(--wn)" }}>
          <span className="text-xl">🅿️</span>
          <div className="flex-1">
            <div className="text-[0.85rem] font-bold" style={{ color: "var(--wn)" }}>We&apos;re holding your spot</div>
            <div className="text-[0.75rem] mt-0.5 text-ink-3 font-medium">You were called — please come to the counter now. Your place is kept for a few minutes.</div>
          </div>
        </div>
      )}
      {expired && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: "rgba(239,35,60,.08)", border: "1px solid var(--dng)" }}>
          <span className="text-xl">⌛</span>
          <div className="flex-1">
            <div className="text-[0.85rem] font-bold" style={{ color: "var(--dng)" }}>Token released</div>
            <div className="text-[0.75rem] mt-0.5 text-ink-3 font-medium">You didn&apos;t reach the counter in time. Please take a new token to rejoin the queue.</div>
          </div>
        </div>
      )}
      {delay > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4" style={{ background: "rgba(247,127,0,.1)", border: "1px solid var(--wn)" }}>
          <span className="text-xl">⏳</span>
          <div className="flex-1">
            <div className="text-[0.85rem] font-bold" style={{ color: "var(--wn)" }}>Running about {delay} min behind</div>
            <div className="text-[0.75rem] mt-0.5 text-ink-3 font-medium">{biz.name} announced this{delayTime ? ` at ${delayTime}` : ""} — your estimate below already includes it.</div>
          </div>
        </div>
      )}

      {/* Live Ticket */}
      <div className="relative overflow-hidden rounded-[24px] p-6 text-white shadow-[0_20px_40px_rgba(13,27,62,0.4)]" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1A2F70 100%)" }}>
        <div className="text-[0.8rem] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{svc.name} &middot; {biz.name}</div>
        <div className="font-display font-black text-[4.5rem] leading-[1.1] tracking-tight mt-1 mb-1">{number}</div>
        {tok?.room && (
          <div className="inline-block mb-2 px-3 py-1.5 rounded-lg text-[0.85rem] font-bold" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
            📍 Proceed to: {tok.room}
          </div>
        )}
        
        <span className="inline-flex items-center gap-2 mt-1 text-[0.75rem] font-bold px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.9)" }}>
          <span className={`w-2 h-2 rounded-full ${parked ? "bg-[#FDB44B]" : yourTurn ? "bg-[#06D6A0]" : cancelled ? "bg-red-500" : "bg-[#06D6A0] live-dot"}`}></span>
          {cancelled ? "Cancelled" : expired ? "Token released" : parked ? "Held — please come now" : yourTurn ? "Your turn — proceed!" : "Waiting"}
        </span>

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { l: "Ahead", v: ahead, u: "people" },
            { l: "Est. wait", v: estWait, u: livePace ? "min · live pace" : "minutes" },
            { l: "Serving", v: `${svc.prefix}-${serving}`, u: "now", h: true },
          ].map((m) => (
            <div key={m.l}>
              <div className="text-[0.65rem] uppercase tracking-wider font-bold" style={{ color: "rgba(255,255,255,0.5)" }}>{m.l}</div>
              <div className={`num text-[1.3rem] font-bold mt-1 ${m.h ? "text-[#06d6a0]" : ""}`}>{m.v}</div>
              <div className="text-[0.7rem]" style={{ color: "rgba(255,255,255,0.5)" }}>{m.u}</div>
            </div>
          ))}
        </div>
        
        <div className="mt-6">
          <div className="flex justify-between text-[0.7rem] font-bold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            <span>Queue position</span><span className="num">{ahead + 1} of {Math.max(1, total - serving)}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#06D6A0", boxShadow: "0 0 10px rgba(6,214,160,0.5)" }} />
          </div>
        </div>
      </div>

      {biz.waEnabled && WA_NUMBER && tok?.waCode && !cancelled && !expired && (
        tok?.waTo ? (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl mt-4 text-[0.85rem] font-bold" style={{ background: "rgba(37,211,102,.1)", border: "1px solid #25D366", color: "#128C4B" }}>
            ✅ WhatsApp alerts on — we&apos;ll message you as your turn nears.
          </div>
        ) : (
          <a href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`TRACK ${tok.waCode} — token ${number}`)}`} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl mt-4 text-[0.9rem] font-bold text-white hover:-translate-y-px transition-transform" style={{ background: "#25D366", boxShadow: "0 8px 20px rgba(37,211,102,0.25)" }}>
            🟢 Get alerts on WhatsApp
          </a>
        )
      )}

      <div className="bg-white border border-border rounded-2xl p-4 mt-4 shadow-[0_4px_12px_rgba(16,24,40,0.03)]">
        <div className="font-display font-bold text-ink mb-3 flex items-center gap-2">Queue status <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(6,214,160,.12)", color: "#06D6A0" }}>● Live</span></div>
        <div className="flex flex-col gap-1.5">
          {rows.map((q, i) => (
            <div key={i} className="flex justify-between items-center px-4 py-2.5 rounded-xl border"
              style={q.kind === "serving" ? { background: "rgba(6,214,160,.08)", borderColor: "#06D6A0" } : q.kind === "mine" ? { background: "rgba(49,92,255,0.05)", borderColor: "rgba(49,92,255,0.5)" } : { background: "#f8fafc", borderColor: "#e2e8f0" }}>
              <span className="num font-bold text-[0.85rem]" style={{ color: q.kind === "serving" ? "#06D6A0" : q.kind === "mine" ? "var(--acc)" : "var(--t1)" }}>{q.num}{q.kind === "mine" ? " — You!" : ""}</span>
              <span className="text-[0.75rem] font-bold" style={{ color: q.kind === "mine" ? "var(--acc)" : "var(--t3)" }}>{q.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2 mt-4">
        <button onClick={() => {
          const url = `${window.location.origin}/app?token=${issued.id}`;
          try { navigator.clipboard.writeText(url); } catch {}
        }}
        className="flex-1 py-3 rounded-xl text-[0.85rem] font-bold border border-border text-ink-2 bg-white hover:border-acc hover:text-acc transition shadow-sm">
          📋 Copy my token link
        </button>
        <button onClick={() => {
          const url = `${window.location.origin}/app?token=${issued.id}`;
          try { navigator.clipboard.writeText(url); } catch {}
        }} className="flex items-center justify-center py-3 px-4 rounded-xl text-[1rem] border border-border text-ink-2 bg-white hover:border-acc transition shadow-sm">
          🔗
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={onCancel} className="py-3 rounded-xl text-[0.9rem] font-bold text-white hover:opacity-90 transition" style={{ background: "var(--dng)" }}>Cancel token</button>
        <button onClick={onDone} className="py-3 rounded-xl text-[0.9rem] font-bold text-white hover:opacity-90 transition" style={{ background: "#0e1726" }}>I&apos;m done &rsaquo;</button>
      </div>
      <p className="text-center text-[0.75rem] text-ink-3 mt-3 px-4 font-medium">📲 You'll be alerted as your turn nears &middot; Copy the link above to come back anytime</p>
    </div>
  );
}

function Feedback({ rating, onRate, onDone }: { rating: number | null; onRate: (i: number, label: string) => void; onDone: () => void }) {
  const faces = [
    { e: "😄", l: "Very good" }, { e: "🙂", l: "Good" }, { e: "😐", l: "Moderate" }, { e: "🙁", l: "Bad" }, { e: "😣", l: "Very bad" },
  ];
  if (rating !== null) {
    return (
      <div className="text-center py-20 px-4">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="font-display text-2xl font-bold text-ink mb-2">Thank you!</h1>
        <p className="text-[0.9rem] text-ink-3 mb-8">Your feedback helps businesses serve you better.</p>
        <button onClick={onDone} className="px-8 py-3.5 rounded-xl text-[0.95rem] font-bold text-white bg-acc hover:-translate-y-px transition" style={{ boxShadow: "0 10px 24px rgba(49,92,255,.25)" }}>Back to home</button>
      </div>
    );
  }
  return (
    <div>
      <SectionTitle t="How was your visit?" s="We appreciate your feedback" />
      <p className="text-[0.85rem] font-bold text-ink mb-4 mt-2">How would you rate the friendliness and service?</p>
      <div className="flex flex-col gap-2.5">
        {faces.map((f, i) => (
          <button key={f.l} onClick={() => onRate(i, f.l)} className="flex items-center gap-4 px-5 py-3.5 rounded-2xl border border-border bg-white hover:border-acc hover:shadow-md hover:-translate-y-px transition text-left">
            <span className="text-3xl">{f.e}</span><span className="font-bold text-ink text-[1.05rem]">{f.l}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
