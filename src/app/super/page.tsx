"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listenBusinesses, addBusiness, updateBusiness } from "@/lib/db";
import { useAuthGuard } from "@/lib/auth";
import SignOut from "@/components/SignOut";
import Modal, { Field, inputCls } from "@/components/Modal";

type Row = {
  id: string; name: string; category: string; categoryIcon: string; location: string;
  plan?: string; status?: string; monthlyTokens?: number;
  paidUntil?: string; billingCycle?: string;
};

const planStyle: Record<string, React.CSSProperties> = {
  free: { background: "var(--s2)", color: "var(--t3)" },
  pro: { background: "var(--al)", color: "var(--acc)" },
  enterprise: { background: "rgba(114,9,183,.1)", color: "var(--pur)" },
};
const planPrice: Record<string, number> = { free: 0, pro: 29, enterprise: 199 };
const cap = (s?: string) => (s ? s[0].toUpperCase() + s.slice(1) : "—");
const fmtK = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);
const categories = ["Hospitals", "Clinics", "Salons", "Banks", "Government", "Restaurants"];
const catIcon: Record<string, string> = { Hospitals: "🏥", Clinics: "💊", Salons: "✂️", Banks: "🏦", Government: "🏛️", Restaurants: "🍽️" };

const isPaidPlan = (plan?: string) => plan === "pro" || plan === "enterprise";
// Per-cycle price. Yearly bills 12× the monthly rate (no processor — recorded manually).
const priceFor = (plan?: string, cycle?: string) => planPrice[plan ?? "free"] * (cycle === "yearly" ? 12 : 1);
const fmtDate = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
// Add one billing cycle to a start date.
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
  free: { background: "var(--s2)", color: "var(--t3)" },
  trial: { background: "rgba(67,97,238,.1)", color: "var(--acc)" },
  paid: { background: "rgba(6,214,160,.12)", color: "#06D6A0" },
  unbilled: { background: "rgba(247,127,0,.12)", color: "var(--wn)" },
  overdue: { background: "rgba(239,35,60,.12)", color: "var(--dng)" },
  suspended: { background: "rgba(239,35,60,.12)", color: "var(--dng)" },
};

