"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listenBusinesses, addBusiness, updateBusiness } from "@/lib/db";
import { useAuthGuard, signOutUser } from "@/lib/auth";
import Modal, { Field, inputCls } from "@/components/Modal";
import { DEFAULT_COUNTRIES, countryByCode } from "@/lib/countries";

type Row = {
  id: string; name: string; category: string; categoryIcon: string; country?: string; location: string;
  plan?: string; status?: string; monthlyTokens?: number;
  paidUntil?: string; billingCycle?: string;
  waEnabled?: boolean; waPaidCount?: number; waPaidMonthKey?: string;
};

const WA_PRICE_INR = 0.25;
const curMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const waPaidThisMonth = (r: Row) => (r.waPaidMonthKey === curMonthKey() ? r.waPaidCount ?? 0 : 0);

const planStyle: Record<string, React.CSSProperties> = {
  free: { background: "rgba(148,163,184,.15)", color: "var(--t3)" },
  pro: { background: "rgba(49,92,255,.1)", color: "#315cff" },
  enterprise: { background: "rgba(114,9,183,.1)", color: "#7209b7" },
};
const planPrice: Record<string, number> = { free: 0, pro: 49, enterprise: 199 };
const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : "—");
const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
const categories = ["Hospitals", "Clinics", "Banks", "Passport Office", "Restaurants"];
const catIcon: Record<string, string> = { Hospitals: "🏥", Clinics: "💊", Banks: "🏦", "Passport Office": "🛂", Restaurants: "🍽️" };

