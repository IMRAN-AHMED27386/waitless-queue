"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  listenBusiness, setFeatureToggle, listenBranches, listenBusinessTokens, listenAllServices,
  addBranch, updateBranch, addService, updateService, updateBusiness,
  ALERT_HEADS_UP_DEFAULT, ALERT_COME_NOW_DEFAULT,
  effectivePlan, tokensUsedThisMonth, trialDaysLeft, FREE_MONTHLY_TOKENS,
  type Branch, type HistTok, type Svc, type Biz,
} from "@/lib/db";
import { useAuthGuard } from "@/lib/auth";
import SignOut from "@/components/SignOut";
import Modal, { Field, inputCls } from "@/components/Modal";
import QRCode from "qrcode";
import { DEFAULT_COUNTRIES, countryByCode } from "@/lib/countries";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const toggleGroups = [
  { group: "General", items: [
    { id: "booking", label: "Online Token Booking", desc: "Allow customers to book via phone", on: true },
    { id: "guest", label: "Guest Booking", desc: "No login required for customers", on: true },
    { id: "cancel", label: "Token Cancellation", desc: "Allow customers to cancel", on: true },
    { id: "qr", label: "QR Code Check-in", desc: "Scan QR to open token page", on: true },
  ]},
  { group: "Notifications", items: [
    { id: "push", label: "Push Notifications", desc: "Browser alerts for customers", on: true },
    { id: "sms", label: "SMS Alerts", desc: "SMS when turn is approaching", on: false },
    { id: "whatsapp", label: "WhatsApp Notifications", desc: "Message when token is called", on: false },
    { id: "voice", label: "Voice Announcement", desc: "Audio alert at counter display", on: true },
  ]},
  { group: "Clinical", items: [
    { id: "doctor", label: "Doctor Queue", desc: "Assign tokens to specific doctors", on: true },
    { id: "emergency", label: "Emergency Priority", desc: "Push emergency tokens to front", on: true },
    { id: "labq", label: "Lab Report Queue", desc: "Separate queue for lab results", on: false },
  ]},
  { group: "Analytics", items: [
    { id: "dash", label: "Analytics Dashboard", desc: "Daily reports and performance charts", on: true },
    { id: "export", label: "CSV / PDF Export", desc: "Download queue data", on: true },
  ]},
];

