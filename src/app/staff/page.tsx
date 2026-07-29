"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listenQueue, listenService, listenBusiness, listenAllServices, advanceQueue, issueToken, transferToken, setDelay, parkToken, recallToken, listenParked, listenRooms, type Tok, type Svc, type ParkedTok, type Room } from "@/lib/db";
import { useAuthGuard, signOutUser } from "@/lib/auth";
import Modal, { Field, inputCls } from "@/components/Modal";

const filters = ["All", "Waiting", "Priority"];
const selCls = "px-4 py-2.5 rounded-[12px] border border-border bg-white text-[0.9rem] font-bold outline-none focus:border-acc shadow-sm max-w-[44vw] truncate";

/* ── Inline Styles from Preview ── */
const inputStyle = "w-full px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-[15px] outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(49,92,255,0.1)] transition-all shadow-sm";
const listCardStyle = "bg-white border border-border rounded-2xl p-3.5 flex items-center gap-3 transition-all hover:-translate-y-px shadow-[0_2px_8px_rgba(16,24,40,0.02)] hover:shadow-[0_8px_20px_rgba(16,24,40,0.06)]";

export default function Staff() {
  const { ready, user } = useAuthGuard(["staff"]);
  const router = useRouter();
  const bizId = user?.businessId ?? "";
  const [bizName, setBizName] = useState("—");
  const [svcId, setSvcId] = useState("");
  const [allServices, setAllServices] = useState<Svc[]>([]);
  const [svc, setSvc] = useState<Svc | null>(null);
  const [queue, setQueue] = useState<Tok[]>([]);
  const [filter, setFilter] = useState("All");
  const [toast, setToast] = useState<string | null>(null);
  const [served, setServed] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [pName, setPName] = useState("");
  const [pPriority, setPPriority] = useState("vip");
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState("");
  const [transferRoom, setTransferRoom] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showDelay, setShowDelay] = useState(false);
  const [delayPick, setDelayPick] = useState(15);
  const [parked, setParked] = useState<ParkedTok[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!bizId) return;
    const u1 = listenBusiness(bizId, (b) => setBizName(b?.name ?? "—"));
    const u2 = listenAllServices(setAllServices);
    const u3 = listenRooms(bizId, setRooms);
    return () => { u1(); u2(); u3(); };
  }, [bizId]);

  const bizServices = allServices.filter((s) => s.businessId === bizId);

  useEffect(() => {
    if (bizServices.length && !bizServices.some((s) => s.id === svcId)) setSvcId(bizServices[0].id);
  }, [bizId, allServices]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!bizId || !svcId) return;
    setServed(0); setSkipped(0);
    const u1 = listenService(bizId, svcId, setSvc);
    const u2 = listenQueue(bizId, svcId, setQueue);
    const u3 = listenParked(bizId, svcId, setParked);
    return () => { u1(); u2(); u3(); };
  }, [bizId, svcId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function advance(kind: "next" | "complete" | "noshow" | "skip") {
    if (busy) return;
    setBusy(true);
    
    // Optimistic UI update for instant feedback
    const optimisticNext = queue.length > 0 ? queue[0] : null;
    setSvc((prev) => prev ? { ...prev, currentServing: optimisticNext ? optimisticNext.numericValue : 0 } : prev);
    if (optimisticNext) setQueue((prev) => prev.filter(t => t.id !== optimisticNext.id));

    try {
      const num = await advanceQueue(bizId, svcId, user?.name, kind);
      
      if (kind === "complete" || kind === "next") setServed((n) => n + 1);
      if (kind === "noshow" || kind === "skip") setSkipped((n) => n + 1);
      
      if (num == null) { 
        flash("Queue is empty."); 
      } else {
        const tag = kind === "noshow" ? "No-show · " : kind === "skip" ? "Skipped · " : "";
        flash(`${tag}Now serving ${svc?.prefix}-${num}`);
      }
    } catch (e) {
      flash(e instanceof Error ? e.message : "Error advancing queue");
    }
    setBusy(false);
  }

  function openTransfer() {
    if (busy) return;
    if (!svc?.currentServing) { flash("No customer at the counter to transfer."); return; }
    setShowTransfer(true);
  }

  async function doTransfer() {
    if (!transferRoom || busy) return;
    setBusy(true);
    
    // Optimistic UI
    setSvc((prev) => prev ? { ...prev, currentServing: 0 } : prev);

    try {
      const r = await transferToken(bizId, svcId, "", transferRoom);
      setShowTransfer(false);
      setTransferRoom("");
      flash(`Sent ${serving} to ${r.toName}`);
      
      // Auto-advance without waiting
      advanceQueue(bizId, svcId, user?.name, "next").catch(console.error);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Transfer failed.");
    }
    setBusy(false);
  }

  async function doPark() {
    if (busy) return;
    if (!svc?.currentServing) { flash("No customer at the counter to park."); return; }
    setBusy(true);
    try {
      const r = await parkToken(bizId, svcId);
      flash(`${r.number} parked — their spot is held. Call the next customer.`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not park.");
    }
    setBusy(false);
  }

  async function doRecall(tokenId: string, number: string) {
    if (busy) return;
    setBusy(true);
    try {
      await recallToken(bizId, svcId, tokenId);
      flash(`Recalled ${number} — now serving.`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not recall.");
    }
    setBusy(false);
  }

  async function doDelay(mins: number) {
    if (busy) return;
    setBusy(true);
    try {
      const r = await setDelay(bizId, svcId, mins);
      setShowDelay(false);
      flash(mins > 0
        ? `Delay of +${mins} min announced — ${r.notified} of ${r.waiting} waiting notified`
        : `Delay cleared — ${r.notified} of ${r.waiting} waiting notified`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not set delay.");
    }
    setBusy(false);
  }

  async function addPriority() {
    if (!pName.trim() || busy) return;
    setBusy(true);
    const t = await issueToken(bizId, svcId, { name: pName.trim(), phone: "-", priority: pPriority });
    setBusy(false);
    setPName("");
    flash(`Priority token ${t.number} added (${pPriority.toUpperCase()})`);
  }

  async function doSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  const serving = svc && svc.currentServing > 0 ? `${svc.prefix}-${svc.currentServing}` : "—";
  const svcName = svc?.name ?? "";
  const q = query.trim().toLowerCase();
  const shown = queue
    .filter((t) => filter !== "Priority" || t.priority === "vip" || t.priority === "emergency")
    .filter((t) => !q || t.number.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q));

  const parkedShown = parked
    .map((p) => ({ ...p, mins: p.parkedDate ? Math.floor((now - p.parkedDate.getTime()) / 60000) : 0 }))
    .filter((p) => p.mins < 10)
    .sort((a, b) => b.mins - a.mins);

  if (!ready) return (
    <div className="flex-1 h-screen grid place-items-center bg-[#f5f8fd]">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="grid place-items-center w-16 h-16 rounded-[14px] text-white text-3xl shadow-xl" style={{ background: "linear-gradient(135deg,#315cff,#59d4d1)" }}>⚡</div>
        <div className="font-display text-2xl font-bold text-ink tracking-tight mt-2">Waitless</div>
        <div className="text-[0.95rem] font-medium text-ink-3">Verifying access…</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f8fd]">
      {/* ════════ SIDEBAR ════════ */}
      <div className="w-[280px] shrink-0 h-full flex flex-col justify-between text-white relative z-20" style={{ background: "linear-gradient(180deg,#0a1128 0%,#162550 100%)", boxShadow: "4px 0 24px rgba(10,17,40,0.15)" }}>
        <div className="p-7">
          <div className="flex items-center gap-3.5 mb-12">
            <span className="grid place-items-center w-11 h-11 rounded-[12px] text-white text-xl" style={{ background: "linear-gradient(135deg,#315cff,#59d4d1)", boxShadow: "0 8px 24px rgba(49,92,255,.4)" }}>⚡</span>
            <span className="font-display text-[1.55rem] font-bold tracking-tight">Waitless</span>
          </div>
          
          <div className="text-[0.7rem] uppercase tracking-widest font-bold text-white/50 mb-3 px-1.5">Business</div>
          <div className="font-display font-bold text-[1.1rem] px-1.5 mb-1 truncate leading-tight">{bizName}</div>
          <div className="text-[0.75rem] font-medium text-white/60 px-1.5 mb-8 truncate">{bizId}</div>

          <nav className="flex flex-col gap-2">
            <Link href="/staff" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] bg-white/10 text-white font-semibold transition shadow-sm border border-white/5">🎫 Live Queue</Link>
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
        <div className="max-w-[1200px] mx-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
            <div>
              <h1 className="font-display text-[2.2rem] font-extrabold text-ink tracking-tight leading-none mb-2">Live Queue</h1>
              <p className="text-[0.95rem] font-medium text-ink-3">Manage tokens and walk-ins.</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <select value={svcId} onChange={(e) => setSvcId(e.target.value)} className={selCls} title="Service / counter">
                {bizServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid xl:grid-cols-[1fr_380px] gap-6 xl:gap-8">
            {/* LEFT COLUMN */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍  Search token or name…" className={inputStyle} />
                </div>
                <div className="flex gap-2 bg-white p-1.5 rounded-[14px] border border-border overflow-x-auto shrink-0 shadow-sm">
                  {filters.map((f) => (
                    <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap text-[0.85rem] px-4 py-1.5 rounded-[10px] transition ${
                      filter === f ? 'bg-surface-2 text-ink font-bold border border-border/50' : 'font-semibold text-ink-3 hover:text-ink border border-transparent'
                    }`}>
                      {f}{f === "All" ? ` (${queue.length})` : f === "Priority" ? ` (${queue.filter((q) => q.priority === "vip" || q.priority === "emergency").length})` : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-4 px-4 py-3 rounded-2xl" style={{ background: "rgba(6,214,160,.08)", border: "1px solid #06D6A0", boxShadow: "0 4px 12px rgba(6,214,160,0.1)" }}>
                  <span className="font-bold text-[1.1rem] px-4 py-2 rounded-xl" style={{ background: "#06D6A0", color: "#0D1B3E" }}>{serving}</span>
                  <div className="flex-1">
                    <div className="font-bold text-ink text-[1rem]">Now serving</div>
                    <div className="text-[0.8rem] text-ink-3 font-medium">{svcName}</div>
                  </div>
                  <span className="text-[0.75rem] font-bold px-3 py-1 rounded-full uppercase tracking-wider" style={{ background: "rgba(6,214,160,.2)", color: "#00A676" }}>Serving</span>
                </div>
                
                {shown.map((q) => {
                  const vip = q.priority === "vip" || q.priority === "emergency";
                  return (
                    <div key={q.id} className={listCardStyle} style={vip ? { borderColor: "#7209b7", background: "rgba(114,9,183,.03)" } : {}}>
                      <span className="font-bold text-[1rem] px-3.5 py-1.5 rounded-xl text-white shrink-0" style={{ background: vip ? "#7209b7" : "var(--acc)" }}>{q.number}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-ink text-[0.95rem] flex items-center gap-2 truncate">
                          {q.customerName}
                          {vip && <span className="text-[0.6rem] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(114,9,183,.1)", color: "#7209b7" }}>{q.priority}</span>}
                        </div>
                        <div className="text-[0.75rem] text-ink-3 font-medium truncate">{svcName}</div>
                      </div>
                      <span className="text-[0.85rem] text-ink-3 font-bold shrink-0">#{q.numericValue}</span>
                    </div>
                  );
                })}
                {shown.length === 0 && <div className="text-center text-[0.95rem] font-semibold text-ink-3 py-10 bg-white border border-dashed border-border rounded-2xl">No one waiting. 🎉</div>}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div>
              <div className="rounded-[24px] p-8 text-center text-white mb-4 shadow-[0_20px_40px_rgba(13,27,62,0.15)] relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1A2F70 100%)" }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 blur-[50px] rounded-full" />
                <div className="text-[0.75rem] uppercase tracking-widest font-bold mb-2" style={{ color: "rgba(255,255,255,.6)" }}>Now serving</div>
                <div className="font-display text-[5rem] font-black leading-none tracking-tight mb-2">{serving}</div>
                <div className="text-[0.9rem] font-medium" style={{ color: "rgba(255,255,255,.7)" }}>{bizName} &middot; {svcName}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <ActionBtn label="Call Next" icon="⏭️" primary onClick={() => advance("next")} />
                <ActionBtn label="Recall" icon="🔁" onClick={() => flash(`Recalling ${serving} — please proceed`)} />
                <ActionBtn label="No Show" icon="❌" danger onClick={() => advance("noshow")} />
                <ActionBtn label="Transfer" icon="↗️" onClick={openTransfer} />
              </div>

              <button onClick={doPark} disabled={busy || !svc?.currentServing}
                className="w-full mb-4 py-3.5 rounded-[14px] border text-[0.85rem] font-bold transition flex items-center justify-center gap-2 bg-white text-ink-2 shadow-sm border-border hover:bg-surface-2 disabled:opacity-50">
                <span className="text-lg">🅿️</span> Park {serving} — hold their spot
              </button>

              {parkedShown.length > 0 && (
                <div className="bg-white border border-border rounded-[20px] p-5 mb-4 shadow-sm">
                  <div className="font-display font-bold text-[1.1rem] text-ink mb-1">Parked <span className="text-ink-3 text-[0.9rem]">({parkedShown.length})</span></div>
                  <div className="text-[0.75rem] text-ink-3 mb-4 font-medium">Held spots. Tap Recall when they arrive.</div>
                  <div className="flex flex-col gap-3">
                    {parkedShown.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-[14px]" style={{ background: "rgba(247,127,0,.06)", border: "1px solid rgba(247,127,0,.25)" }}>
                        <span className="font-bold text-[0.9rem] px-3 py-1.5 rounded-lg text-white shrink-0" style={{ background: "#f77f00" }}>{p.number}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-ink text-[0.9rem] truncate">{p.customerName}</div>
                          <div className="text-[0.7rem] text-ink-3 font-medium">parked {p.mins === 0 ? "just now" : `${p.mins} min ago`}</div>
                        </div>
                        <button onClick={() => doRecall(p.id, p.number)} disabled={busy} className="text-[0.75rem] font-bold px-4 py-2 rounded-lg text-white bg-acc hover:bg-acc/90 transition shadow-sm disabled:opacity-50">Recall</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => { setDelayPick(svc?.delayMins || 15); setShowDelay(true); }}
                className="w-full mb-4 py-3.5 rounded-[14px] border text-[0.85rem] font-bold transition flex items-center justify-center gap-2 bg-white shadow-sm border-border hover:bg-surface-2"
                style={(svc?.delayMins ?? 0) > 0 ? { background: "rgba(247,127,0,.08)", borderColor: "rgba(247,127,0,.3)", color: "#f77f00" } : { color: "var(--t2)" }}>
                <span className="text-lg">⏳</span> {(svc?.delayMins ?? 0) > 0 ? `Delayed +${svc?.delayMins} min — tap to update` : "Announce a delay"}
              </button>

              <div className="bg-white border border-border rounded-[20px] p-5 shadow-sm mb-4">
                <div className="font-display font-bold text-[1.1rem] text-ink mb-4">Add Priority Token</div>
                <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Name or reason…" className={`${inputStyle} mb-3`} />
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <select value={pPriority} onChange={(e) => setPPriority(e.target.value)} className="px-3.5 py-2.5 rounded-[12px] border border-border bg-white text-[0.9rem] font-bold outline-none focus:border-acc shadow-sm">
                    <option value="emergency">Emergency</option>
                    <option value="vip">VIP</option>
                    <option value="senior">Senior</option>
                  </select>
                  <button onClick={addPriority} disabled={!pName.trim() || busy} className="px-6 py-2.5 rounded-[12px] font-bold text-white bg-acc hover:bg-acc/90 disabled:opacity-50 transition shadow-sm">Add</button>
                </div>
              </div>

              <div className="bg-white border border-border rounded-[20px] p-5 shadow-sm">
                <div className="font-display font-bold text-[1.1rem] text-ink mb-4">This session</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat n={served} l="Served" color="#0e1726" />
                  <Stat n={skipped} l="Skipped" color="#ef233c" />
                  <Stat n={`${queue.length}`} l="Waiting" color="#06d6a0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      {showTransfer && (
        <Modal title={`Send ${serving} to Room`} onClose={() => setShowTransfer(false)}>
          <p className="text-[0.85rem] text-ink-3 mb-4">The customer will be notified to proceed to the room you select.</p>
          <div className="flex flex-col gap-4">
            {rooms.length > 0 ? (
              <Field label="Select Room">
                <select value={transferRoom} onChange={(e) => setTransferRoom(e.target.value)} className={inputCls}>
                  <option value="">-- Choose a room --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </Field>
            ) : (
              <div className="text-[0.85rem] text-ink-3 p-4 bg-surface-2 rounded-xl text-center">No rooms configured. Add rooms in the Admin dashboard first.</div>
            )}
          </div>
          <button onClick={doTransfer} disabled={busy || !transferRoom} className="w-full mt-4 py-[14px] rounded-xl text-[0.92rem] font-bold text-white bg-acc hover:bg-acc/90 disabled:opacity-50 transition shadow-sm">
            {busy ? "Sending…" : "Send to Room ↗"}
          </button>
        </Modal>
      )}

      {showDelay && (
        <Modal title={`Delay — ${svcName || "this queue"}`} onClose={() => setShowDelay(false)}>
          <p className="text-[0.85rem] text-ink-3 mb-4">Everyone still waiting gets a notification with their new estimated time, and their token screen shows a delay banner. Honesty keeps customers calm.</p>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[10, 15, 20, 30].map((m) => (
              <button key={m} onClick={() => setDelayPick(m)}
                className={`py-2.5 rounded-[12px] border text-[0.85rem] font-bold transition shadow-sm ${delayPick === m ? 'bg-acc/10 border-acc text-acc' : 'bg-surface-2 border-border/80 text-ink-3 hover:bg-white'}`}>
                +{m}m
              </button>
            ))}
          </div>
          <Field label="Or custom minutes">
            <input type="number" min={1} max={480} value={delayPick}
              onChange={(e) => setDelayPick(Math.max(1, Math.min(480, Number(e.target.value) || 0)))}
              className={inputCls} />
          </Field>
          <button onClick={() => doDelay(delayPick)} disabled={busy || delayPick < 1}
            className="w-full mt-4 py-[14px] rounded-xl text-[0.92rem] font-bold text-white disabled:opacity-50 transition shadow-sm"
            style={{ background: "#f77f00" }}>
            {busy ? "Announcing…" : `Announce +${delayPick} min delay ⏳`}
          </button>
          {(svc?.delayMins ?? 0) > 0 && (
            <button onClick={() => doDelay(0)} disabled={busy}
              className="w-full mt-3 py-[14px] rounded-xl text-[0.92rem] font-bold border border-border text-ink-2 bg-white hover:bg-surface-2 disabled:opacity-50 transition shadow-sm">
              ✅ Clear delay — back on schedule
            </button>
          )}
        </Modal>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 px-6 py-3.5 rounded-[14px] text-white text-[0.9rem] font-bold z-50 shadow-[0_12px_32px_rgba(10,17,40,0.4)] transition-all animate-in slide-in-from-bottom-4" style={{ background: "#0a1128" }}>{toast}</div>
      )}
    </div>
  );
}

function ActionBtn({ label, icon, primary, danger, success, onClick }: { label: string; icon: string; primary?: boolean; danger?: boolean; success?: boolean; onClick: () => void }) {
  let styleCls = "bg-white border border-border text-ink-2 hover:border-acc hover:text-acc hover:bg-surface-2";
  let dynamicStyle = {};
  
  if (primary) {
    styleCls = "border-none text-white hover:-translate-y-px";
    dynamicStyle = { background: "linear-gradient(135deg, #315cff 0%, #284ee0 100%)", boxShadow: "0 10px 24px rgba(49,92,255,.25)" };
  } else if (danger) {
    styleCls = "hover:border-[#ef233c]";
    dynamicStyle = { background: "rgba(239,35,60,.06)", border: "1px solid rgba(239,35,60,.2)", color: "#ef233c" };
  } else if (success) {
    styleCls = "hover:border-[#00a676]";
    dynamicStyle = { background: "rgba(6,214,160,.06)", border: "1px solid rgba(6,214,160,.3)", color: "#00a676" };
  }

  return (
    <button onClick={onClick} className={`rounded-[14px] py-3 flex flex-col items-center justify-center text-[0.8rem] font-bold transition-all shadow-[0_2px_6px_rgba(16,24,40,0.02)] ${styleCls}`} style={dynamicStyle}>
      <span className="text-[1.5rem] mb-1 block">{icon}</span>
      {label}
    </button>
  );
}

function Stat({ n, l, color }: { n: string | number; l: string; color?: string }) {
  return (
    <div>
      <div className="text-[1.8rem] font-black leading-none" style={{ color: color ?? "var(--ink)" }}>{n}</div>
      <div className="text-[0.75rem] text-ink-3 font-semibold mt-1 uppercase tracking-wider">{l}</div>
    </div>
  );
}
