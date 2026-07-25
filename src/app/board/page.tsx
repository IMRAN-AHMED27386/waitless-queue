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
    <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-8 py-6">
      
      {/* Controls (Hidden in full screen mode naturally by the wrapper div not being full screened, only boardRef is) */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="grid place-items-center w-10 h-10 rounded-[12px] border border-border bg-white text-ink-2 hover:border-acc hover:text-acc transition shadow-sm">&larr;</Link>
          <div>
            <h1 className="font-display text-[1.6rem] leading-tight font-bold text-ink">Live TV Board</h1>
            <p className="text-[0.85rem] text-ink-3">Select a business to display its live queue</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={bizId} onChange={(e) => setBizId(e.target.value)} className="text-[0.85rem] font-bold px-4 py-2.5 rounded-[12px] border border-border bg-white text-ink outline-none hover:border-ink-3 transition shadow-sm cursor-pointer">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button onClick={() => setVoice((v) => !v)} className="text-[0.85rem] font-bold px-4 py-2.5 rounded-[12px] border border-border bg-white text-ink-2 hover:bg-surface-2 transition shadow-sm">
            {voice ? "🔊 Voice on" : "🔇 Voice off"}
          </button>
          <button onClick={goFull} className="text-[0.85rem] font-bold px-5 py-2.5 rounded-[12px] text-white transition shadow-[0_8px_20px_rgba(49,92,255,0.25)] hover:-translate-y-px" style={{ background: "#315cff" }}>
            ⛶ Fullscreen
          </button>
        </div>
      </div>

      {/* Actual Display Board */}
      <div ref={boardRef} className="rounded-[24px] p-6 sm:p-10 text-white flex flex-col shadow-[0_20px_60px_rgba(5,10,24,0.4)] relative overflow-hidden h-[80vh] min-h-[600px]" style={{ background: "linear-gradient(145deg, #0a1128 0%, #050a18 100%)" }}>
        
        {/* Subtle background glow effect */}
        <div className="absolute top-0 right-0 w-[50%] h-[50%] opacity-20 pointer-events-none" style={{ background: "radial-gradient(ellipse at top right, #315cff, transparent 70%)" }}></div>

        {/* Header */}
        <div className="flex items-end justify-between border-b pb-4 mb-8 relative z-10" style={{ borderColor: "rgba(255,255,255,.1)" }}>
          <div className="flex items-center gap-4">
            <div className="w-[60px] h-[60px] rounded-[16px] bg-white flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">⚡</div>
            <div>
              <div className="font-display text-[2rem] font-bold tracking-tight" style={{ color: "rgba(255,255,255,.9)" }}>{biz?.name ?? "—"}</div>
              <div className="text-[1rem] font-medium tracking-wide uppercase mt-1" style={{ color: "rgba(255,255,255,.4)" }}>{biz?.location ?? ""}</div>
            </div>
          </div>
          <div className="num text-[3.5rem] font-display font-bold leading-none tracking-tight text-white drop-shadow-md">{clock}</div>
        </div>

        {/* Counters Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 flex-1 relative z-10">
          {counters.length === 0 && <div className="col-span-full flex items-center justify-center" style={{ color: "rgba(255,255,255,.4)" }}>No counters configured for this business.</div>}
          {counters.map((s, i) => {
            const serving = s.currentServing > 0;
            const token = serving ? `${s.prefix}-${s.currentServing}` : "—";
            return (
              <div key={s.id} className="rounded-[24px] p-8 text-center flex flex-col justify-center transition-all relative overflow-hidden" 
                   style={serving 
                     ? { background: "linear-gradient(180deg, rgba(49,92,255,0.15) 0%, rgba(49,92,255,0.05) 100%)", border: "1px solid rgba(49,92,255,0.5)", boxShadow: "0 0 40px rgba(49,92,255,0.1) inset" } 
                     : { background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.05)" }}>
                
                <div className="text-[0.85rem] font-bold uppercase tracking-[0.2em] mb-4" style={{ color: "rgba(255,255,255,.5)" }}>Counter {i + 1}</div>
                <div className="num text-[5.5rem] font-display font-black leading-none tracking-tighter drop-shadow-lg mb-2" style={{ color: serving ? "#fff" : "rgba(255,255,255,.15)" }}>{token}</div>
                <div className="text-[1.2rem] font-medium mb-6" style={{ color: "rgba(255,255,255,.7)" }}>{s.name}</div>
                
                <div className="flex items-center justify-center gap-3">
                  {serving
                    ? <span className="text-[0.75rem] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider" style={{ background: "rgba(6,214,160,.2)", color: "#06D6A0", border: "1px solid rgba(6,214,160,0.3)" }}>● Serving Now</span>
                    : <span className="text-[0.75rem] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider" style={{ background: "rgba(255,255,255,.05)", color: "rgba(255,255,255,.3)", border: "1px solid rgba(255,255,255,0.1)" }}>Open</span>}
                  {(s.delayMins ?? 0) > 0 && <span className="text-[0.75rem] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider" style={{ background: "rgba(247,127,0,.2)", color: "#F77F00", border: "1px solid rgba(247,127,0,0.3)" }}>⏳ +{s.delayMins}m delay</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info area */}
        <div className="mt-8 flex items-center justify-between gap-6 relative z-10">
          
          <div className="bg-white/5 border border-white/10 rounded-[16px] px-6 py-5 flex-1 flex items-center gap-5 backdrop-blur-md">
            <div className="text-[0.8rem] font-bold uppercase tracking-[0.15em] text-white/40 whitespace-nowrap">Up Next <span className="text-white/20">|</span> {lead?.name ?? ""}</div>
            <div className="flex gap-3 flex-wrap">
              {upNext.length === 0 && <span className="text-[0.95rem] text-white/30 font-medium">No one waiting in this queue</span>}
              {upNext.map((t, i) => (
                <span key={t} className="num text-[1.1rem] font-bold px-4 py-1.5 rounded-[10px]" style={{ background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.9)", opacity: 1 - (i * 0.15) }}>{t}</span>
              ))}
            </div>
          </div>
          
          <div className="bg-[#315cff]/20 border border-[#315cff]/30 rounded-[16px] px-6 py-5 flex items-center gap-3 backdrop-blur-md shrink-0">
            <span className="text-xl">📢</span>
            <span className="text-[0.95rem] font-bold text-[#e2e8ff] tracking-wide">Please proceed to your counter when your number is called</span>
          </div>

        </div>

      </div>
    </main>
  );
}
