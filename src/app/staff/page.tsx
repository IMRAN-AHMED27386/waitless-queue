"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listenQueue, listenService, listenBusinesses, listenAllServices, advanceQueue, issueToken, transferToken, type Tok, type Svc, type Biz } from "@/lib/db";
import { useAuthGuard } from "@/lib/auth";
import SignOut from "@/components/SignOut";
import Modal, { Field, inputCls } from "@/components/Modal";

const filters = ["All", "Waiting", "Priority"];
const selCls = "text-[13px] font-semibold px-3 py-2 rounded-[10px] border border-border bg-surface text-ink outline-none focus:border-acc max-w-[44vw] truncate";

export default function Staff() {
  const { ready, user } = useAuthGuard(["staff", "admin"]);
  const [bizId, setBizId] = useState("sunshine-clinic");
  const [svcId, setSvcId] = useState("gen");
  const [businesses, setBusinesses] = useState<Biz[]>([]);
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

  useEffect(() => {
    const u1 = listenBusinesses(setBusinesses);
    const u2 = listenAllServices(setAllServices);
    return () => { u1(); u2(); };
  }, []);

  const bizServices = allServices.filter((s) => s.businessId === bizId);

  // When the business changes, snap the service to a valid one for it.
  useEffect(() => {
    if (bizServices.length && !bizServices.some((s) => s.id === svcId)) setSvcId(bizServices[0].id);
  }, [bizId, allServices]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live queue + serving for the selected business/service.
  useEffect(() => {
    if (!bizId || !svcId) return;
    setServed(0); setSkipped(0);
    const u1 = listenService(bizId, svcId, setSvc);
    const u2 = listenQueue(bizId, svcId, setQueue);
    return () => { u1(); u2(); };
  }, [bizId, svcId]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function advance(kind: "next" | "complete" | "noshow" | "skip") {
    if (busy) return;
    setBusy(true);
    const num = await advanceQueue(bizId, svcId, user?.name);
    setBusy(false);
    if (num == null) { flash("Queue is empty."); return; }
    if (kind === "complete") setServed((n) => n + 1);
    if (kind === "noshow" || kind === "skip") setSkipped((n) => n + 1);
    const tag = kind === "noshow" ? "No-show · " : kind === "skip" ? "Skipped · " : "";
    flash(`${tag}Now serving ${svc?.prefix}-${num}`);
  }

  function openTransfer() {
    if (!svc?.currentServing) { flash("No customer is being served yet — call next first."); return; }
    const others = bizServices.filter((s) => s.id !== svcId);
    if (!others.length) { flash("No other service to transfer to."); return; }
    setTransferTo(others[0].id);
    setShowTransfer(true);
  }

  async function doTransfer() {
    if (!transferTo || busy) return;
    setBusy(true);
    try {
      const r = await transferToken(bizId, svcId, transferTo);
      setShowTransfer(false);
      flash(`Sent ${serving} → ${r.toName} as ${r.number}`);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Transfer failed.");
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

  const biz = businesses.find((b) => b.id === bizId);
  const serving = svc ? `${svc.prefix}-${svc.currentServing}` : "—";
  const svcName = svc?.name ?? "";
  const q = query.trim().toLowerCase();
  const shown = queue
    .filter((t) => filter !== "Priority" || t.priority === "vip" || t.priority === "emergency")
    .filter((t) => !q || t.number.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q));

  if (!ready) return <div className="flex-1 grid place-items-center text-ink-3 text-sm">Loading…</div>;

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="grid place-items-center w-9 h-9 rounded-[10px] border border-border bg-surface text-ink-2" aria-label="Home">←</Link>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Staff Dashboard</h1>
            <p className="text-xs text-ink-3">{biz?.name ?? "—"} · {svcName || "—"} · ● Live</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={bizId} onChange={(e) => setBizId(e.target.value)} className={selCls} title="Business">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select value={svcId} onChange={(e) => setSvcId(e.target.value)} className={selCls} title="Service / counter">
            {bizServices.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <SignOut />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4">
        <div>
          <div className="mb-3">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍  Search token or name…" className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc" />
          </div>
          <div className="flex gap-2 flex-wrap mb-3">
            {filters.map((f) => (
              <button key={f} onClick={() => setFilter(f)} className="text-[13px] font-semibold px-3 py-1.5 rounded-full border transition"
                style={filter === f ? { background: "var(--al)", borderColor: "var(--acc)", color: "var(--acc)" } : { background: "var(--sf)", borderColor: "var(--bd)", color: "var(--t3)" }}>
                {f}{f === "All" ? ` (${queue.length})` : f === "Priority" ? ` (${queue.filter((q) => q.priority === "vip" || q.priority === "emergency").length})` : ""}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{ background: "rgba(6,214,160,.12)", border: "1px solid #06D6A0" }}>
              <span className="num font-bold text-[13px] px-3 py-1.5 rounded-lg" style={{ background: "#06D6A0", color: "#0D1B3E" }}>{serving}</span>
              <div className="flex-1"><div className="font-semibold text-ink text-sm">Now serving</div><div className="text-xs text-ink-3">{svcName}</div></div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(6,214,160,.18)", color: "#06D6A0" }}>Serving</span>
            </div>
            {shown.map((q) => {
              const vip = q.priority === "vip" || q.priority === "emergency";
              return (
                <div key={q.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-surface transition" style={vip ? { border: "1px solid var(--pur)", background: "rgba(114,9,183,.06)" } : { border: "1px solid var(--bd)" }}>
                  <span className="num font-bold text-[13px] px-3 py-1.5 rounded-lg text-white" style={{ background: vip ? "var(--pur)" : "var(--acc)" }}>{q.number}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-ink text-sm flex items-center gap-1.5 truncate">
                      {q.customerName}
                      {vip && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(114,9,183,.1)", color: "var(--pur)" }}>{q.priority.toUpperCase()}</span>}
                    </div>
                    <div className="text-xs text-ink-3">{svcName}</div>
                  </div>
                  <span className="text-xs text-ink-3 font-medium shrink-0">#{q.numericValue}</span>
                </div>
              );
            })}
            {shown.length === 0 && <div className="text-center text-sm text-ink-3 py-8">No one waiting. 🎉</div>}
          </div>
        </div>

        <div>
          <div className="rounded-2xl p-5 text-center text-white mb-3" style={{ background: "linear-gradient(135deg,var(--acc),#2D3A8C)" }}>
            <div className="text-[10px] uppercase tracking-widest font-semibold mb-1.5" style={{ color: "rgba(255,255,255,.6)" }}>Now serving</div>
            <div className="num text-[54px] font-bold leading-none tracking-tight">{serving}</div>
            <div className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,.6)" }}>{biz?.name} · {svcName}</div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <ActionBtn label="Call Next" icon="⏭️" primary onClick={() => advance("next")} />
            <ActionBtn label="Recall" icon="🔁" onClick={() => flash(`Recalling ${serving} — please proceed`)} />
            <ActionBtn label="Skip" icon="⏩" onClick={() => advance("skip")} />
            <ActionBtn label="Transfer" icon="↗️" onClick={openTransfer} />
            <ActionBtn label="No Show" icon="❌" danger onClick={() => advance("noshow")} />
            <ActionBtn label="Complete" icon="✅" onClick={() => advance("complete")} />
          </div>
          <div className="bg-surface border border-border rounded-2xl p-4 mb-3" style={{ boxShadow: "var(--sh)" }}>
            <div className="font-display font-bold text-ink mb-2">Add Priority Token</div>
            <input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="Name or reason…" className="w-full px-3 py-2 mb-2 rounded-lg border border-border bg-surface text-[14px] outline-none focus:border-acc" />
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <select value={pPriority} onChange={(e) => setPPriority(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-surface text-[14px] outline-none focus:border-acc">
                <option value="emergency">Emergency</option>
                <option value="vip">VIP</option>
                <option value="senior">Senior</option>
              </select>
              <button onClick={addPriority} disabled={!pName.trim() || busy} className="px-4 rounded-lg text-[13px] font-semibold text-white bg-acc hover:bg-acc-dark disabled:opacity-50 transition">Add</button>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-4" style={{ boxShadow: "var(--sh)" }}>
            <div className="font-display font-bold text-ink mb-3">This session</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat n={served} l="Served" />
              <Stat n={skipped} l="Skipped" color="var(--wn)" />
              <Stat n={`${queue.length}`} l="Waiting" color="#06D6A0" />
            </div>
          </div>
        </div>
      </div>

      {showTransfer && (
        <Modal title={`Transfer ${serving} to next stage`} onClose={() => setShowTransfer(false)}>
          <p className="text-sm text-ink-3 mb-3">The customer keeps the same live token page — they get a new number in the next queue and a notification telling them where to go.</p>
          <Field label="Send customer to">
            <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} className={inputCls}>
              {bizServices.filter((s) => s.id !== svcId).map((s) => (
                <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
              ))}
            </select>
          </Field>
          <button onClick={doTransfer} disabled={busy || !transferTo} className="w-full py-3 rounded-xl font-semibold text-white bg-acc hover:bg-acc-dark disabled:opacity-50 transition">
            {busy ? "Transferring…" : "Transfer customer ↗"}
          </button>
        </Modal>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 px-4 py-2.5 rounded-xl text-white text-sm font-semibold z-50 shadow-lg" style={{ background: "#0D1B3E" }}>{toast}</div>
      )}
    </main>
  );
}

function ActionBtn({ label, icon, primary, danger, onClick }: { label: string; icon: string; primary?: boolean; danger?: boolean; onClick: () => void }) {
  const style = primary ? { background: "var(--acc)", color: "#fff", borderColor: "var(--acc)" }
    : danger ? { background: "rgba(239,35,60,.1)", color: "var(--dng)", borderColor: "transparent" }
      : { background: "var(--sf)", color: "var(--t2)", borderColor: "var(--bd)" };
  return (
    <button onClick={onClick} className="py-2.5 px-1 rounded-xl border text-[12.5px] font-semibold transition hover:brightness-95" style={style}>
      <span className="block text-base mb-0.5">{icon}</span>{label}
    </button>
  );
}

function Stat({ n, l, color }: { n: string | number; l: string; color?: string }) {
  return (
    <div>
      <div className="num text-2xl font-bold" style={{ color: color ?? "var(--t1)" }}>{n}</div>
      <div className="text-[11px] text-ink-3">{l}</div>
    </div>
  );
}