const isPaidPlan = (plan?: string) => plan === "pro" || plan === "enterprise";
const priceFor = (plan?: string, cycle?: string) => planPrice[plan ?? "free"] * (cycle === "yearly" ? 12 : 1);
const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
function addCycle(from: Date, cycle?: string) {
  const d = new Date(from);
  if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

type BillState = "free" | "trial" | "suspended" | "unbilled" | "overdue" | "paid";
function billStateOf(r: Row): { state: BillState; until: Date | null; daysLeft: number | null } {
  const until = r.paidUntil ? new Date(r.paidUntil) : null;
  const daysLeft = until ? Math.ceil((until.getTime() - Date.now()) / 86400000) : null;
  if (!isPaidPlan(r.plan)) return { state: "free", until, daysLeft };
  if (r.status === "suspended") return { state: "suspended", until, daysLeft };
  if (r.status === "trial") return { state: "trial", until, daysLeft };
  if (!until) return { state: "unbilled", until, daysLeft };
  return { state: until.getTime() < Date.now() ? "overdue" : "paid", until, daysLeft };
}
const billStyle: Record<BillState, React.CSSProperties> = {
  free: { background: "rgba(148,163,184,.15)", color: "var(--t3)" },
  trial: { background: "rgba(49,92,255,.1)", color: "#315cff" },
  paid: { background: "rgba(6,214,160,.12)", color: "#06D6A0" },
  unbilled: { background: "rgba(247,127,0,.12)", color: "var(--wn)" },
  overdue: { background: "rgba(239,35,60,.12)", color: "var(--dng)" },
  suspended: { background: "rgba(239,35,60,.12)", color: "var(--dng)" },
};

export default function Super() {
  const { ready } = useAuthGuard(["super"]);
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("All Plans");
  const [modal, setModal] = useState<null | { mode: "new" } | { mode: "manage"; row: Row }>(null);
  const [form, setForm] = useState({ name: "", category: "Hospitals", country: "US", location: "", plan: "free", status: "active", billingCycle: "monthly" });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => listenBusinesses((b) => { setRows(b as Row[]); setLoaded(true); }), []);

  function flash(m: string) { setToast(m); window.setTimeout(() => setToast(null), 2000); }
  function openNew() { setForm({ name: "", category: "Hospitals", country: "US", location: "", plan: "free", status: "active", billingCycle: "monthly" }); setModal({ mode: "new" }); }
  function openManage(r: Row) { setForm({ name: r.name, category: r.category, country: r.country ?? "US", location: r.location, plan: r.plan ?? "free", status: r.status ?? "active", billingCycle: r.billingCycle ?? "monthly" }); setModal({ mode: "manage", row: r }); }
  
  async function save() {
    if (modal?.mode === "new") {
      if (!form.name.trim()) return;
      const paidUntil = isPaidPlan(form.plan) && form.status === "active" ? addCycle(new Date(), form.billingCycle).toISOString() : "";
      await addBusiness({ name: form.name.trim(), category: form.category, categoryIcon: catIcon[form.category] ?? "🏢", logo: catIcon[form.category] ?? "🏢", country: form.country, location: form.location.trim(), plan: form.plan, status: form.status, billingCycle: form.billingCycle, paidUntil, monthlyTokens: 0, likes: 0, distanceKm: 0 });
      flash("Business onboarded");
    } else if (modal?.mode === "manage") {
      await updateBusiness(modal.row.id, { plan: form.plan, status: form.status, billingCycle: form.billingCycle });
      flash("Business updated");
    }
    setModal(null);
  }

  async function recordPayment(r: Row) {
    const cycle = form.billingCycle || r.billingCycle || "monthly";
    const current = r.paidUntil ? new Date(r.paidUntil) : null;
    const base = current && current.getTime() > Date.now() ? current : new Date();
    const paidUntil = addCycle(base, cycle).toISOString();
    await updateBusiness(r.id, { paidUntil, billingCycle: cycle, status: "active", plan: form.plan });
    flash(`Payment recorded · paid through ${fmtDate(new Date(paidUntil))}`);
    setModal(null);
  }

  async function doSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  const list = useMemo(() => rows.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()) &&
    (plan === "All Plans" || r.plan === plan.toLowerCase())
  ), [rows, query, plan]);

  const totalTokens = rows.reduce((n, r) => n + (r.monthlyTokens ?? 0), 0);
  const paid = rows.filter((r) => isPaidPlan(r.plan)).length;
  const mrr = rows.reduce((n, r) => n + (planPrice[r.plan ?? "free"] ?? 0), 0);

  const needsAttention = rows.filter((r) => ["overdue", "unbilled"].includes(billStateOf(r).state));
  const outstanding = needsAttention.reduce((n, r) => n + priceFor(r.plan, r.billingCycle), 0);

  const stats = [
    { l: "Total Businesses", v: `${rows.length}`, c: "live count", icon: "🏢", bg: "rgba(49,92,255,.1)" },
    { l: "Monthly Tokens", v: fmtK(totalTokens), c: "across all", icon: "🎫", bg: "rgba(6,214,160,.12)" },
    { l: "Monthly Revenue", v: `$${mrr}`, c: "from plans", icon: "💰", bg: "rgba(247,127,0,.12)" },
    { l: "Paid Plans", v: `${paid}`, c: `${rows.length ? Math.round((paid / rows.length) * 100) : 0}% paid ratio`, icon: "⭐", bg: "rgba(114,9,183,.1)" },
  ];

  if (!ready) return (
    <div className="flex-1 h-screen grid place-items-center bg-[#f5f8fd]">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="grid place-items-center w-16 h-16 rounded-[14px] text-white text-3xl shadow-xl" style={{ background: "linear-gradient(135deg,#7209b7,#b5179e)" }}>⚡</div>
        <div className="font-display text-2xl font-bold text-ink tracking-tight mt-2">Waitless</div>
        <div className="text-[0.95rem] font-medium text-ink-3">Verifying super access…</div>
      </div>
    </div>
  );

  const manageBill = modal?.mode === "manage" ? billStateOf({ ...modal.row, plan: form.plan, status: form.status, billingCycle: form.billingCycle }) : null;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f8fd]">
      {/* ════════ SIDEBAR (SUPER ADMIN PURPLE THEME) ════════ */}
      <div className="w-[280px] shrink-0 h-full flex flex-col justify-between text-white relative z-20" style={{ background: "linear-gradient(180deg,#1c0a30 0%,#2a104a 100%)", boxShadow: "4px 0 24px rgba(28,10,48,0.15)" }}>
        <div className="p-7">
          <div className="flex items-center gap-3.5 mb-12">
            <span className="grid place-items-center w-11 h-11 rounded-[12px] text-white text-xl" style={{ background: "linear-gradient(135deg,#7209b7,#b5179e)", boxShadow: "0 8px 24px rgba(114,9,183,.4)" }}>⚡</span>
            <span className="font-display text-[1.55rem] font-bold tracking-tight">Waitless</span>
          </div>
          
          <div className="text-[0.7rem] uppercase tracking-widest font-bold text-white/50 mb-3 px-1.5">Platform</div>
          <div className="font-display font-bold text-[1.1rem] px-1.5 mb-1 truncate leading-tight">Super Admin</div>
          <div className="text-[0.75rem] font-medium text-white/60 px-1.5 mb-8 truncate">Waitless Platform</div>

          <nav className="flex flex-col gap-2">
            <Link href="/super" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] bg-white/10 text-white font-semibold transition shadow-sm border border-white/5">🏢 All Businesses</Link>
            <Link href="/analytics" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] hover:bg-white/5 text-white/70 hover:text-white transition font-semibold">📊 Analytics</Link>
            <Link href="/board" className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] hover:bg-white/5 text-white/70 hover:text-white transition font-semibold">📺 TV Board</Link>
          </nav>
        </div>
        
        <div className="p-7 pt-0">
          <button onClick={doSignOut} className="w-full text-[0.85rem] font-bold px-4 py-3 rounded-[12px] border border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white transition">
            Sign out
          </button>
        </div>
      </div>

      {/* ════════ MAIN DASHBOARD ════════ */}
      <main className="flex-1 h-full overflow-y-auto px-6 py-8 md:px-12 md:py-12 relative z-10">
        
        <div className="max-w-[1200px] mx-auto">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-[2.2rem] font-extrabold text-ink tracking-tight leading-none mb-2">Super Admin</h1>
              <p className="text-[0.95rem] font-medium text-ink-3">Platform overview · Manage all waitless businesses</p>
            </div>
            <button onClick={openNew} className="text-[0.9rem] font-bold px-6 py-3.5 rounded-[14px] text-white transition hover:-translate-y-0.5 shadow-[0_12px_24px_rgba(114,9,183,0.25)]" style={{ background: "#7209b7" }}>+ Onboard Business</button>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {stats.map((s) => (
              <div key={s.l} className="bg-white border border-border rounded-[22px] p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-40 -translate-y-1/2 translate-x-1/2" style={{ background: s.bg }} />
                <div className="flex items-start justify-between gap-2 mb-4 relative z-10">
                  <span className="text-[0.75rem] font-bold uppercase tracking-widest text-ink-3">{s.l}</span>
                  <span className="grid place-items-center w-10 h-10 rounded-[12px] text-[1.1rem] shadow-sm" style={{ background: s.bg }}>{s.icon}</span>
                </div>
                <div className="num text-[2.2rem] font-display font-extrabold text-ink leading-none mb-2 relative z-10">{s.v}</div>
                <div className="text-[0.8rem] font-bold text-live relative z-10">{s.c}</div>
              </div>
            ))}
          </div>

          {/* ALERTS */}
          {needsAttention.length > 0 && (
            <div className="flex items-center gap-5 flex-wrap bg-white border-2 rounded-[24px] px-7 py-6 mb-10 shadow-sm" style={{ borderColor: "rgba(239,35,60,.3)" }}>
              <div className="w-14 h-14 rounded-[16px] flex items-center justify-center shrink-0 shadow-sm" style={{ background: "rgba(239,35,60,.12)", color: "var(--dng)", fontSize: "1.5rem" }}>⚠️</div>
              <div className="flex-1 min-w-[200px]">
                <div className="text-[1.2rem] font-display font-bold text-ink"><span className="num">{needsAttention.length}</span> business{needsAttention.length > 1 ? "es" : ""} need billing attention</div>
                <div className="text-[0.9rem] text-ink-3 mt-1.5 font-medium">${outstanding} outstanding · {needsAttention.map((r) => r.name).slice(0, 3).join(", ")}{needsAttention.length > 3 ? "…" : ""}</div>
              </div>
              <button onClick={() => openManage(needsAttention[0])} className="text-[0.9rem] font-bold px-6 py-3.5 rounded-[14px] text-white transition shadow-[0_10px_20px_rgba(239,35,60,0.25)] hover:-translate-y-px" style={{ background: "var(--dng)" }}>Review Issues</button>
            </div>
          )}

          {/* BUSINESSES TABLE */}
          <div className="bg-white border border-border rounded-[24px] p-7 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
              <div className="font-display text-[1.4rem] font-bold text-ink">All Businesses</div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">🔍</span>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="w-56 text-[0.85rem] font-bold pl-10 pr-3 py-3 rounded-[12px] border border-border bg-surface-2/50 outline-none focus:bg-white focus:border-[#7209b7] focus:shadow-[0_0_0_3px_rgba(114,9,183,0.1)] transition" />
                </div>
                <select value={plan} onChange={(e) => setPlan(e.target.value)} className="text-[0.85rem] font-bold px-4 py-3 rounded-[12px] border border-border bg-surface-2/50 outline-none cursor-pointer hover:border-ink-3 focus:bg-white transition">
                  <option>All Plans</option><option>Free</option><option>Pro</option><option>Enterprise</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto -mx-7 px-7">
              <table className="w-full border-collapse" style={{ minWidth: 800 }}>
                <thead>
                  <tr>
                    {["Business", "Type", "Plan", "Tokens/mo", "Billing", "Status", ""].map((h, i) => (
                      <th key={i} className="text-left text-[0.75rem] font-bold uppercase tracking-widest text-ink-3 pb-4 border-b border-border/60">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loaded && list.map((r) => {
                    const bill = billStateOf(r);
                    const billLabel = bill.state === "paid" && bill.until ? `Paid · ${fmtDate(bill.until)}`
                      : bill.state === "overdue" && bill.until ? `Overdue · ${fmtDate(bill.until)}`
                      : bill.state === "unbilled" ? "Not billed"
                      : bill.state === "trial" ? "Trial"
                      : bill.state === "suspended" ? "Suspended"
                      : "—";
                    return (
                      <tr key={r.id} className="group hover:bg-surface-2 transition-colors border-b border-border/50 last:border-0">
                        <td className="py-4 pr-3">
                          <div className="font-bold text-ink text-[1.05rem]">{r.name}</div>
                          <div className="text-[0.8rem] text-ink-3 font-medium mt-1 flex items-center gap-1.5">{countryByCode(r.country ?? "US")?.flag} {r.location}</div>
                        </td>
                        <td className="py-4 pr-3 text-[0.9rem] font-medium text-ink whitespace-nowrap">{r.categoryIcon} {r.category}</td>
                        <td className="py-4 pr-3">
                          <span className="text-[0.7rem] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-border/10" style={planStyle[r.plan ?? "free"]}>{cap(r.plan)}</span>
                        </td>
                        <td className="num py-4 pr-3 text-[1rem] font-bold text-ink">{(r.monthlyTokens ?? 0).toLocaleString()}</td>
                        <td className="py-4 pr-3">
                          <span className="text-[0.75rem] font-bold px-3 py-1.5 rounded-lg border border-border/10 whitespace-nowrap" style={billStyle[bill.state]}>{billLabel}</span>
                        </td>
                        <td className="py-4 pr-3">
                          <span className="text-[0.75rem] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-border/10"
                            style={r.status === "active" ? { background: "rgba(6,214,160,.1)", color: "#06D6A0" } : { background: "rgba(247,127,0,.1)", color: "var(--wn)" }}>
                            ● {cap(r.status)}
                          </span>
                        </td>
                        <td className="py-4 text-right pl-2">
                          <button onClick={() => openManage(r)} className="text-[0.8rem] font-bold px-4 py-2 rounded-[10px] border border-border bg-white text-ink-2 hover:bg-surface-2 transition shadow-sm whitespace-nowrap">Manage</button>
                        </td>
                      </tr>
                    );
                  })}
                  {loaded && list.length === 0 && <tr><td colSpan={7} className="text-center text-[0.95rem] font-medium text-ink-3 py-16">No businesses match.</td></tr>}
                  {!loaded && <tr><td colSpan={7} className="text-center text-[0.95rem] font-medium text-ink-3 py-16 animate-pulse">Loading platform data…</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>

      {/* MODALS */}
      {modal && (
        <Modal title={modal.mode === "new" ? "Onboard business" : `Manage · ${modal.row.name}`} onClose={() => setModal(null)}>
          {modal.mode === "new" && (
            <>
              <Field label="Business name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Clinic" /></Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Category"><select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Country"><select className={inputCls} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>{DEFAULT_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}</select></Field>
                <Field label="Location"><input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City" /></Field>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Plan"><select className={inputCls} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}><option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></Field>
            <Field label="Status"><select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option></select></Field>
          </div>

          {isPaidPlan(form.plan) && (
            <div className="mt-4 mb-4 rounded-[20px] border border-border bg-surface-2/60 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[0.75rem] font-bold uppercase tracking-widest text-ink-3">Billing</span>
                <span className="num text-[1.2rem] font-extrabold text-ink">${priceFor(form.plan, form.billingCycle)}<span className="text-[0.85rem] font-bold text-ink-3">/{form.billingCycle === "yearly" ? "yr" : "mo"}</span></span>
              </div>
              <Field label="Billing cycle">
                <select className={inputCls} value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
                  <option value="monthly">Monthly</option><option value="yearly">Yearly (×12)</option>
                </select>
              </Field>
              {modal.mode === "manage" && manageBill && (
                <>
                  <div className="text-[0.85rem] text-ink-3 mt-4 font-medium leading-relaxed">
                    {manageBill.state === "paid" && manageBill.until && <>Paid through <span className="font-bold text-ink-2">{fmtDate(manageBill.until)}</span>{manageBill.daysLeft != null && manageBill.daysLeft >= 0 ? ` · ${manageBill.daysLeft} day${manageBill.daysLeft === 1 ? "" : "s"} left` : ""}.</>}
                    {manageBill.state === "overdue" && manageBill.until && <span style={{ color: "var(--dng)" }}>Overdue since <span className="font-bold">{fmtDate(manageBill.until)}</span>.</span>}
                    {manageBill.state === "unbilled" && <span style={{ color: "var(--wn)" }}>No payment recorded yet.</span>}
                    {manageBill.state === "trial" && <>On trial — no charge yet.</>}
                    {manageBill.state === "suspended" && <span style={{ color: "var(--dng)" }}>Suspended — service is blocked until reactivated.</span>}
                  </div>
                  <button onClick={() => recordPayment(modal.row)} className="w-full mt-4 py-3.5 rounded-[14px] text-[0.85rem] font-bold text-white transition shadow-[0_8px_20px_rgba(6,214,160,0.25)] hover:-translate-y-px" style={{ background: "#06D6A0" }}>
                    💵 Record ${priceFor(form.plan, form.billingCycle)} payment (+1 {form.billingCycle === "yearly" ? "year" : "month"})
                  </button>
                </>
              )}
            </div>
          )}

          {modal.mode === "manage" && (
            <div className="mt-4 mb-4 rounded-[20px] border border-border bg-surface-2/60 p-5">
              <div className="flex items-center justify-between gap-5">
                <div className="flex-1">
                  <div className="text-[1rem] font-bold text-ink">WhatsApp alerts · add-on</div>
                  <div className="text-[0.85rem] text-ink-3 leading-relaxed font-medium mt-1">Free inside the customer's 24h window · out-of-window messages billed to the client at ₹{WA_PRICE_INR}/msg</div>
                </div>
                <button
                  onClick={async () => {
                    const next = !modal.row.waEnabled;
                    await updateBusiness(modal.row.id, { waEnabled: next });
                    flash(`WhatsApp add-on ${next ? "enabled" : "disabled"} for ${modal.row.name}`);
                    setModal(null);
                  }}
                  role="switch" aria-checked={!!modal.row.waEnabled}
                  className="relative w-[56px] h-[32px] rounded-full shrink-0 transition-colors"
                  style={{ background: modal.row.waEnabled ? "#25D366" : "#dde3f4" }}>
                  <span className="absolute top-[4px] w-6 h-6 rounded-full bg-white transition-all shadow-md" style={{ left: modal.row.waEnabled ? "28px" : "4px" }} />
                </button>
              </div>
              {modal.row.waEnabled && (
                <div className="text-[0.9rem] font-medium text-ink-2 mt-4 pt-4 border-t border-border/50">
                  Paid (out-of-window) messages this month: <span className="num font-bold">{waPaidThisMonth(modal.row)}</span>
                  {" "}· bill <span className="num font-bold text-ink">₹{(waPaidThisMonth(modal.row) * WA_PRICE_INR).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          <button onClick={save} disabled={modal.mode === "new" && !form.name.trim()} className="w-full mt-6 py-3.5 rounded-[14px] font-bold text-white transition shadow-[0_10px_24px_rgba(114,9,183,0.3)] hover:-translate-y-px disabled:opacity-50" style={{ background: "#7209b7" }}>{modal.mode === "new" ? "Onboard Business" : "Save Changes"}</button>
        </Modal>
      )}
      {toast && <div className="fixed left-1/2 -translate-x-1/2 bottom-8 px-6 py-3.5 rounded-[14px] text-white text-[0.9rem] font-bold z-50 shadow-[0_12px_32px_rgba(10,17,40,0.4)] transition-all animate-in slide-in-from-bottom-4" style={{ background: "#1c0a30" }}>{toast}</div>}
    </div>
  );
}
