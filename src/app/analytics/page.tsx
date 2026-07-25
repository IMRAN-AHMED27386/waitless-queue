"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listenBusinessTokens, listenBusinesses, listenBusiness, listenAllServices, type HistTok, type Biz, type Svc } from "@/lib/db";
import { useAuthGuard } from "@/lib/auth";
import SignOut from "@/components/SignOut";

const SVC_COLORS = ["#315cff", "#06D6A0", "#E91E8C", "#f77f00", "#7209b7", "#94a3b8"];
const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i); // 7am..6pm
const fmtHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? "PM" : "AM"}`;
const shortHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? "p" : "a"}`;

export default function Analytics() {
  const { ready, user } = useAuthGuard(["admin", "super"]);
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

  useEffect(() => listenAllServices(setServices), []);

  useEffect(() => {
    if (!bizId) return;
    return listenBusinessTokens(bizId, setTokens);
  }, [bizId]);

  useEffect(() => {
    if (!bizId) return;
    return listenBusiness(bizId, (b) => setBizName(b?.name ?? "Business"));
  }, [bizId]);

  const svcNames = useMemo(() => {
    const m: Record<string, string> = {};
    services.filter((s) => s.businessId === bizId).forEach((s) => (m[s.id] = s.name));
    return m;
  }, [services, bizId]);

  const a = useMemo(() => {
    const now = new Date();
    let cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (period === "This Week") cutoff = new Date(now.getTime() - 7 * 86400000);
    else if (period === "This Month") cutoff = new Date(now.getTime() - 30 * 86400000);
    const filtered = tokens.filter((t) => t.createdAt && t.createdAt >= cutoff);

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
    { l: "Total Tokens", v: `${a.total}`, c: "this period", icon: "🎫", bg: "rgba(49,92,255,.1)", color: "#315cff" },
    { l: "Served", v: `${a.served}`, c: `${pct(a.served)}% completion`, icon: "✅", bg: "rgba(6,214,160,.12)", color: "#06D6A0" },
    { l: "No-shows", v: `${a.noshow}`, c: a.parked ? `${pct(a.noshow)}% · ${a.parked} parked now` : `${pct(a.noshow)}% of total`, icon: "⌛", bg: "rgba(247,127,0,.12)", color: "var(--wn)" },
    { l: "Cancellations", v: `${a.cancelled}`, c: `${pct(a.cancelled)}% of total`, icon: "❌", bg: "rgba(239,35,60,.12)", color: "var(--dng)" },
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
    <div className="flex-1 grid place-items-center">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="grid place-items-center w-14 h-14 rounded-[12px] text-white text-2xl" style={{ background: "linear-gradient(135deg,#315cff,#59d4d1)" }}>⚡</div>
        <div className="font-display text-xl font-bold text-ink">Waitless</div>
        <div className="text-[0.85rem] text-ink-3">Loading analytics…</div>
      </div>
    </div>
  );

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-20">
      
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="grid place-items-center w-10 h-10 rounded-[12px] border border-border bg-white text-ink-2 hover:border-acc hover:text-acc transition shadow-sm">&larr;</Link>
          <div>
            <h1 className="font-display text-[1.6rem] leading-tight font-bold text-ink">Analytics</h1>
            <p className="text-[0.85rem] text-ink-3">{bizName} · Performance overview</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SignOut />
          {isSuper && (
            <select value={pickedBizId} onChange={(e) => setPickedBizId(e.target.value)} className="text-[0.85rem] font-bold px-3 py-2.5 rounded-[12px] border border-border bg-white text-ink outline-none hover:border-ink-3 transition max-w-[44vw] truncate shadow-sm cursor-pointer" title="Business">
              {businesses.length === 0 && <option value="">Loading…</option>}
              {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="text-[0.85rem] font-bold px-3 py-2.5 rounded-[12px] border border-border bg-white outline-none hover:border-ink-3 transition shadow-sm cursor-pointer">
            <option>Today</option><option>This Week</option><option>This Month</option>
          </select>
          <button onClick={downloadCSV} className="text-[0.85rem] font-bold px-4 py-2.5 rounded-[12px] text-white transition shadow-[0_8px_20px_rgba(49,92,255,0.25)] hover:-translate-y-px flex items-center gap-2" style={{ background: "#315cff" }}>
            📥 Download CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.l} className="bg-white border border-border rounded-[18px] p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className="text-[0.8rem] font-bold uppercase tracking-wide text-ink-3">{s.l}</span>
              <span className="grid place-items-center w-10 h-10 rounded-[12px] text-[1.1rem]" style={{ background: s.bg }}>{s.icon}</span>
            </div>
            <div className="num text-[2rem] font-display font-bold text-ink leading-none mb-1.5">{s.v}</div>
            <div className="text-[0.8rem] font-semibold text-live" style={{ color: s.color }}>{s.c}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6 mb-8">
        <div className="bg-white border border-border rounded-[20px] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="font-display text-[1.25rem] font-bold text-ink">Tokens Per Hour</div>
            <div className="text-[0.85rem] font-medium text-ink-3">Peak &middot; <span className="font-bold text-ink-2">{fmtHour(a.peakHour)}</span> ({a.hourly[a.peakHour]}/hr)</div>
          </div>
          <div className="flex items-end gap-2 h-40">
            {HOURS.map((h) => {
              const count = a.hourly[h];
              const height = Math.round((count / a.maxH) * 100);
              const peak = h === a.peakHour && count > 0;
              return (
                <div key={h} className="flex-1 flex flex-col items-center justify-end h-full group" title={`${count} tokens`}>
                  <div className="relative w-full h-full flex items-end justify-center">
                    <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(height, 2)}%`, background: peak ? "var(--dng)" : "#315cff", opacity: peak ? 1 : count === 0 ? 0.15 : 0.8 }} />
                    <div className="absolute bottom-full mb-1 text-[0.7rem] font-bold text-ink opacity-0 group-hover:opacity-100 transition-opacity">{count}</div>
                  </div>
                  <span className="text-[0.7rem] uppercase font-bold text-ink-3 mt-2">{shortHour(h)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-border rounded-[20px] p-6 shadow-sm flex flex-col">
          <div className="font-display text-[1.25rem] font-bold text-ink mb-6">By Service</div>
          <div className="flex flex-col gap-4 flex-1 justify-center">
            {a.byService.length === 0 && <div className="text-[0.85rem] text-ink-3">No data yet.</div>}
            {a.byService.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-[0.85rem] mb-1.5">
                  <span className="font-bold text-ink truncate pr-2">{s.name}</span>
                  <span className="num font-bold text-ink-3">{s.pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-surface-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-[20px] p-6 shadow-sm">
        <div className="font-display text-[1.25rem] font-bold text-ink mb-4">Staff Performance</div>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full border-collapse" style={{ minWidth: 400 }}>
            <thead>
              <tr>{["Staff", "Tokens served", "Share"].map((h) => (
                <th key={h} className="text-left text-[0.75rem] font-bold uppercase tracking-wider text-ink-3 pb-3 border-b border-border">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {a.staffPerf.map((s) => (
                <tr key={s.name} className="group hover:bg-surface-2 transition-colors border-b border-border/50 last:border-0">
                  <td className="py-4 pr-3 text-[0.9rem] font-bold text-ink">{s.name}</td>
                  <td className="num py-4 pr-3 text-[0.95rem] font-bold text-ink">{s.served}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full overflow-hidden bg-surface-2 min-w-[80px]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${s.share}%`, background: "#315cff" }} />
                      </div>
                      <span className="num text-[0.85rem] font-bold text-ink-3 w-10 text-right">{s.share}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {a.staffPerf.length === 0 && <tr><td colSpan={3} className="text-center text-[0.85rem] text-ink-3 py-8">No served-token data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

    </main>
  );
}
