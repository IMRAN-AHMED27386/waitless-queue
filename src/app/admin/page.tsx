"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listenBusiness, setFeatureToggle, listenBranches, listenBusinessTokens, listenAllServices,
  addBranch, updateBranch, removeBranch, addService, updateService, removeService, updateBusiness,
  ALERT_HEADS_UP_DEFAULT, ALERT_COME_NOW_DEFAULT,
  effectivePlan, tokensUsedThisMonth, trialDaysLeft, FREE_MONTHLY_TOKENS,
  listenStaff, addStaffUserRecord, removeStaffUserRecord,
  listenRooms, addRoom, updateRoom, removeRoom,
  type Branch, type HistTok, type Svc, type Biz, type Room,
} from "@/lib/db";
import { useAuthGuard, signOutUser } from "@/lib/auth";
import { createStaffAuthAccount } from "@/lib/auth-secondary";
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
  const router = useRouter();
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomModal, setRoomModal] = useState<null | { mode: "new" } | { mode: "edit"; id: string }>(null);
  const [roomForm, setRoomForm] = useState({ name: "" });
  const [staff, setStaff] = useState<any[]>([]);
  const [staffModal, setStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", email: "", pass: "" });

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

  useEffect(() => {
    if (!bizId) return;
    const u1 = listenBranches(bizId, setBranches);
    const u2 = listenBusinessTokens(bizId, setTokens);
    const u3 = listenAllServices((all) => setServices(all.filter((s) => s.businessId === bizId).sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name))));
    const u4 = listenStaff(bizId, setStaff);
    const u5 = listenRooms(bizId, setRooms);
    return () => { u1(); u2(); u3(); u4(); u5(); };
  }, [bizId]);

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

  function flash(msg: string) { setToast(msg); window.setTimeout(() => setToast(null), 2000); }
  function toggle(id: string, label: string) {
    const next = !toggles[id];
    setToggles((t) => ({ ...t, [id]: next }));
    setFeatureToggle(bizId, id, next);
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
    } catch (error: any) { console.error(error); flash("Error: " + (error.message || "Failed to save branch")); }
  }

  function openNewSvc() {
    if (planNow === "free" && services.length >= 1) { flash("Free plan includes 1 service — upgrade to Pro to add more"); return; }
    setSvcForm({ name: "", icon: "🩺", prefix: "A", avgMins: 5 }); setSvcModal({ mode: "new" });
  }
  function openEditSvc(s: Svc) { setSvcForm({ name: s.name, icon: s.icon, prefix: s.prefix, avgMins: s.avgMins }); setSvcModal({ mode: "edit", id: s.id }); }
  async function saveSvc(e: React.FormEvent) {
    e.preventDefault();
    if (!svcForm.name.trim()) return setToast("Service name required");
    const data = { ...svcForm, avgMins: Number(svcForm.avgMins) };
    if (svcModal?.mode === "new") { await addService(bizId, data); flash("Service added"); }
    else if (svcModal?.mode === "edit") { await updateService(bizId, svcModal.id, data); flash("Service updated"); }
    setSvcModal(null);
  }

  async function moveService(index: number, dir: -1 | 1) {
    if (index + dir < 0 || index + dir >= services.length) return;
    
    // Assign an explicit order to ALL items if they don't have one
    const updates = services.map((s, i) => ({ id: s.id, order: s.order ?? i }));
    
    // Swap the two items
    const temp = updates[index].order;
    updates[index].order = updates[index + dir].order;
    updates[index + dir].order = temp;
    
    // Only update the two that changed
    await Promise.all([
      updateService(bizId, updates[index].id, { order: updates[index].order }),
      updateService(bizId, updates[index + dir].id, { order: updates[index + dir].order })
    ]);
  }

  function openNewRoom() { setRoomForm({ name: "" }); setRoomModal({ mode: "new" }); }
  function openEditRoom(r: Room) { setRoomForm({ name: r.name }); setRoomModal({ mode: "edit", id: r.id }); }
  async function saveRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!roomForm.name.trim()) return setToast("Room name required");
    try {
      const data = { name: roomForm.name.trim() };
      if (roomModal?.mode === "new") { await addRoom(bizId, data); flash("Room added"); }
      else if (roomModal?.mode === "edit") { await updateRoom(bizId, roomModal.id, data); flash("Room updated"); }
      setRoomModal(null);
    } catch (error: any) {
      console.error(error);
      flash("Error: " + (error.message || "Failed to save room"));
    }
  }

  async function saveStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!staffForm.name.trim() || !staffForm.email.trim() || !staffForm.pass.trim()) return setToast("All fields required");
    setToast("Creating account...");
    try {
      const uid = await createStaffAuthAccount(staffForm.email, staffForm.pass);
      await addStaffUserRecord(uid, { email: staffForm.email, name: staffForm.name, businessId: bizId });
      flash("Staff account created");
      setStaffModal(false);
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setToast("This email is already registered to an account.");
      } else {
        setToast(err.message || "Error creating staff account");
      }
    }
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

  async function doSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  if (!ready) return (
    <div className="flex-1 h-screen grid place-items-center bg-[#f5f8fd]">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="grid place-items-center w-16 h-16 rounded-[14px] text-white text-3xl shadow-xl" style={{ background: "linear-gradient(135deg,#315cff,#59d4d1)" }}>⚡</div>
        <div className="font-display text-2xl font-bold text-ink tracking-tight mt-2">Waitless</div>
        <div className="text-[0.95rem] font-medium text-ink-3">Verifying premium access…</div>
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
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] bg-white/10 text-white font-semibold transition shadow-sm border border-white/5">🏢 Dashboard</Link>
            <Link href="/analytics" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] hover:bg-white/5 text-white/70 hover:text-white transition font-semibold">📊 Analytics</Link>
            <Link href="/board" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] hover:bg-white/5 text-white/70 hover:text-white transition font-semibold">📺 TV Board</Link>
          </nav>
        </div>
        
        <div className="p-7 pt-0">
          <div className="px-5 py-4 rounded-[16px] bg-white/5 border border-white/10 mb-5 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
             <div className="text-[0.75rem] uppercase tracking-wider text-white/60 font-bold mb-1.5">Plan</div>
             <div className="text-[1.1rem] font-bold flex items-center justify-between">
               {cap(planNow)}
               {isTrial && <span className="text-[0.7rem] text-[#06d6a0] bg-[#06d6a0]/20 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">{daysLeft}d left</span>}
             </div>
          </div>
          <button onClick={doSignOut} className="w-full text-[0.85rem] font-bold px-4 py-3 rounded-[12px] border border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white transition">
            Sign out
          </button>
        </div>
      </div>

      {/* ════════ MAIN DASHBOARD ════════ */}
      <main className="flex-1 h-full overflow-y-auto px-6 py-8 md:px-12 md:py-12 relative z-10">
        
        <div className="max-w-[1000px] mx-auto">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-[2.2rem] font-extrabold text-ink tracking-tight leading-none mb-2">Dashboard</h1>
              <p className="text-[0.95rem] font-medium text-ink-3">Manage branches, services, and advanced features.</p>
            </div>
            <button onClick={openNew} className="text-[0.9rem] font-bold px-6 py-3.5 rounded-[14px] text-white transition hover:-translate-y-0.5 shadow-[0_12px_24px_rgba(49,92,255,0.25)]" style={{ background: "#315cff" }}>+ New Branch</button>
          </div>

          {/* PLAN BANNERS */}
          {planNow === "free" && (
            <div className="px-6 py-5 rounded-[20px] mb-8 bg-white border border-border shadow-sm flex items-center justify-between flex-wrap gap-5 transition-all" style={usagePct >= 80 ? { borderColor: "var(--wn)" } : {}}>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="font-display text-[1.15rem] font-bold text-ink">Free plan usage</div>
                  {usagePct >= 80 && (
                    <span className="text-[0.7rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md" style={{ background: "rgba(247,127,0,.12)", color: "var(--wn)" }}>
                      {usagePct >= 100 ? "Limit Reached" : "Approaching Limit"}
                    </span>
                  )}
                </div>
                <div className="h-2.5 rounded-full overflow-hidden bg-surface-2 max-w-[400px]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${usagePct}%`, background: usagePct >= 100 ? "var(--dng)" : usagePct >= 80 ? "var(--wn)" : "var(--acc)" }} />
                </div>
                {usagePct >= 80 && (
                  <div className="text-[0.85rem] mt-2.5 font-medium" style={{ color: usagePct >= 100 ? "var(--dng)" : "var(--wn)" }}>
                    {usagePct >= 100
                      ? "Limit reached — customers can't take new tokens until next month. Upgrade to Pro."
                      : "You're close to this month's limit — consider upgrading to Pro for unlimited tokens."}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="num text-[1.6rem] font-extrabold text-ink">{usedTokens.toLocaleString()} <span className="text-[1.1rem] text-ink-3 font-medium">/ {FREE_MONTHLY_TOKENS.toLocaleString()}</span></div>
                <div className="text-[0.8rem] font-bold text-acc mt-1.5 cursor-pointer hover:underline">Upgrade to Pro &rarr;</div>
              </div>
            </div>
          )}

          {/* STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {stats.map((s) => (
              <div key={s.l} className="bg-white border border-border rounded-[22px] p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-40 -translate-y-1/2 translate-x-1/2" style={{ background: s.bg }} />
                <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
                  <span className="text-[0.75rem] font-bold uppercase tracking-widest text-ink-3">{s.l}</span>
                  <span className="grid place-items-center w-10 h-10 rounded-[12px] text-[1.1rem] shadow-sm" style={{ background: s.bg }}>{s.icon}</span>
                </div>
                <div className="num text-[2.2rem] font-display font-extrabold text-ink leading-none mb-2 relative z-10" dangerouslySetInnerHTML={{ __html: s.v.replace('/', '<span class="text-ink-3/50 text-2xl font-semibold">/</span>') }}></div>
                <div className="text-[0.8rem] font-bold text-live relative z-10">{s.c}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-8">
            
            {/* LEFT COL (Branches & Services) */}
            <div className="flex flex-col gap-10">
              
              {/* BRANCHES */}
              <section>
                <h2 className="font-display font-bold text-[1.4rem] text-ink mb-5">Branches</h2>
                <div className="flex flex-col gap-5">
                  {branches.length === 0 && <div className="text-[0.9rem] font-medium text-ink-3 py-8 text-center border-2 border-dashed border-border rounded-[24px]">No branches added yet. Click + New Branch to get started!</div>}
                  {branches.map((b) => {
                    const open = b.status === "open";
                    return (
                      <div key={b.id} className="bg-white border border-border rounded-[24px] p-6 shadow-sm hover:shadow-md hover:border-acc/30 transition-all">
                        <div className="flex items-start justify-between mb-5">
                          <div>
                            <div className="font-display text-[1.25rem] font-bold text-ink">{b.name}</div>
                            <div className="text-[0.85rem] text-ink-3 font-medium mt-1 flex items-center gap-1.5">
                              <span className="opacity-70">📍</span> {b.location}
                            </div>
                          </div>
                          <span className="text-[0.7rem] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border"
                            style={open ? { background: "rgba(6,214,160,.1)", borderColor: "rgba(6,214,160,.2)", color: "#06D6A0" } : { background: "rgba(247,127,0,.1)", borderColor: "rgba(247,127,0,.2)", color: "var(--wn)" }}>
                            ● {cap(b.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-3 text-center py-5 bg-surface-2/60 rounded-[16px] mb-5 border border-border/50">
                          <Metric v={b.inQueue} l="In Queue" />
                          <Metric v={b.counters} l="Counters" />
                          <Metric v={b.avgWait} l="Avg Wait" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => openEdit(b)} className="py-3 rounded-[12px] text-[0.85rem] font-bold border border-border bg-white text-ink-2 hover:bg-surface-2 hover:shadow-sm transition">Edit Branch</button>
                          <Link href="/board" className="flex items-center justify-center py-3 rounded-[12px] text-[0.85rem] font-bold text-white transition shadow-[0_8px_20px_rgba(49,92,255,0.2)] hover:-translate-y-px hover:shadow-[0_12px_24px_rgba(49,92,255,0.3)]" style={{ background: "#315cff" }}>View on Board &rsaquo;</Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* SERVICES */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-[1.4rem] text-ink">Services</h2>
                  <button onClick={openNewSvc} className="text-[0.8rem] font-bold text-acc hover:underline">+ Add Service</button>
                </div>
                <div className="flex flex-col gap-4">
                  {services.map((s, index) => (
                    <div key={s.id} className="flex items-center gap-4 bg-white border border-border rounded-[20px] p-4 shadow-sm hover:border-acc/30 hover:shadow-md transition-all group">
                      <div className="flex flex-col gap-1 pr-2 shrink-0 border-r border-border/50">
                        <button onClick={() => moveService(index, -1)} disabled={index === 0} className="w-6 h-6 grid place-items-center text-ink-3 hover:text-ink hover:bg-surface-2 rounded disabled:opacity-30">▲</button>
                        <button onClick={() => moveService(index, 1)} disabled={index === services.length - 1} className="w-6 h-6 grid place-items-center text-ink-3 hover:text-ink hover:bg-surface-2 rounded disabled:opacity-30">▼</button>
                      </div>
                      <span className="grid place-items-center w-14 h-14 rounded-[14px] text-2xl bg-surface-2 border border-border/60 shrink-0 shadow-sm group-hover:scale-105 transition-transform">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display font-bold text-[1.1rem] text-ink truncate mb-0.5">{s.name}</div>
                        <div className="text-[0.85rem] text-ink-3 font-medium">Prefix <span className="font-bold text-ink-2 px-1.5 py-0.5 rounded bg-surface border border-border/50">{s.prefix}</span> &middot; ~{s.avgMins} min</div>
                      </div>
                      <button onClick={() => openEditSvc(s)} className="text-[0.8rem] font-bold px-4 py-2.5 rounded-[10px] border border-border bg-white text-ink-2 hover:bg-surface-2 transition shadow-sm">Edit</button>
                    </div>
                  ))}
                </div>
              </section>

              {/* ROOMS */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-[1.4rem] text-ink">Doctor's Rooms</h2>
                  <button onClick={openNewRoom} className="text-[0.8rem] font-bold text-acc hover:underline">+ Add Room</button>
                </div>
                <div className="flex flex-col gap-4">
                  {rooms.length === 0 && <div className="text-[0.9rem] font-medium text-ink-3 py-6 text-center border border-dashed border-border rounded-[20px]">No rooms configured.</div>}
                  {rooms.map((r) => (
                    <div key={r.id} className="flex items-center justify-between bg-white border border-border rounded-[20px] p-4 shadow-sm hover:border-acc/30 transition-all">
                      <div className="font-display font-bold text-[1.1rem] text-ink">{r.name}</div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEditRoom(r)} className="text-[0.8rem] font-bold px-4 py-2.5 rounded-[10px] border border-border bg-white text-ink-2 hover:bg-surface-2 transition shadow-sm">Edit</button>
                        <button onClick={async () => {
                          if (confirm(`Remove ${r.name}?`)) {
                            await removeRoom(bizId, r.id);
                            flash("Room removed");
                          }
                        }} className="text-[0.8rem] font-bold text-wn hover:underline">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* STAFF */}
              <section>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-[1.4rem] text-ink">Staff Accounts</h2>
                  <button onClick={() => { setStaffForm({ name: "", email: "", pass: "" }); setStaffModal(true); }} className="text-[0.8rem] font-bold text-acc hover:underline">+ Add Staff</button>
                </div>
                <div className="flex flex-col gap-4">
                  {staff.length === 0 && <div className="text-[0.9rem] font-medium text-ink-3 py-6 text-center border border-dashed border-border rounded-[20px]">No staff accounts created.</div>}
                  {staff.map((st) => (
                    <div key={st.id} className="flex items-center justify-between bg-white border border-border rounded-[20px] p-4 shadow-sm hover:border-acc/30 transition-all">
                      <div>
                        <div className="font-display font-bold text-[1.1rem] text-ink">{st.name}</div>
                        <div className="text-[0.85rem] text-ink-3 font-medium">{st.email}</div>
                      </div>
                      <button onClick={async () => {
                        if (confirm(`Remove ${st.name}?`)) {
                          await removeStaffUserRecord(st.id);
                          flash("Staff removed");
                        }
                      }} className="text-[0.8rem] font-bold text-wn hover:underline">Remove</button>
                    </div>
                  ))}
                </div>
              </section>

            </div>

            {/* RIGHT COL (Settings & QR) */}
            <div className="flex flex-col gap-6">
              
              {/* QR CODE CARD */}
              <div className="bg-white border border-border rounded-[24px] p-6 shadow-sm flex flex-col items-center text-center">
                <div className="w-[140px] h-[140px] rounded-[20px] bg-surface-2 border-2 border-border/60 p-2.5 mb-5 shadow-sm">
                  {qrUrl ? <img src={qrUrl} alt="QR" className="w-full h-full object-contain rounded-[12px]" /> : <div className="w-full h-full border-[2px] border-dashed border-ink-3/30 rounded-[12px]" />}
                </div>
                <div className="font-display text-[1.2rem] font-bold text-ink mb-2">Customer QR code</div>
                <div className="text-[0.85rem] text-ink-3 leading-relaxed font-medium mb-5 px-2">Print & display at your counter. Customers scan it to join your queue — no app, no signup.</div>
                <button onClick={async () => {
                  if (!qrUrl) return;
                  const canvas = document.createElement("canvas");
                  canvas.width = 400;
                  canvas.height = 550;
                  const ctx = canvas.getContext("2d");
                  if (!ctx) return;

                  // Background
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);

                  // Border
                  ctx.strokeStyle = "#e2e8f0";
                  ctx.lineWidth = 4;
                  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

                  // Header
                  ctx.fillStyle = "#1c0a30";
                  ctx.font = "bold 26px Inter, sans-serif";
                  ctx.textAlign = "center";
                  ctx.fillText(bizName, canvas.width / 2, 60);
                  
                  ctx.fillStyle = "#7209b7";
                  ctx.font = "bold 16px Inter, sans-serif";
                  ctx.fillText("SCAN TO JOIN QUEUE", canvas.width / 2, 90);

                  // Image
                  const img = new Image();
                  img.src = qrUrl;
                  await new Promise(r => img.onload = r);
                  ctx.drawImage(img, 50, 110, 300, 300);

                  // Footer
                  ctx.fillStyle = "#1c0a30";
                  ctx.font = "bold 16px Inter, sans-serif";
                  ctx.fillText("No app download required.", canvas.width / 2, 450);
                  
                  ctx.fillStyle = "#64748b";
                  ctx.font = "14px Inter, sans-serif";
                  ctx.fillText("Wait anywhere and track your", canvas.width / 2, 475);
                  ctx.fillText("live position on your phone.", canvas.width / 2, 495);

                  // Powered by Waitless (Branding)
                  ctx.fillStyle = "#94a3b8";
                  ctx.font = "12px Inter, sans-serif";
                  ctx.fillText("Powered by ⚡ Waitless", canvas.width / 2, 530);

                  // Download
                  const a = document.createElement("a");
                  a.href = canvas.toDataURL("image/png");
                  a.download = `${bizName.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
                  a.click();
                }} className="w-full text-[0.85rem] font-bold px-4 py-3 rounded-[12px] border border-border bg-white text-ink-2 hover:bg-surface-2 transition shadow-sm">Download Print Version</button>
              </div>

              {/* TIMING CARD */}
              <div className="bg-white border border-border rounded-[24px] p-6 shadow-sm">
                <div className="font-display text-[1.1rem] font-bold text-ink mb-2">Alert Timing</div>
                <div className="text-[0.8rem] text-ink-3 leading-relaxed font-medium mb-5">When customers get notified. Counted in <span className="font-bold text-ink">tokens ahead</span>.</div>
                <div className="flex flex-col gap-4 mb-5">
                  <label className="block">
                    <span className="block text-[0.7rem] font-bold uppercase tracking-wider text-ink-3 mb-2">Heads-up (tokens away)</span>
                    <input type="number" min={1} max={50} value={headsUp} onChange={(e) => setHeadsUp(Number(e.target.value))} className="w-full px-4 py-3 rounded-[12px] border border-border bg-surface-2/50 text-[0.9rem] font-bold text-ink outline-none focus:border-acc focus:bg-white focus:shadow-[0_0_0_3px_rgba(49,92,255,0.1)] transition" />
                  </label>
                  <label className="block">
                    <span className="block text-[0.7rem] font-bold uppercase tracking-wider text-ink-3 mb-2">Come now (tokens away)</span>
                    <input type="number" min={1} max={headsUp} value={comeNow} onChange={(e) => setComeNow(Number(e.target.value))} className="w-full px-4 py-3 rounded-[12px] border border-border bg-surface-2/50 text-[0.9rem] font-bold text-ink outline-none focus:border-acc focus:bg-white focus:shadow-[0_0_0_3px_rgba(49,92,255,0.1)] transition" />
                  </label>
                </div>
                <button onClick={saveAlerts} className="w-full py-3 rounded-[12px] font-bold text-white transition hover:opacity-90 shadow-[0_8px_16px_rgba(49,92,255,0.2)]" style={{ background: "#315cff" }}>Save timing</button>
              </div>

              {/* COUNTRY */}
              <div className="bg-white border border-border rounded-[24px] p-6 shadow-sm">
                <div className="font-display text-[1.1rem] font-bold text-ink mb-2">Country</div>
                <div className="flex flex-wrap gap-2.5 mt-4">
                  {DEFAULT_COUNTRIES.map((c) => {
                    const active = c.code === bizCountry;
                    return (
                      <button key={c.code} onClick={() => saveCountry(c.code)}
                        className="flex items-center gap-1.5 text-[0.8rem] font-bold px-3 py-2 rounded-[10px] border transition"
                        style={active
                          ? { background: "rgba(49,92,255,.08)", borderColor: "var(--acc)", color: "var(--acc)" }
                          : { background: "var(--sf)", borderColor: "var(--bd)", color: "var(--t3)" }}>
                        {c.flag} {c.name}
                        {active && <span className="text-[10px] ml-1 text-acc">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TOGGLES */}
              <div className="bg-white border border-border rounded-[24px] p-6 shadow-sm">
                <div className="font-display text-[1.1rem] font-bold text-ink mb-5">Features</div>
                {toggleGroups.map((g) => (
                  <div key={g.group} className="mb-6 last:mb-0">
                    <div className="text-[0.7rem] font-bold uppercase tracking-widest text-ink-3 mb-3">{g.group}</div>
                    <div className="flex flex-col gap-1">
                      {g.items.map((it) => {
                        const on = toggles[it.id];
                        return (
                          <div key={it.id} className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0 group">
                            <div className="flex-1">
                              <div className="text-[0.9rem] font-bold text-ink group-hover:text-acc transition-colors">{it.label}</div>
                            </div>
                            <button onClick={() => toggle(it.id, it.label)} role="switch" aria-checked={on}
                              className="relative w-[44px] h-[24px] rounded-full shrink-0 transition-colors"
                              style={{ background: on ? "#315cff" : "#dde3f4" }}>
                              <span className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all shadow-sm"
                                style={{ left: on ? "23px" : "3px" }} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

      </main>

      {/* MODALS */}
      {modal && (
        <Modal title={modal.mode === "new" ? "New branch" : "Edit branch"} onClose={() => setModal(null)}>
          <Field label="Branch name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Downtown Branch" /></Field>
          <Field label="Location"><input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Area, City" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Counters"><input type="number" min={1} className={inputCls} value={form.counters} onChange={(e) => setForm({ ...form, counters: Number(e.target.value) })} /></Field>
            <Field label="Status"><select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="open">Open</option><option value="busy">Busy</option><option value="closed">Closed</option></select></Field>
          </div>
          <button onClick={saveBranch} disabled={!form.name.trim()} className="w-full mt-6 py-3.5 rounded-[14px] font-bold text-white bg-acc hover:bg-acc-dark disabled:opacity-50 transition shadow-md">{modal.mode === "new" ? "Add branch" : "Save changes"}</button>
          {modal.mode === "edit" && (
            <button onClick={async () => {
              if (confirm("Are you sure you want to delete this branch?")) {
                await removeBranch(bizId!, modal.id);
                setModal(null);
                flash("Branch deleted");
              }
            }} className="w-full mt-3 py-3.5 rounded-[14px] font-bold text-danger border border-danger hover:bg-danger/10 transition shadow-sm">Delete Branch</button>
          )}
        </Modal>
      )}

      {svcModal && (
        <Modal title={svcModal.mode === "new" ? "New service" : "Edit service"} onClose={() => setSvcModal(null)}>
          <form onSubmit={saveSvc} className="flex flex-col gap-4 mt-2">
            <Field label="Service name"><input className={inputCls} value={svcForm.name} onChange={(e) => setSvcForm({ ...svcForm, name: e.target.value })} placeholder="e.g. General Doctor" required /></Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Icon"><input className={inputCls} value={svcForm.icon} onChange={(e) => setSvcForm({ ...svcForm, icon: e.target.value })} placeholder="🩺" required /></Field>
              <Field label="Prefix"><input className={inputCls} value={svcForm.prefix} onChange={(e) => setSvcForm({ ...svcForm, prefix: e.target.value })} placeholder="A" maxLength={2} required /></Field>
              <Field label="Avg min"><input type="number" min={1} className={inputCls} value={svcForm.avgMins} onChange={(e) => setSvcForm({ ...svcForm, avgMins: Number(e.target.value) })} required /></Field>
            </div>
            <button className="w-full mt-6 py-3.5 rounded-[14px] font-bold text-white bg-acc hover:bg-acc-dark transition shadow-md">{svcModal.mode === "new" ? "Add service" : "Save changes"}</button>
            {svcModal.mode === "edit" && (
              <button type="button" onClick={async () => {
                if (confirm("Are you sure you want to delete this service?")) {
                  await removeService(bizId!, svcModal.id);
                  setSvcModal(null);
                  flash("Service deleted");
                }
              }} className="w-full mt-3 py-3.5 rounded-[14px] font-bold text-danger border border-danger hover:bg-danger/10 transition shadow-sm">Delete Service</button>
            )}
          </form>
        </Modal>
      )}

      {/* STAFF MODAL */}
      {staffModal && (
        <Modal onClose={() => setStaffModal(false)} title="Add Staff Account">
          <form onSubmit={saveStaff} className="flex flex-col gap-4 mt-2">
            <Field label="Staff Name"><input className={inputCls} placeholder="e.g. Counter 1" value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} required /></Field>
            <Field label="Staff Email"><input type="email" className={inputCls} placeholder="staff@business.com" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required /></Field>
            <Field label="Password"><input type="password" minLength={6} className={inputCls} placeholder="At least 6 characters" value={staffForm.pass} onChange={(e) => setStaffForm({ ...staffForm, pass: e.target.value })} required /></Field>
            <button className="w-full mt-4 py-3.5 rounded-[14px] font-bold text-white transition hover:shadow-lg hover:-translate-y-px" style={{ background: "#315cff" }}>Create Staff Account</button>
          </form>
        </Modal>
      )}

      {roomModal && (
        <Modal title={roomModal.mode === "new" ? "Add Room" : "Edit Room"} onClose={() => setRoomModal(null)}>
          <form onSubmit={saveRoom} className="flex flex-col gap-4">
            <Field label="Room Name (e.g. Room 101, Dr. Smith)">
              <input value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} className={inputCls} placeholder="Room 101" autoFocus />
            </Field>
            <div className="flex gap-3 mt-2">
              <button type="button" onClick={() => setRoomModal(null)} className="flex-1 py-[14px] rounded-xl text-[0.92rem] font-bold border border-border text-ink-2 bg-white hover:bg-surface-2 transition shadow-sm">Cancel</button>
              <button type="submit" className="flex-1 py-[14px] rounded-xl text-[0.92rem] font-bold text-white bg-acc hover:bg-acc/90 transition shadow-sm">Save</button>
            </div>
          </form>
        </Modal>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-8 px-6 py-3.5 rounded-[14px] text-white text-[0.9rem] font-bold z-50 shadow-[0_12px_32px_rgba(10,17,40,0.4)] transition-all animate-in slide-in-from-bottom-4" style={{ background: "#0a1128" }}>{toast}</div>
      )}
    </div>
  );
}

function Metric({ v, l }: { v: string | number; l: string }) {
  return (
    <div>
      <div className="num text-[1.4rem] font-extrabold text-ink">{v}</div>
      <div className="text-[0.65rem] uppercase tracking-widest font-bold text-ink-3 mt-1.5">{l}</div>
    </div>
  );
}