export default function Admin() {
  const { ready, user } = useAuthGuard(["admin"]);
  const bizId = user?.businessId ?? "";
  const [bizName, setBizName] = useState("Business");
  const [bizDoc, setBizDoc] = useState<(Biz & { featureToggles?: Record<string, boolean> }) | null>(null);
  const initial: Record<string, boolean> = {};
  toggleGroups.forEach((g) => g.items.forEach((i) => (initial[i.id] = i.on)));
  const [toggles, setToggles] = useState(initial);
  const [toast, setToast] = useState<string | null>(null);
  const [modal, setModal] = useState<null | { mode: "new" } | { mode: "edit"; id: string }>(null);
  const [form, setForm] = useState({ name: "", location: "", counters: 1, status: "open" });
  const [qrUrl, setQrUrl] = useState("");
  useEffect(() => { if (!bizId) return; QRCode.toDataURL(`https://waitlessqueue.com/app?biz=${bizId}`, { width: 220, margin: 1 }).then(setQrUrl).catch(() => {}); }, [bizId]);
  const [svcModal, setSvcModal] = useState<null | { mode: "new" } | { mode: "edit"; id: string }>(null);
  const [svcForm, setSvcForm] = useState({ name: "", icon: "🩺", prefix: "A", avgMins: 5 });
  const [headsUp, setHeadsUp] = useState(ALERT_HEADS_UP_DEFAULT);
  const [comeNow, setComeNow] = useState(ALERT_COME_NOW_DEFAULT);
  const [bizCountry, setBizCountry] = useState(DEFAULT_COUNTRIES[0].code);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [tokens, setTokens] = useState<HistTok[]>([]);
  const [services, setServices] = useState<Svc[]>([]);

  // Persisted toggles for the selected business (reset to defaults on switch).
  useEffect(() => {
    if (!bizId) return;
    setToggles(initial);
    setHeadsUp(ALERT_HEADS_UP_DEFAULT); setComeNow(ALERT_COME_NOW_DEFAULT);
    return listenBusiness(bizId, (b) => {
      setBizName(b?.name ?? "Business");
      setBizDoc(b);
      if (b?.featureToggles) setToggles({ ...initial, ...b.featureToggles });
      if (b && typeof b.alertHeadsUp === "number") setHeadsUp(b.alertHeadsUp);
      if (b && typeof b.alertComeNow === "number") setComeNow(b.alertComeNow);
      if (b?.country && DEFAULT_COUNTRIES.some((c) => c.code === b.country)) setBizCountry(b.country);
    });
  }, [bizId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live data for the stat cards + branch cards.
  useEffect(() => {
    if (!bizId) return;
    const u1 = listenBranches(bizId, setBranches);
    const u2 = listenBusinessTokens(bizId, setTokens);
    const u3 = listenAllServices((all) => setServices(all.filter((s) => s.businessId === bizId)));
    return () => { u1(); u2(); u3(); };
  }, [bizId]);

  // Plan state for the banner + free-plan gates.
  const planNow = effectivePlan(bizDoc);
  const isTrial = bizDoc?.status === "trial" && planNow === "pro";
  const daysLeft = trialDaysLeft(bizDoc);
  const usedTokens = tokensUsedThisMonth(bizDoc);
  const usagePct = Math.min(100, Math.round((usedTokens / FREE_MONTHLY_TOKENS) * 100));

  const served = tokens.filter((t) => t.status === "served").length;
  const completion = tokens.length ? Math.round((served / tokens.length) * 100) : 0;
  const activeBranches = branches.filter((b) => b.status !== "closed").length;
  const avgSvc = services.length ? Math.round(services.reduce((n, s) => n + s.avgMins, 0) / services.length) : 0;
  const stats = [
    { l: "Active Tokens", v: `${tokens.length}`, c: "live total", icon: "🎫", bg: "rgba(49,92,255,.1)" },
    { l: "Avg Service Time", v: `${avgSvc}m`, c: "across services", icon: "⏱️", bg: "rgba(6,214,160,.12)" },
    { l: "Branches Active", v: `${activeBranches}/${branches.length}`, c: branches.length ? "operating" : "—", icon: "🏢", bg: "rgba(247,127,0,.12)" },
    { l: "Completion Rate", v: `${completion}%`, c: `${served} served`, icon: "✅", bg: "rgba(114,9,183,.1)" },
  ];

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2000);
  }
  function toggle(id: string, label: string) {
    const next = !toggles[id];
    setToggles((t) => ({ ...t, [id]: next })); // optimistic
    setFeatureToggle(bizId, id, next);      // persist to Firestore
    flash(`${label} ${next ? "enabled" : "disabled"} · saved`);
  }

  function openNew() { setForm({ name: "", location: "", counters: 1, status: "open" }); setModal({ mode: "new" }); }
  function openEdit(b: Branch) { setForm({ name: b.name, location: b.location, counters: b.counters, status: b.status }); setModal({ mode: "edit", id: b.id }); }
  async function saveBranch() {
    if (!form.name.trim()) return;
    try {
      if (modal?.mode === "new") {
        await addBranch(bizId, { name: form.name.trim(), location: form.location.trim(), status: form.status, inQueue: 0, counters: Number(form.counters), avgWait: "—" });
        flash("Branch added");
      } else if (modal?.mode === "edit") {
        await updateBranch(bizId, modal.id, { name: form.name.trim(), location: form.location.trim(), status: form.status, counters: Number(form.counters) });
        flash("Branch updated");
      }
      setModal(null);
    } catch (error: any) {
      console.error(error);
      flash("Error: " + (error.message || "Failed to save branch"));
    }
  }

  function openNewSvc() {
    // Free plan includes exactly one service line — more needs Pro.
    if (planNow === "free" && services.length >= 1) {
      flash("Free plan includes 1 service — upgrade to Pro to add more");
      return;
    }
    setSvcForm({ name: "", icon: "🩺", prefix: "A", avgMins: 5 }); setSvcModal({ mode: "new" });
  }
  function openEditSvc(s: Svc) { setSvcForm({ name: s.name, icon: s.icon, prefix: s.prefix, avgMins: s.avgMins }); setSvcModal({ mode: "edit", id: s.id }); }
  async function saveService() {
    if (!svcForm.name.trim()) return;
    const data = { name: svcForm.name.trim(), icon: svcForm.icon || "🩺", prefix: svcForm.prefix.toUpperCase().slice(0, 2) || "A", avgMins: Number(svcForm.avgMins) };
    if (svcModal?.mode === "new") { await addService(bizId, data); flash("Service added"); }
    else if (svcModal?.mode === "edit") { await updateService(bizId, svcModal.id, data); flash("Service updated"); }
    setSvcModal(null);
  }

  async function saveAlerts() {
    const hu = Math.max(1, Math.min(50, Number(headsUp) || ALERT_HEADS_UP_DEFAULT));
    const cn = Math.max(1, Math.min(hu, Number(comeNow) || ALERT_COME_NOW_DEFAULT));
    setHeadsUp(hu); setComeNow(cn);
    await updateBusiness(bizId, { alertHeadsUp: hu, alertComeNow: cn });
    flash("Alert timing saved");
  }

  async function saveCountry(code: string) {
    setBizCountry(code);
    await updateBusiness(bizId, { country: code });
    flash(`Country changed · saved`);
  }

  if (!ready) return (
    <div className="flex-1 grid place-items-center">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="grid place-items-center w-14 h-14 rounded-[12px] text-white text-2xl" style={{ background: "linear-gradient(135deg,#315cff,#59d4d1)" }}>⚡</div>
        <div className="font-display text-xl font-bold text-ink">Waitless</div>
        <div className="text-[0.85rem] text-ink-3">Verifying access…</div>
      </div>
    </div>
  );

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-20">
      
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="grid place-items-center w-10 h-10 rounded-[12px] border border-border bg-white text-ink-2 hover:border-acc hover:text-acc transition shadow-sm">&larr;</Link>
          <div>
            <h1 className="font-display text-[1.6rem] leading-tight font-bold text-ink">Business Admin</h1>
            <p className="text-[0.85rem] text-ink-3">{bizName} · Branches, services & features</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SignOut />
          <button onClick={openNew} className="text-[0.85rem] font-bold px-4 py-2.5 rounded-xl text-white hover:opacity-90 transition shadow-[0_8px_20px_rgba(49,92,255,0.25)]" style={{ background: "#315cff" }}>+ New Branch</button>
        </div>
      </div>

      {/* PLAN BANNER */}
      {isTrial && (
        <div className="px-5 py-4 rounded-2xl mb-8 bg-white border border-border shadow-sm flex items-center justify-between flex-wrap gap-4" style={{ borderLeft: "4px solid var(--acc)" }}>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="font-display text-[1.1rem] font-bold text-ink">Pro trial</div>
              <span className="text-[0.7rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-acc/10 text-acc">{daysLeft} days left</span>
            </div>
            <div className="text-[0.85rem] text-ink-3 font-medium">After that you move to the Free plan (1 service · {FREE_MONTHLY_TOKENS.toLocaleString()} tokens/month).</div>
          </div>
        </div>
      )}
      {planNow === "free" && (
        <div className="px-5 py-4 rounded-2xl mb-8 bg-white border border-border shadow-sm flex items-center justify-between flex-wrap gap-4" style={usagePct >= 80 ? { borderColor: "var(--wn)" } : {}}>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="font-display text-[1.1rem] font-bold text-ink">Free plan usage</div>
              {usagePct >= 80 && (
                <span className="text-[0.7rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md" style={{ background: "rgba(247,127,0,.12)", color: "var(--wn)" }}>
                  {usagePct >= 100 ? "Limit Reached" : "Approaching Limit"}
                </span>
              )}
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-surface-2 max-w-[400px]">
              <div className="h-full rounded-full transition-all" style={{ width: `${usagePct}%`, background: usagePct >= 100 ? "var(--dng)" : usagePct >= 80 ? "var(--wn)" : "var(--acc)" }} />
            </div>
            {usagePct >= 80 && (
              <div className="text-[0.8rem] mt-2 font-medium" style={{ color: usagePct >= 100 ? "var(--dng)" : "var(--wn)" }}>
                {usagePct >= 100
                  ? "Limit reached — customers can't take new tokens until next month. Upgrade to Pro."
                  : "You're close to this month's limit — consider upgrading to Pro for unlimited tokens."}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="num text-2xl font-bold text-ink">{usedTokens.toLocaleString()} <span className="text-[1rem] text-ink-3 font-medium">/ {FREE_MONTHLY_TOKENS.toLocaleString()}</span></div>
            <div className="text-[0.75rem] font-bold text-acc mt-1 cursor-pointer hover:underline">Upgrade to Pro &rarr;</div>
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.l} className="bg-white border border-border rounded-[18px] p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-3">{s.l}</span>
              <span className="grid place-items-center w-10 h-10 rounded-[12px] text-[1.1rem]" style={{ background: s.bg }}>{s.icon}</span>
            </div>
            <div className="num text-[2rem] font-display font-bold text-ink leading-none mb-1.5" dangerouslySetInnerHTML={{ __html: s.v.replace('/', '<span class="text-ink-3 text-xl">/</span>') }}></div>
            <div className="text-[0.8rem] font-semibold text-live">{s.c}</div>
          </div>
        ))}
      </div>

      {/* 2 COLUMN LAYOUT */}
      <div className="grid lg:grid-cols-2 gap-8">
        
        {/* LEFT COL (Branches & Services) */}
        <div>
          <h2 className="font-display font-bold text-[1.4rem] text-ink mb-4">Branches</h2>
          <div className="flex flex-col gap-4 mb-8">
            {branches.length === 0 && <div className="text-[0.85rem] text-ink-3 py-4 text-center border border-dashed border-border rounded-xl">No branches added yet. Click + New Branch to get started!</div>}
            {branches.map((b) => {
              const open = b.status === "open";
              return (
                <div key={b.id} className="bg-white border border-border rounded-[20px] p-5 shadow-sm hover:border-acc/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-display text-[1.15rem] font-bold text-ink">{b.name}</div>
                      <div className="text-[0.8rem] text-ink-3 font-medium mt-1">📍 {b.location}</div>
                    </div>
                    <span className="text-[0.7rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
                      style={open ? { background: "rgba(6,214,160,.12)", color: "#06D6A0" } : { background: "rgba(247,127,0,.12)", color: "var(--wn)" }}>
                      ● {cap(b.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center py-4 bg-surface-2 rounded-xl mb-4 border border-border/50">
                    <Metric v={b.inQueue} l="In Queue" />
                    <Metric v={b.counters} l="Counters" />
                    <Metric v={b.avgWait} l="Avg Wait" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => openEdit(b)} className="py-2.5 rounded-xl text-[0.85rem] font-bold border border-border text-ink-2 hover:bg-surface-2 transition">Edit</button>
                    <Link href="/staff" className="flex items-center justify-center py-2.5 rounded-xl text-[0.85rem] font-bold text-white transition shadow-[0_8px_20px_rgba(49,92,255,0.25)] hover:-translate-y-px" style={{ background: "#315cff" }}>View Queue &rsaquo;</Link>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="font-display font-bold text-[1.4rem] text-ink mb-4">Services</h2>
          <div className="flex flex-col gap-3">
            {services.map((s) => (
              <div key={s.id} className="flex items-center gap-4 bg-white border border-border rounded-[16px] p-3 shadow-sm hover:border-acc/30 transition">
                <span className="grid place-items-center w-12 h-12 rounded-[12px] text-2xl bg-surface-2 border border-border/50 shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-[1.05rem] text-ink truncate">{s.name}</div>
                  <div className="text-[0.8rem] text-ink-3 font-medium mt-0.5">Prefix <span className="font-bold text-ink-2">{s.prefix}</span> &middot; ~{s.avgMins} min</div>
                </div>
                <button onClick={() => openEditSvc(s)} className="text-[0.8rem] font-bold px-4 py-2 rounded-xl border border-border text-ink-2 hover:bg-surface-2 mr-1">Edit</button>
              </div>
            ))}
            <button onClick={openNewSvc} className="mt-2 py-3 rounded-[16px] text-[0.9rem] font-bold border border-dashed border-border text-ink-2 hover:bg-surface-2 transition hover:text-acc hover:border-acc/50">+ Add Service</button>
          </div>
        </div>

        {/* RIGHT COL (Features & Toggles) */}
        <div>
          
          <div className="bg-white border border-border rounded-[20px] p-5 mb-6 shadow-sm flex items-center gap-5">
            <div className="w-[96px] h-[96px] rounded-[14px] bg-surface-2 border border-border shrink-0 flex items-center justify-center p-2">
              {qrUrl ? <img src={qrUrl} alt="QR" className="w-full h-full object-contain rounded-md" /> : <div className="w-full h-full border-[2px] border-dashed border-ink-3 rounded-md" />}
            </div>
            <div>
              <div className="font-display text-[1.2rem] font-bold text-ink mb-1.5">Customer QR code</div>
              <div className="text-[0.85rem] text-ink-3 leading-snug font-medium mb-3">Print & display at your counter. Customers scan it to join your queue — no app, no signup.</div>
              <button className="text-[0.8rem] font-bold px-4 py-2 rounded-xl border border-border text-ink-2 hover:bg-surface-2 transition">Download Print Version</button>
            </div>
          </div>

          <div className="bg-white border border-border rounded-[20px] p-5 mb-6 shadow-sm">
            <div className="font-display text-[1.2rem] font-bold text-ink mb-1.5">Country</div>
            <div className="text-[0.85rem] text-ink-3 leading-snug font-medium mb-4">Your business country determines phone format, currency display, and timezone.</div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COUNTRIES.map((c) => {
                const active = c.code === bizCountry;
                return (
                  <button key={c.code} onClick={() => saveCountry(c.code)}
                    className="flex items-center gap-1.5 text-[0.85rem] font-bold px-3 py-2 rounded-xl border transition"
                    style={active
                      ? { background: "var(--al)", borderColor: "var(--acc)", color: "var(--acc)" }
                      : { background: "var(--sf)", borderColor: "var(--bd)", color: "var(--t3)" }}>
                    {c.flag} {c.name}
                    {active && <span className="text-[10px] ml-1 text-acc">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-border rounded-[20px] p-5 mb-6 shadow-sm">
            <div className="font-display text-[1.2rem] font-bold text-ink mb-1.5">Customer alert timing</div>
            <div className="text-[0.85rem] text-ink-3 leading-snug font-medium mb-4">When customers get notified as their turn nears. Counted in <span className="font-bold text-ink">tokens ahead</span>, so it stays accurate even when the queue jumps.</div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <label className="block">
                <span className="block text-[0.75rem] font-bold uppercase tracking-wider text-ink-3 mb-2">First heads-up (tokens away)</span>
                <input type="number" min={1} max={50} value={headsUp} onChange={(e) => setHeadsUp(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-border bg-white text-[0.9rem] font-bold text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(49,92,255,0.1)] transition" />
              </label>
              <label className="block">
                <span className="block text-[0.75rem] font-bold uppercase tracking-wider text-ink-3 mb-2">Come now (tokens away)</span>
                <input type="number" min={1} max={headsUp} value={comeNow} onChange={(e) => setComeNow(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-border bg-white text-[0.9rem] font-bold text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(49,92,255,0.1)] transition" />
              </label>
            </div>
            <button onClick={saveAlerts} className="w-full py-3 rounded-xl font-bold text-white transition hover:opacity-90 shadow-md" style={{ background: "#315cff" }}>Save alert timing</button>
          </div>

          <h2 className="font-display font-bold text-[1.4rem] text-ink mb-4 mt-8">Feature Controls</h2>
          
          {toggleGroups.map((g) => (
            <div key={g.group} className="mb-6">
              <div className="text-[0.75rem] font-bold uppercase tracking-wider text-ink-3 mb-3">{g.group}</div>
              <div className="flex flex-col gap-2.5">
                {g.items.map((it) => {
                  const on = toggles[it.id];
                  return (
                    <div key={it.id} className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-[16px] bg-white border border-border shadow-sm hover:border-acc/30 transition">
                      <div className="flex-1">
                        <div className="text-[0.95rem] font-bold text-ink">{it.label}</div>
                        <div className="text-[0.8rem] text-ink-3 font-medium mt-0.5">{it.desc}</div>
                      </div>
                      <button onClick={() => toggle(it.id, it.label)} role="switch" aria-checked={on}
                        className="relative w-[48px] h-[28px] rounded-full shrink-0 transition-colors"
                        style={{ background: on ? "#315cff" : "#dde3f4" }}>
                        <span className="absolute top-[4px] w-5 h-5 rounded-full bg-white transition-all shadow-md"
                          style={{ left: on ? "24px" : "4px" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

        </div>

      </div>

      {modal && (
        <Modal title={modal.mode === "new" ? "New branch" : "Edit branch"} onClose={() => setModal(null)}>
          <Field label="Branch name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Downtown Branch" /></Field>
          <Field label="Location"><input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Area, City" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Counters"><input type="number" min={1} className={inputCls} value={form.counters} onChange={(e) => setForm({ ...form, counters: Number(e.target.value) })} /></Field>
            <Field label="Status"><select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="open">Open</option><option value="busy">Busy</option><option value="closed">Closed</option></select></Field>
          </div>
          <button onClick={saveBranch} disabled={!form.name.trim()} className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-acc hover:bg-acc-dark disabled:opacity-50 transition shadow-md">{modal.mode === "new" ? "Add branch" : "Save changes"}</button>
        </Modal>
      )}

      {svcModal && (
        <Modal title={svcModal.mode === "new" ? "New service" : "Edit service"} onClose={() => setSvcModal(null)}>
          <Field label="Service name"><input className={inputCls} value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} placeholder="e.g. General Doctor" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Icon"><input className={inputCls} value={svcForm.icon} onChange={(e) => setSvcForm({ ...svcForm, icon: e.target.value })} placeholder="🩺" /></Field>
            <Field label="Prefix"><input className={inputCls} value={svcForm.prefix} onChange={(e) => setSvcForm({ ...svcForm, prefix: e.target.value })} placeholder="A" maxLength={2} /></Field>
            <Field label="Avg min"><input type="number" min={1} className={inputCls} value={svcForm.avgMins} onChange={(e) => setSvcForm({ ...svcForm, avgMins: Number(e.target.value) })} /></Field>
          </div>
          <button onClick={saveService} disabled={!svcForm.name.trim()} className="w-full mt-4 py-3 rounded-xl font-bold text-white bg-acc hover:bg-acc-dark disabled:opacity-50 transition shadow-md">{svcModal.mode === "new" ? "Add service" : "Save changes"}</button>
        </Modal>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 px-5 py-3 rounded-xl text-white text-[0.85rem] font-bold z-50 shadow-[0_10px_30px_rgba(13,27,62,0.4)]" style={{ background: "#0D1B3E" }}>{toast}</div>
      )}
    </main>
  );
}

function Metric({ v, l }: { v: string | number; l: string }) {
  return (
    <div>
      <div className="num text-xl font-bold text-ink">{v}</div>
      <div className="text-[0.7rem] uppercase tracking-wider font-bold text-ink-3 mt-1">{l}</div>
    </div>
  );
}
