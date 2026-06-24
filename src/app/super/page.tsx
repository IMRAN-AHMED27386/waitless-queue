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

export default function Super() {
  const { ready } = useAuthGuard(["super"]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("All Plans");
  const [modal, setModal] = useState<null | { mode: "new" } | { mode: "manage"; row: Row }>(null);
  const [form, setForm] = useState({ name: "", category: "Hospitals", location: "", plan: "free", status: "active" });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => listenBusinesses((b) => { setRows(b as Row[]); setLoaded(true); }), []);

  function flash(m: string) { setToast(m); window.setTimeout(() => setToast(null), 2000); }
  function openNew() { setForm({ name: "", category: "Hospitals", location: "", plan: "free", status: "active" }); setModal({ mode: "new" }); }
  function openManage(r: Row) { setForm({ name: r.name, category: r.category, location: r.location, plan: r.plan ?? "free", status: r.status ?? "active" }); setModal({ mode: "manage", row: r }); }
  async function save() {
    if (modal?.mode === "new") {
      if (!form.name.trim()) return;
      await addBusiness({ name: form.name.trim(), category: form.category, categoryIcon: catIcon[form.category] ?? "🏢", logo: catIcon[form.category] ?? "🏢", location: form.location.trim(), plan: form.plan, status: form.status, monthlyTokens: 0, likes: 0, distanceKm: 0 });
      flash("Business onboarded");
    } else if (modal?.mode === "manage") {
      await updateBusiness(modal.row.id, { plan: form.plan, status: form.status });
      flash("Business updated");
    }
    setModal(null);
  }

  const list = useMemo(() => rows.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()) &&
    (plan === "All Plans" || r.plan === plan.toLowerCase())
  ), [rows, query, plan]);

  const totalTokens = rows.reduce((n, r) => n + (r.monthlyTokens ?? 0), 0);
  const paid = rows.filter((r) => r.plan === "pro" || r.plan === "enterprise").length;
  const mrr = rows.reduce((n, r) => n + (planPrice[r.plan ?? "free"] ?? 0), 0);

  const stats = [
    { l: "Total Businesses", v: `${rows.length}`, c: "live count", icon: "🏢", bg: "var(--al)" },
    { l: "Monthly Tokens", v: fmtK(totalTokens), c: "across all", icon: "🎫", bg: "rgba(6,214,160,.12)" },
    { l: "Monthly Revenue", v: `$${mrr}`, c: "from plans", icon: "💰", bg: "rgba(247,127,0,.12)" },
    { l: "Paid Plans", v: `${paid}`, c: `${rows.length ? Math.round((paid / rows.length) * 100) : 0}% paid ratio`, icon: "⭐", bg: "rgba(114,9,183,.1)" },
  ];

  if (!ready) return <div className="flex-1 grid place-items-center text-ink-3 text-sm">Loading…</div>;

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
          <table className="w-full border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                {["Business", "Type", "Plan", "Tokens/mo", "Status", ""].map((h, i) => (
                  <th key={i} className="text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3 px-3 py-2.5 bg-surface-2 border-b border-border">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loaded && list.map((r) => (
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
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={r.status === "active" ? { background: "rgba(6,214,160,.12)", color: "#06D6A0" } : { background: "rgba(247,127,0,.12)", color: "var(--wn)" }}>
                      {cap(r.status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 border-b border-border">
                    <button onClick={() => openManage(r)} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border border-border text-ink-2 hover:bg-surface-2 whitespace-nowrap">Manage</button>
                  </td>
                </tr>
              ))}
              {loaded && list.length === 0 && <tr><td colSpan={6} className="text-center text-sm text-ink-3 py-8">No businesses match.</td></tr>}
              {!loaded && <tr><td colSpan={6} className="text-center text-sm text-ink-3 py-8">Loading…</td></tr>}
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
          <button onClick={save} disabled={modal.mode === "new" && !form.name.trim()} className="w-full mt-2 py-2.5 rounded-xl font-semibold text-white bg-acc hover:bg-acc-dark disabled:opacity-50 transition">{modal.mode === "new" ? "Onboard" : "Save changes"}</button>
        </Modal>
      )}
      {toast && <div className="fixed left-1/2 -translate-x-1/2 bottom-8 px-4 py-2.5 rounded-xl text-white text-sm font-semibold z-50 shadow-lg" style={{ background: "#0D1B3E" }}>{toast}</div>}
    </main>
  );
}
