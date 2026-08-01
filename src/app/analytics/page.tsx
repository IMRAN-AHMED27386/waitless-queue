"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { listenBusinessTokens, listenBusinesses, listenBusiness, listenServices, type HistTok, type Biz, type Svc } from "@/lib/db";
import { useAuthGuard } from "@/lib/auth";
import AdminSidebar from "@/components/AdminSidebar";

const SVC_COLORS = ["#0ea5e9", "#06D6A0", "#f43f5e", "#f59e0b", "#8b5cf6", "#94a3b8"];
const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i); // 7am..6pm
const fmtHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? "PM" : "AM"}`;
const shortHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? "p" : "a"}`;

export default function Analytics() {
  const { ready, user } = useAuthGuard(["admin", "super"]);
  const router = useRouter();
  const isSuper = user?.role === "super";
  const [period, setPeriod] = useState("Today");
  const [tokens, setTokens] = useState<HistTok[]>([]);
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [services, setServices] = useState<Svc[]>([]);
  const [pickedBizId, setPickedBizId] = useState("");
  const [bizName, setBizName] = useState("Business");
  const bizId = isSuper ? pickedBizId : (user?.businessId ?? "");

  useEffect(() => {
    if (!isSuper) return;
    return listenBusinesses((b) => { setBusinesses(b); setPickedBizId((cur) => cur || b[0]?.id || ""); });
  }, [isSuper]);

  useEffect(() => listenServices(bizId, setServices), [bizId]);

  useEffect(() => {
    if (!bizId) return;
    const now = new Date();
    let cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === "This Week") cutoff = new Date(now.getTime() - 7 * 86400000);
    else if (period === "This Month") cutoff = new Date(now.getTime() - 30 * 86400000);
    return listenBusinessTokens(bizId, cutoff, setTokens);
  }, [bizId, period]);

  useEffect(() => {
    if (!bizId) return;
    return listenBusiness(bizId, (b) => setBizName(b?.name ?? "Business"));
  }, [bizId]);

  const svcNames = useMemo(() => {
    const m: Record<string, string> = {};
    services.forEach((s) => (m[s.id] = s.name));
    return m;
  }, [services, bizId]);

  const a = useMemo(() => {
    const now = new Date();
    const filtered = tokens;

    const total = filtered.length;
    const cancelled = filtered.filter((t) => t.status === "cancelled").length;
    const served = filtered.filter((t) => t.status === "served").length;
    const noshow = filtered.filter((t) => t.status === "noshow").length;
    const parked = filtered.filter((t) => t.status === "parked").length;
    const hourly: Record<number, number> = {};
    HOURS.forEach((h) => (hourly[h] = 0));
    filtered.forEach((t) => { if (t.createdAt) { const h = t.createdAt.getHours(); if (h in hourly) hourly[h]++; } });
    const maxH = Math.max(1, ...HOURS.map((h) => hourly[h]));
    const peakHour = HOURS.reduce((p, h) => (hourly[h] > hourly[p] ? h : p), HOURS[0]);
    const byCount: Record<string, number> = {};
    filtered.forEach((t) => (byCount[t.serviceId] = (byCount[t.serviceId] ?? 0) + 1));
    const byService = Object.entries(byCount).sort((x, y) => y[1] - x[1]).slice(0, 4)
      .map(([id, n], i) => ({ name: svcNames[id] ?? id, pct: total ? Math.round((n / total) * 100) : 0, color: SVC_COLORS[i] }));
    const byStaff: Record<string, number> = {};
    filtered.forEach((t) => { if (t.status === "served" && t.servedBy) byStaff[t.servedBy] = (byStaff[t.servedBy] ?? 0) + 1; });
    const staffPerf = Object.entries(byStaff).sort((x, y) => y[1] - x[1])
      .map(([name, count]) => ({ name, served: count, share: served ? Math.round((count / served) * 100) : 0 }));
    return { total, cancelled, served, noshow, parked, hourly, maxH, peakHour, byService, staffPerf };
  }, [tokens, period, svcNames]);

  const pct = (n: number) => (a.total ? Math.round((n / a.total) * 100) : 0);
  const stats = [
    { l: "Total Tokens", v: `${a.total}`, c: "this period", icon: "🎫", bg: "rgba(14,165,233,.1)", color: "#0ea5e9" },
    { l: "Served", v: `${a.served}`, c: `${pct(a.served)}% completion`, icon: "✅", bg: "rgba(6,214,160,.1)", color: "#06D6A0" },
    { l: "No-shows", v: `${a.noshow}`, c: a.parked ? `${pct(a.noshow)}% · ${a.parked} parked now` : `${pct(a.noshow)}% of total`, icon: "⌛", bg: "rgba(245,158,11,.1)", color: "#f59e0b" },
    { l: "Cancellations", v: `${a.cancelled}`, c: `${pct(a.cancelled)}% of total`, icon: "❌", bg: "rgba(244,63,94,.1)", color: "#f43f5e" },
  ];

  function downloadCSV() {
    const rows: (string | number)[][] = [
      [`Waitless Analytics — ${bizName}`, period],
      [],
      ["Metric", "Value"],
      ["Total Tokens", a.total],
      ["Served", a.served],
      ["No-shows", a.noshow],
      ["Parked (now)", a.parked],
      ["Cancelled", a.cancelled],
      ["Peak Hour", fmtHour(a.peakHour)],
      [],
      ["Hour", "Tokens"],
      ...HOURS.map((h) => [fmtHour(h), a.hourly[h]]),
      [],
      ["Service", "Share"],
      ...a.byService.map((s) => [s.name, `${s.pct}%`]),
      [],
      ["Staff", "Tokens served", "Share"],
      ...a.staffPerf.map((s) => [s.name, s.served, `${s.share}%`]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `waitless-analytics-${bizId || "business"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) return (
    <div className="flex-1 h-screen grid place-items-center bg-[#f5f8fd]">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="grid place-items-center w-16 h-16 rounded-[14px] text-white text-3xl shadow-xl" style={{ background: "linear-gradient(135deg,#315cff,#59d4d1)" }}>⚡</div>
        <div className="font-display text-2xl font-bold text-ink tracking-tight mt-2">Waitless</div>
        <div className="text-[0.95rem] font-medium text-ink-3">Loading analytics…</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f8fd]">
      {/* ════════ SIDEBAR ════════ */}
      <AdminSidebar active="analytics" bizId={bizId} isSuper={isSuper} />

      {/* ════════ MAIN DASHBOARD ════════ */}
      <main className="flex-1 h-full overflow-y-auto px-6 py-8 md:px-12 md:py-12 relative z-10">
        
        <div className="max-w-[1200px] mx-auto">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-10 gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-[2.2rem] font-extrabold text-ink tracking-tight leading-none mb-2">Analytics</h1>
              <p className="text-[0.95rem] font-medium text-ink-3">Performance overview &middot; {bizName}</p>
            </div>
            
            <div className="flex items-center gap-4 flex-wrap">
              {isSuper && (
                <select value={pickedBizId} onChange={(e) => setPickedBizId(e.target.value)} className="text-[0.9rem] font-bold px-4 py-3 rounded-[14px] border border-border bg-white text-ink outline-none hover:border-ink-3 transition max-w-[200px] truncate shadow-sm cursor-pointer" title="Business">
                  {businesses.length === 0 && <option value="">Loading…</option>}
                  {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              )}
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="text-[0.9rem] font-bold px-4 py-3 rounded-[14px] border border-border bg-white outline-none hover:border-ink-3 transition shadow-sm cursor-pointer">
                <option>Today</option><option>This Week</option><option>This Month</option>
              </select>
              <button onClick={downloadCSV} className="text-[0.9rem] font-bold px-6 py-3.5 rounded-[14px] text-white transition shadow-[0_12px_24px_rgba(2,132,199,0.25)] hover:-translate-y-0.5 flex items-center gap-2" style={{ background: "#0ea5e9" }}>
                📥 Download CSV
              </button>
            </div>
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
                <div className="text-[0.8rem] font-bold relative z-10" style={{ color: s.color }}>{s.c}</div>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-[2fr_1fr] gap-6 mb-10">
            
            {/* HOURLY CHART */}
            <div className="bg-white border border-border rounded-[24px] p-7 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div className="font-display text-[1.4rem] font-bold text-ink">Tokens Per Hour</div>
                <div className="text-[0.9rem] font-medium text-ink-3">Peak &middot; <span className="font-bold text-ink-2">{fmtHour(a.peakHour)}</span> ({a.hourly[a.peakHour]}/hr)</div>
              </div>
              <div className="flex items-end gap-3 h-48">
                {HOURS.map((h) => {
                  const count = a.hourly[h];
                  const height = Math.round((count / a.maxH) * 100);
                  const peak = h === a.peakHour && count > 0;
                  return (
                    <div key={h} className="flex-1 flex flex-col items-center justify-end h-full group" title={`${count} tokens`}>
                      <div className="relative w-full h-full flex items-end justify-center">
                        <div className="w-full rounded-[8px] transition-all" style={{ height: `${Math.max(height, 2)}%`, background: peak ? "#f43f5e" : "#0ea5e9", opacity: peak ? 1 : count === 0 ? 0.15 : 0.8 }} />
                        <div className="absolute bottom-full mb-1.5 text-[0.8rem] font-bold text-ink opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                      </div>
                      <span className="text-[0.7rem] uppercase font-bold text-ink-3 mt-3">{shortHour(h)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* BY SERVICE */}
            <div className="bg-white border border-border rounded-[24px] p-7 shadow-sm flex flex-col">
              <div className="font-display text-[1.4rem] font-bold text-ink mb-8">By Service</div>
              <div className="flex flex-col gap-5 flex-1 justify-center">
                {a.byService.length === 0 && <div className="text-[0.95rem] text-ink-3 font-medium">No data yet.</div>}
                {a.byService.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-[0.9rem] mb-2">
                      <span className="font-bold text-ink truncate pr-3">{s.name}</span>
                      <span className="num font-bold text-ink-3">{s.pct}%</span>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden bg-slate-100">
                      <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: s.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STAFF PERFORMANCE */}
          <div className="bg-white border border-border rounded-[24px] p-7 shadow-sm">
            <div className="font-display text-[1.4rem] font-bold text-ink mb-6">Staff Performance</div>
            <div className="overflow-x-auto -mx-7 px-7">
              <table className="w-full border-collapse" style={{ minWidth: 500 }}>
                <thead>
                  <tr>{["Staff Member", "Tokens Served", "Share"].map((h) => (
                    <th key={h} className="text-left text-[0.75rem] font-bold uppercase tracking-widest text-ink-3 pb-4 border-b border-border/60">{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {a.staffPerf.map((s) => (
                    <tr key={s.name} className="group hover:bg-slate-50 transition-colors border-b border-border/50 last:border-0">
                      <td className="py-4 pr-3 text-[1.05rem] font-bold text-ink">{s.name}</td>
                      <td className="num py-4 pr-3 text-[1.05rem] font-bold text-ink">{s.served}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-2.5 rounded-full overflow-hidden bg-slate-100 min-w-[120px]">
                            <div className="h-full rounded-full transition-all" style={{ width: `${s.share}%`, background: "#0ea5e9" }} />
                          </div>
                          <span className="num text-[0.95rem] font-bold text-ink-3 w-12 text-right">{s.share}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {a.staffPerf.length === 0 && <tr><td colSpan={3} className="text-center text-[0.95rem] font-medium text-ink-3 py-10">No served-token data yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
}
