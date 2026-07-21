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
  useEffect(() => { if (!bizId) return; QRCode.toDataURL(`https://waitless-online.vercel.app/app?biz=${bizId}`, { width: 220, margin: 1 }).then(setQrUrl).catch(() => {}); }, [bizId]);
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
    { l: "Active Tokens", v: `${tokens.length}`, c: "live total", icon: "🎫", bg: "var(--al)" },
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
    if (modal?.mode === "new") {
      await addBranch(bizId, { name: form.name.trim(), location: form.location.trim(), status: form.status, inQueue: 0, counters: Number(form.counters), avgWait: "—" });
      flash("Branch added");
    } else if (modal?.mode === "edit") {
      await updateBranch(bizId, modal.id, { name: form.name.trim(), location: form.location.trim(), status: form.status, counters: Number(form.counters) });
      flash("Branch updated");
    }
    setModal(null);
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
        <div className="grid place-items-center w-14 h-14 rounded-2xl text-white text-2xl" style={{ background: "linear-gradient(135deg,#4361EE,#818CF8)" }}>⚡</div>
        <div className="font-display text-xl font-bold text-ink">Waitless</div>
        <div className="text-sm text-ink-3">Verifying access…</div>
      </div>
    </div>
  );

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="grid place-items-center w-9 h-9 rounded-[10px] border border-border bg-surface text-ink-2" aria-label="Home">←</Link>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Business Admin</h1>
            <p className="text-xs text-ink-3">{bizName} · Branches, services &amp; features</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SignOut />
          <button onClick={openNew} className="text-[13px] font-semibold px-3.5 py-2 rounded-[10px] text-white bg-acc hover:bg-acc-dark transition">+ New Branch</button>
        </div>
      </div>

      {/* Plan banner: trial countdown, or free-plan usage with 80%/100% warnings */}
      {isTrial && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5" style={{ background: "var(--al)", border: "1px solid var(--acc)" }}>
          <span className="text-lg">⭐</span>
          <div className="text-[13px] text-ink-2">
            <span className="font-bold text-ink">Pro trial — {daysLeft} day{daysLeft === 1 ? "" : "s"} left.</span>{" "}
            After that you move to the Free plan (1 service · {FREE_MONTHLY_TOKENS.toLocaleString()} tokens/month).
          </div>
        </div>
      )}
      {planNow === "free" && (
        <div className="px-4 py-3 rounded-2xl mb-5 bg-surface border" style={{ borderColor: usagePct >= 100 ? "var(--dng)" : usagePct >= 80 ? "var(--wn)" : "var(--bd)" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
            <div className="text-[13px] font-bold text-ink">Free plan · monthly tokens</div>
            <div className="num text-[13px] font-semibold" style={{ color: usagePct >= 100 ? "var(--dng)" : usagePct >= 80 ? "var(--wn)" : "var(--t2)" }}>
              {usedTokens.toLocaleString()} / {FREE_MONTHLY_TOKENS.toLocaleString()}
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-surface-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${usagePct}%`, background: usagePct >= 100 ? "var(--dng)" : usagePct >= 80 ? "var(--wn)" : "var(--acc)" }} />
          </div>
          {usagePct >= 80 && (
            <div className="text-[11.5px] mt-2 font-semibold" style={{ color: usagePct >= 100 ? "var(--dng)" : "var(--wn)" }}>
              {usagePct >= 100
                ? "Limit reached — customers can't take new tokens until next month. Upgrade to Pro for unlimited tokens."
                : "You're close to this month's limit — consider upgrading to Pro for unlimited tokens."}
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map((s) => (
          <div key={s.l} className="bg-surface border border-border rounded-2xl p-4" style={{ boxShadow: "var(--sh)" }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-xs text-ink-3 font-medium leading-tight">{s.l}</span>
              <span className="grid place-items-center w-9 h-9 rounded-[11px] text-base shrink-0" style={{ background: s.bg }}>{s.icon}</span>
            </div>
            <div className="num text-2xl font-bold text-ink leading-none mb-1.5">{s.v}</div>
            <div className="text-[11.5px] font-semibold" style={{ color: "#06D6A0" }}>{s.c}</div>
          </div>
        ))}
      </div>

      {/* 2-col */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Branches */}
        <div>
          <h2 className="font-display font-bold text-ink mb-3">Branches</h2>
          <div className="flex flex-col gap-3">
            {branches.length === 0 && <div className="text-sm text-ink-3 py-3">Loading branches…</div>}
            {branches.map((b) => {
              const open = b.status === "open";
              return (
                <div key={b.id} className="bg-surface border border-border rounded-2xl p-4" style={{ boxShadow: "var(--sh)" }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-display font-bold text-ink">{b.name}</div>
                      <div className="text-xs text-ink-3 mt-0.5">📍 {b.location}</div>
                    </div>
                    <span className="text-[11.5px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                      style={open ? { background: "rgba(6,214,160,.12)", color: "#06D6A0" } : { background: "rgba(247,127,0,.12)", color: "var(--wn)" }}>
                      ● {cap(b.status)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <Metric v={b.inQueue} l="In Queue" />
                    <Metric v={b.counters} l="Counters" />
                    <Metric v={b.avgWait} l="Avg Wait" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => openEdit(b)} className="py-2 rounded-lg text-[12.5px] font-semibold border border-border text-ink-2 hover:bg-surface-2 transition">Edit</button>
                    <Link href="/staff" className="py-2 rounded-lg text-[12.5px] font-semibold border border-border bg-surface-2 text-ink text-center hover:brightness-95 transition">View Queue</Link>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="font-display font-bold text-ink mb-3 mt-6">Services</h2>
          <div className="flex flex-col gap-2">
            {services.map((s) => (
              <div key={s.id} className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3" style={{ boxShadow: "var(--sh)" }}>
                <span className="grid place-items-center w-9 h-9 rounded-lg text-lg bg-surface-2 shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-ink text-sm truncate">{s.name}</div>
                  <div className="text-xs text-ink-3">Prefix {s.prefix} · ~{s.avgMins} min</div>
                </div>
                <button onClick={() => openEditSvc(s)} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-border text-ink-2 hover:bg-surface-2">Edit</button>
              </div>
            ))}
            <button onClick={openNewSvc} className="mt-1 py-2 rounded-xl text-[13px] font-semibold border border-dashed border-border text-ink-2 hover:bg-surface-2 transition">+ Add Service</button>
          </div>
        </div>

        {/* Feature toggles */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="bg-surface border border-border rounded-2xl p-4 mb-5 flex items-center gap-4" style={{ boxShadow: "var(--sh)" }}>
            {qrUrl
              ? <img src={qrUrl} alt="Customer QR code" width={92} height={92} className="rounded-lg shrink-0" />
              : <div className="w-[92px] h-[92px] rounded-lg bg-surface-2 shrink-0" />}
            <div>
              <div className="font-display font-bold text-ink mb-1">Customer QR code</div>
              <div className="text-xs text-ink-3 leading-snug">Print &amp; display at your counter. Customers scan it to join your queue — no app, no signup.</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-4 mb-5" style={{ boxShadow: "var(--sh)" }}>
            <div className="font-display font-bold text-ink mb-1">Country</div>
            <div className="text-xs text-ink-3 leading-snug mb-3">Your business country determines phone format, currency display, and timezone.</div>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COUNTRIES.map((c) => {
                const active = c.code === bizCountry;
                return (
                  <button key={c.code} onClick={() => saveCountry(c.code)}
                    className="flex items-center gap-1.5 text-[13px] font-semibold px-3 py-2 rounded-xl border transition"
                    style={active
                      ? { background: "var(--al)", borderColor: "var(--acc)", color: "var(--acc)" }
                      : { background: "var(--sf)", borderColor: "var(--bd)", color: "var(--t3)" }}>
                    {c.flag} {c.name}
                    {active && <span className="text-[10px] ml-1">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-4 mb-5" style={{ boxShadow: "var(--sh)" }}>
            <div className="font-display font-bold text-ink mb-1">Customer alert timing</div>
            <div className="text-xs text-ink-3 leading-snug mb-3">When customers get notified as their turn nears. Counted in <span className="font-semibold">tokens ahead</span>, so it stays accurate even when the queue jumps. Set higher for slow services (doctors), lower for fast ones (a bank counter).</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First heads-up (tokens away)">
                <input type="number" min={1} max={50} className={inputCls} value={headsUp} onChange={(e) => setHeadsUp(Number(e.target.value))} />
              </Field>
              <Field label="Come now (tokens away)">
                <input type="number" min={1} max={headsUp} className={inputCls} value={comeNow} onChange={(e) => setComeNow(Number(e.target.value))} />
              </Field>
            </div>
            <div className="text-[11.5px] text-ink-3 mb-3">Alerts fire at <span className="num font-semibold text-ink-2">{headsUp}</span> away, <span className="num font-semibold text-ink-2">{comeNow}</span> away, and again when it&apos;s their turn.</div>
            <button onClick={saveAlerts} className="w-full py-2.5 rounded-xl font-semibold text-white bg-acc hover:bg-acc-dark transition">Save alert timing</button>
          </div>

          <h2 className="font-display font-bold text-ink mb-3">Feature Controls</h2>
          {toggleGroups.map((g) => (
            <div key={g.group} className="mb-4">
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-ink-3 mb-2">{g.group}</div>
              <div className="flex flex-col gap-2">
                {g.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-surface-2 border border-border">
                    <div className="flex-1">
                      <div className="text-[13.5px] font-medium text-ink">{it.label}</div>
                      <div className="text-[11.5px] text-ink-3 mt-0.5">{it.desc}</div>
                    </div>
                    <Toggle on={toggles[it.id]} onClick={() => toggle(it.id, it.label)} />
                  </div>
                ))}
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
          <button onClick={saveBranch} disabled={!form.name.trim()} className="w-full mt-2 py-2.5 rounded-xl font-semibold text-white bg-acc hover:bg-acc-dark disabled:opacity-50 transition">{modal.mode === "new" ? "Add branch" : "Save changes"}</button>
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
          <button onClick={saveService} disabled={!svcForm.name.trim()} className="w-full mt-2 py-2.5 rounded-xl font-semibold text-white bg-acc hover:bg-acc-dark disabled:opacity-50 transition">{svcModal.mode === "new" ? "Add service" : "Save changes"}</button>
        </Modal>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 px-4 py-2.5 rounded-xl text-white text-sm font-semibold z-50 shadow-lg" style={{ background: "#0D1B3E" }}>{toast}</div>
      )}
    </main>
  );
}

function Metric({ v, l }: { v: string | number; l: string }) {
  return (
    <div>
      <div className="num text-xl font-bold text-ink">{v}</div>
      <div className="text-[11px] text-ink-3 mt-0.5">{l}</div>
    </div>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on}
      className="relative w-[46px] h-[26px] rounded-full shrink-0 transition-colors"
      style={{ background: on ? "var(--acc)" : "#D1D5DB" }}>
      <span className="absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all shadow"
        style={{ left: on ? "23px" : "3px" }} />
    </button>
  );
}