export default function Super() {
  const { ready } = useAuthGuard(["super"]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("All Plans");
  const [modal, setModal] = useState<null | { mode: "new" } | { mode: "manage"; row: Row }>(null);
  const [form, setForm] = useState({ name: "", category: "Hospitals", location: "", plan: "free", status: "active", billingCycle: "monthly" });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => listenBusinesses((b) => { setRows(b as Row[]); setLoaded(true); }), []);

  function flash(m: string) { setToast(m); window.setTimeout(() => setToast(null), 2000); }
  function openNew() { setForm({ name: "", category: "Hospitals", location: "", plan: "free", status: "active", billingCycle: "monthly" }); setModal({ mode: "new" }); }
  function openManage(r: Row) { setForm({ name: r.name, category: r.category, location: r.location, plan: r.plan ?? "free", status: r.status ?? "active", billingCycle: r.billingCycle ?? "monthly" }); setModal({ mode: "manage", row: r }); }
  async function save() {
    if (modal?.mode === "new") {
      if (!form.name.trim()) return;
      const paidUntil = isPaidPlan(form.plan) && form.status === "active" ? addCycle(new Date(), form.billingCycle).toISOString() : "";
      await addBusiness({ name: form.name.trim(), category: form.category, categoryIcon: catIcon[form.category] ?? "🏢", logo: catIcon[form.category] ?? "🏢", location: form.location.trim(), plan: form.plan, status: form.status, billingCycle: form.billingCycle, paidUntil, monthlyTokens: 0, likes: 0, distanceKm: 0 });
      flash("Business onboarded");
    } else if (modal?.mode === "manage") {
      await updateBusiness(modal.row.id, { plan: form.plan, status: form.status, billingCycle: form.billingCycle });
      flash("Business updated");
    }
    setModal(null);
  }

  // Record a payment received (offline) — extend the paid-through date by one cycle
  // from whichever is later (today or the current expiry) and reactivate the account.
  async function recordPayment(r: Row) {
    const cycle = form.billingCycle || r.billingCycle || "monthly";
    const current = r.paidUntil ? new Date(r.paidUntil) : null;
    const base = current && current.getTime() > Date.now() ? current : new Date();
    const paidUntil = addCycle(base, cycle).toISOString();
    await updateBusiness(r.id, { paidUntil, billingCycle: cycle, status: "active", plan: form.plan });
    flash(`Payment recorded · paid through ${fmtDate(new Date(paidUntil))}`);
    setModal(null);
  }

  const list = useMemo(() => rows.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()) &&
    (plan === "All Plans" || r.plan === plan.toLowerCase())
  ), [rows, query, plan]);

  const totalTokens = rows.reduce((n, r) => n + (r.monthlyTokens ?? 0), 0);
  const paid = rows.filter((r) => isPaidPlan(r.plan)).length;
  const mrr = rows.reduce((n, r) => n + (planPrice[r.plan ?? "free"] ?? 0), 0);

  // Businesses that owe money right now (overdue or a paid plan never billed).
  const needsAttention = rows.filter((r) => ["overdue", "unbilled"].includes(billStateOf(r).state));
  const outstanding = needsAttention.reduce((n, r) => n + priceFor(r.plan, r.billingCycle), 0);

  const stats = [
    { l: "Total Businesses", v: `${rows.length}`, c: "live count", icon: "🏢", bg: "var(--al)" },
    { l: "Monthly Tokens", v: fmtK(totalTokens), c: "across all", icon: "🎫", bg: "rgba(6,214,160,.12)" },
    { l: "Monthly Revenue", v: `$${mrr}`, c: "from plans", icon: "💰", bg: "rgba(247,127,0,.12)" },
    { l: "Paid Plans", v: `${paid}`, c: `${rows.length ? Math.round((paid / rows.length) * 100) : 0}% paid ratio`, icon: "⭐", bg: "rgba(114,9,183,.1)" },
  ];

  if (!ready) return <div className="flex-1 grid place-items-center text-ink-3 text-sm">Loading…</div>;

  const manageBill = modal?.mode === "manage" ? billStateOf({ ...modal.row, plan: form.plan, status: form.status, billingCycle: form.billingCycle }) : null;

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="grid place-items-center w-9 h-9 rounded-[10px] border border-border bg-surface text-ink-2" aria-label="Home">←</Link>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Super Admin</h1>
            <p className="text-xs text-ink-3">Platform overview · All businesses · live</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SignOut />
          <button onClick={openNew} className="text-[13px] font-semibold px-3.5 py-2 rounded-[10px] text-white bg-acc hover:bg-acc-dark transition">+ Onboard Business</button>
        </div>
      </div>

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

      {needsAttention.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap bg-surface border rounded-2xl px-4 py-3 mb-5" style={{ borderColor: "var(--dng)", background: "rgba(239,35,60,.06)" }}>
          <span className="text-lg">⚠️</span>
          <div className="flex-1 min-w-[180px]">
            <div className="text-[13.5px] font-bold text-ink"><span className="num">{needsAttention.length}</span> business{needsAttention.length > 1 ? "es" : ""} need billing attention</div>
            <div className="text-[11.5px] text-ink-3">${outstanding} outstanding · {needsAttention.map((r) => r.name).slice(0, 3).join(", ")}{needsAttention.length > 3 ? "…" : ""}</div>
          </div>
          <button onClick={() => openManage(needsAttention[0])} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg text-white bg-acc hover:bg-acc-dark transition whitespace-nowrap">Review</button>
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl p-4" style={{ boxShadow: "var(--sh)" }}>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="font-display font-bold text-ink">All Businesses</div>
          <div className="flex items-center gap-2 flex-wrap">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="🔍 Search…" className="w-44 text-[13px] px-3 py-2 rounded-[10px] border border-border bg-surface outline-none focus:border-acc" />
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className="text-[13px] px-3 py-2 rounded-[10px] border border-border bg-surface outline-none">
              <option>All Plans</option><option>Free</option><option>Pro</option><option>Enterprise</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 680 }}>
            <thead>
              <tr>
                {["Business", "Type", "Plan", "Tokens/mo", "Billing", "Status", ""].map((h, i) => (
                  <th key={i} className="text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3 px-3 py-2.5 bg-surface-2 border-b border-border">{h}</th>
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
                  <tr key={r.id} className="hover:bg-surface-2">
                    <td className="px-3 py-3 border-b border-border">
                      <div className="font-semibold text-ink text-[13px]">{r.name}</div>
                      <div className="text-[11px] text-ink-3">{r.location}</div>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-ink border-b border-border whitespace-nowrap">{r.categoryIcon} {r.category}</td>
                    <td className="px-3 py-3 border-b border-border">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={planStyle[r.plan ?? "free"]}>{cap(r.plan)}</span>
                    </td>
                    <td className="num px-3 py-3 text-[13px] text-ink border-b border-border">{(r.monthlyTokens ?? 0).toLocaleString()}</td>
                    <td className="px-3 py-3 border-b border-border">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={billStyle[bill.state]}>{billLabel}</span>
                    </td>
                    <td className="px-3 py-3 border-b border-border">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={r.status === "active" ? { background: "rgba(6,214,160,.12)", color: "#06D6A0" } : { background: "rgba(247,127,0,.12)", color: "var(--wn)" }}>
                        {cap(r.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 border-b border-border">
                      <button onClick={() => openManage(r)} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-border text-ink-2 hover:bg-surface-2 whitespace-nowrap">Manage</button>
                    </td>
                  </tr>
                );
              })}
              {loaded && list.length === 0 && <tr><td colSpan={7} className="text-center text-sm text-ink-3 py-8">No businesses match.</td></tr>}
              {!loaded && <tr><td colSpan={7} className="text-center text-sm text-ink-3 py-8">Loading…</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <Modal title={modal.mode === "new" ? "Onboard business" : `Manage · ${modal.row.name}`} onClose={() => setModal(null)}>
          {modal.mode === "new" && (
            <>
              <Field label="Business name"><input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Acme Clinic" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category"><select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((c) => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Location"><input className={inputCls} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="City" /></Field>
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plan"><select className={inputCls} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}><option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></Field>
            <Field label="Status"><select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="trial">Trial</option><option value="suspended">Suspended</option></select></Field>
          </div>

          {isPaidPlan(form.plan) && (
            <div className="mt-1 mb-1 rounded-xl border border-border bg-surface-2 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide text-ink-3">Billing</span>
                <span className="num text-[13px] font-bold text-ink">${priceFor(form.plan, form.billingCycle)}<span className="text-[11px] font-medium text-ink-3">/{form.billingCycle === "yearly" ? "yr" : "mo"}</span></span>
              </div>
              <Field label="Billing cycle">
                <select className={inputCls} value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}>
                  <option value="monthly">Monthly</option><option value="yearly">Yearly (×12)</option>
                </select>
              </Field>
              {modal.mode === "manage" && manageBill && (
                <>
                  <div className="text-[12px] text-ink-3 mt-2">
                    {manageBill.state === "paid" && manageBill.until && <>Paid through <span className="font-semibold text-ink-2">{fmtDate(manageBill.until)}</span>{manageBill.daysLeft != null && manageBill.daysLeft >= 0 ? ` · ${manageBill.daysLeft} day${manageBill.daysLeft === 1 ? "" : "s"} left` : ""}.</>}
                    {manageBill.state === "overdue" && manageBill.until && <span style={{ color: "var(--dng)" }}>Overdue since <span className="font-semibold">{fmtDate(manageBill.until)}</span>.</span>}
                    {manageBill.state === "unbilled" && <span style={{ color: "var(--wn)" }}>No payment recorded yet.</span>}
                    {manageBill.state === "trial" && <>On trial — no charge yet.</>}
                    {manageBill.state === "suspended" && <span style={{ color: "var(--dng)" }}>Suspended — service is blocked until reactivated.</span>}
                  </div>
                  <button onClick={() => recordPayment(modal.row)} className="w-full mt-2 py-2 rounded-lg text-[13px] font-semibold text-white bg-acc hover:bg-acc-dark transition">
                    💵 Record ${priceFor(form.plan, form.billingCycle)} payment (+1 {form.billingCycle === "yearly" ? "year" : "month"})
                  </button>
                </>
              )}
            </div>
          )}

          <button onClick={save} disabled={modal.mode === "new" && !form.name.trim()} className="w-full mt-2 py-2.5 rounded-xl font-semibold text-white bg-acc hover:bg-acc-dark disabled:opacity-50 transition">{modal.mode === "new" ? "Onboard" : "Save changes"}</button>
        </Modal>
      )}
      {toast && <div className="fixed left-1/2 -translate-x-1/2 bottom-8 px-4 py-2.5 rounded-xl text-white text-sm font-semibold z-50 shadow-lg" style={{ background: "#0D1B3E" }}>{toast}</div>}
    </main>
  );
}
