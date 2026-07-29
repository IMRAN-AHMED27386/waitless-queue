"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { listenBusinesses, listenAllServices, type Biz, type Svc } from "@/lib/db";
import { useAuthGuard, signOutUser } from "@/lib/auth";

export default function Board() {
  const { ready, user } = useAuthGuard(["admin", "super"]);
  const router = useRouter();
  const [clock, setClock] = useState("--:--:--");
  const [voice, setVoice] = useState(true);
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [services, setServices] = useState<Svc[]>([]);
  const [bizId, setBizId] = useState("");
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.businessId) {
      setBizId(user.businessId);
    }
  }, [user]);

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
  
  async function doSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  if (!ready) return (
    <div className="flex-1 h-screen grid place-items-center bg-[#f5f8fd]">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="grid place-items-center w-16 h-16 rounded-[14px] text-white text-3xl shadow-xl" style={{ background: "linear-gradient(135deg,#315cff,#59d4d1)" }}>⚡</div>
        <div className="font-display text-2xl font-bold text-ink tracking-tight mt-2">Waitless</div>
        <div className="text-[0.95rem] font-medium text-ink-3">Verifying access…</div>
      </div>
    </div>
  );

  const isSuper = user?.role === "super";
  const sidebarBg = isSuper
    ? "linear-gradient(180deg,#1c0a30 0%,#2a104a 100%)"
    : "linear-gradient(180deg,#0a1128 0%,#162550 100%)";
  const sidebarShadow = isSuper
    ? "4px 0 24px rgba(28,10,48,0.15)"
    : "4px 0 24px rgba(10,17,40,0.15)";
  const logoBg = isSuper
    ? "linear-gradient(135deg,#7209b7,#b5179e)"
    : "linear-gradient(135deg,#315cff,#59d4d1)";
  const logoShadow = isSuper
    ? "0 8px 24px rgba(114,9,183,.4)"
    : "0 8px 24px rgba(49,92,255,.4)";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f8fd]">
      {/* ════════ SIDEBAR ════════ */}
      <div className="w-[280px] shrink-0 h-full flex flex-col justify-between text-white relative z-20" style={{ background: sidebarBg, boxShadow: sidebarShadow }}>
        <div className="p-7">
          <div className="flex items-center gap-3.5 mb-12">
            <span className="grid place-items-center w-11 h-11 rounded-[12px] text-white text-xl" style={{ background: logoBg, boxShadow: logoShadow }}>⚡</span>
            <span className="font-display text-[1.55rem] font-bold tracking-tight">Waitless</span>
          </div>
          
          <div className="text-[0.7rem] uppercase tracking-widest font-bold text-white/50 mb-3 px-1.5">Business</div>
          <div className="font-display font-bold text-[1.1rem] px-1.5 mb-1 truncate leading-tight">{biz?.name ?? "—"}</div>
          <div className="text-[0.75rem] font-medium text-white/60 px-1.5 mb-8 truncate">{bizId || "—"}</div>

          <nav className="flex flex-col gap-2">
            {user?.role === "admin" && (
              <>
                <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] hover:bg-white/5 text-white/70 hover:text-white transition font-semibold">🏢 Dashboard</Link>
                <Link href="/analytics" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] hover:bg-white/5 text-white/70 hover:text-white transition font-semibold">📊 Analytics</Link>
              </>
            )}
            {user?.role === "super" && (
              <>
                <Link href="/super" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] hover:bg-white/5 text-white/70 hover:text-white transition font-semibold">🏢 All Businesses</Link>
                <Link href="/analytics" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] hover:bg-white/5 text-white/70 hover:text-white transition font-semibold">📊 Analytics</Link>
              </>
            )}
            <Link href="/board" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] bg-white/10 text-white font-semibold transition shadow-sm border border-white/5">📺 TV Board</Link>
          </nav>
        </div>
        
        <div className="p-7 pt-0">
          <button onClick={doSignOut} className="w-full text-[0.85rem] font-bold px-4 py-3 rounded-[12px] border border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white transition">
            Sign out
          </button>
        </div>
      </div>

      {/* ════════ MAIN DASHBOARD ════════ */}
      <main className="flex-1 h-full overflow-y-auto px-6 py-8 md:px-10 md:py-10 relative z-10">
        <div className="max-w-[1400px] mx-auto h-full flex flex-col">
          
          {/* Controls */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div>
              <h1 className="font-display text-[2.2rem] font-extrabold text-ink tracking-tight leading-none mb-2">Live TV Board</h1>
              <p className="text-[0.95rem] font-medium text-ink-3">Project this to a TV in your waiting room.</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={bizId} onChange={(e) => setBizId(e.target.value)} className="text-[0.85rem] font-bold px-4 py-3 rounded-[14px] border border-border bg-white text-ink outline-none hover:border-ink-3 transition shadow-sm cursor-pointer">
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <button onClick={() => setVoice((v) => !v)} className="text-[0.85rem] font-bold px-4 py-3 rounded-[14px] border border-border bg-white text-ink-2 hover:bg-surface-2 transition shadow-sm">
                {voice ? "🔊 Voice on" : "🔇 Voice off"}
              </button>
              <button onClick={goFull} className="text-[0.85rem] font-bold px-5 py-3 rounded-[14px] text-white transition shadow-[0_8px_20px_rgba(49,92,255,0.25)] hover:-translate-y-px" style={{ background: "#315cff" }}>
                ⛶ Fullscreen
              </button>
            </div>
          </div>

          {/* Actual Display Board */}
          <div ref={boardRef} className="rounded-[24px] p-6 sm:p-10 text-white flex flex-col shadow-[0_20px_60px_rgba(5,10,24,0.4)] relative overflow-hidden flex-1 min-h-[600px]" style={{ background: "linear-gradient(145deg, #0a1128 0%, #050a18 100%)" }}>
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 lg:gap-6 flex-1 content-center relative z-10">
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
                    <div className="num text-[3.5rem] xl:text-[4.5rem] 2xl:text-[5.5rem] whitespace-nowrap font-display font-black leading-none tracking-tighter drop-shadow-lg mb-2" style={{ color: serving ? "#fff" : "rgba(255,255,255,.15)" }}>{token}</div>
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
              
              <div className="bg-white/5 border border-white/10 rounded-[24px] px-8 py-8 flex-1 flex items-center gap-6 backdrop-blur-md">
                <div className="text-[1.4rem] font-bold uppercase tracking-[0.15em] text-white/40 whitespace-nowrap">Up Next <span className="text-white/20">|</span> {lead?.name ?? ""}</div>
                <div className="flex gap-4 flex-wrap">
                  {upNext.length === 0 && <span className="text-[1.6rem] text-white/30 font-medium">No one waiting in this queue</span>}
                  {upNext.map((t, i) => (
                    <span key={t} className="num text-[1.8rem] font-bold px-6 py-2 rounded-[14px]" style={{ background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.9)", opacity: 1 - (i * 0.15) }}>{t}</span>
                  ))}
                </div>
              </div>
              
              <div className="bg-[#315cff]/20 border border-[#315cff]/30 rounded-[24px] px-8 py-8 flex items-center gap-5 backdrop-blur-md shrink-0">
                <span className="text-4xl">📢</span>
                <span className="text-[1.6rem] font-bold text-[#e2e8ff] tracking-wide">Please proceed to your counter when your number is called</span>
              </div>

            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
