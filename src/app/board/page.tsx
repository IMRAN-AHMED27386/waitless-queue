"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { listenBusinesses, listenAllServices, type Biz, type Svc } from "@/lib/db";

export default function Board() {
  const [clock, setClock] = useState("--:--:--");
  const [voice, setVoice] = useState(true);
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [services, setServices] = useState<Svc[]>([]);
  const [bizId, setBizId] = useState("sunshine-clinic");
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      const p = (x: number) => String(x).padStart(2, "0");
      setClock(`${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => listenBusinesses(setBusinesses), []);
  useEffect(() => listenAllServices(setServices), []);

  const biz = businesses.find((b) => b.id === bizId);
  const counters = services.filter((s) => s.businessId === bizId);
  const lead = counters[0];
  const upNext = lead && lead.currentServing > 0
    ? Array.from({ length: 5 }, (_, i) => `${lead.prefix}-${lead.currentServing + i + 1}`)
    : [];

  function goFull() {
    const el = boardRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="grid place-items-center w-9 h-9 rounded-[10px] border border-border bg-surface text-ink-2" aria-label="Home">←</Link>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Live Queue Display</h1>
            <p className="text-xs text-ink-3">Each business has its own board · live</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={bizId} onChange={(e) => setBizId(e.target.value)} className="text-[13px] font-semibold px-3 py-2 rounded-[10px] border border-border bg-surface text-ink outline-none focus:border-acc">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={() => setVoice((v) => !v)} className="text-[13px] font-semibold px-3.5 py-2 rounded-[10px] border border-border bg-surface text-ink-2 hover:bg-surface-2 transition">{voice ? "🔊 Voice on" : "🔇 Voice off"}</button>
          <button onClick={goFull} className="text-[13px] font-semibold px-3.5 py-2 rounded-[10px] text-white bg-acc hover:bg-acc-dark transition">⛶ Fullscreen</button>
        </div>
      </div>

      <div ref={boardRef} className="rounded-[20px] p-5 sm:p-6 text-white" style={{ background: "#050A18" }}>
        <div className="flex items-center justify-between border-b pb-3 mb-4" style={{ borderColor: "rgba(255,255,255,.08)" }}>
          <div>
            <div className="font-display text-sm sm:text-base font-bold" style={{ color: "rgba(255,255,255,.6)" }}>⚡ Waitless · {biz?.name ?? "—"}</div>
            <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,.3)" }}>{biz?.location ?? ""}</div>
          </div>
          <div className="num text-lg sm:text-2xl font-bold">{clock}</div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {counters.length === 0 && <div className="col-span-full text-center py-8" style={{ color: "rgba(255,255,255,.4)" }}>No counters configured.</div>}
          {counters.map((s, i) => {
            const serving = s.currentServing > 0;
            const token = serving ? `${s.prefix}-${s.currentServing}` : "—";
            return (
              <div key={s.id} className="rounded-2xl p-4 text-center" style={serving ? { background: "rgba(67,97,238,.22)", border: "1px solid rgba(67,97,238,.45)" } : { background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.08)" }}>
                <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.4)" }}>Counter {i + 1}</div>
                <div className="num text-4xl sm:text-5xl font-bold leading-none tracking-tight" style={{ color: serving ? "#fff" : "rgba(255,255,255,.3)" }}>{token}</div>
                <div className="text-xs mt-2" style={{ color: "rgba(255,255,255,.45)" }}>{s.name}</div>
                <div className="mt-2">
                  {serving
                    ? <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(6,214,160,.25)", color: "#06D6A0" }}>● SERVING</span>
                    : <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.35)" }}>OPEN</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5">
          <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,.35)" }}>Up next — {lead?.name ?? ""}</div>
          <div className="flex gap-2 flex-wrap">
            {upNext.length === 0 && <span className="text-xs" style={{ color: "rgba(255,255,255,.4)" }}>No one waiting yet</span>}
            {upNext.map((t, i) => (<span key={t} className="num text-base font-bold px-3.5 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,.07)", opacity: i === upNext.length - 1 ? 0.5 : 1 }}>{t}</span>))}
          </div>
        </div>

        <div className="mt-4 px-3.5 py-2.5 rounded-xl text-xs" style={{ background: "rgba(67,97,238,.15)", color: "rgba(255,255,255,.6)" }}>
          📢 Please proceed to your counter when your number is called · Numbers update live
        </div>
      </div>
    </main>
  );
}
