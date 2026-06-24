"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { listenBusinessTokens, type HistTok } from "@/lib/db";
import { useAuthGuard } from "@/lib/auth";
import SignOut from "@/components/SignOut";

const BUSINESS = "sunshine-clinic";
const SVC_NAMES: Record<string, string> = { gen: "General Doctor", pha: "Pharmacy", ped: "Pediatrics", lab: "Lab Tests", den: "Dental", eye: "Eye Care" };
const SVC_COLORS = ["var(--acc)", "#06D6A0", "#E91E8C", "var(--wn)", "var(--pur)", "var(--t3)"];
const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i); // 7am..6pm
const fmtHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12} ${h >= 12 ? "PM" : "AM"}`;
const shortHour = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h >= 12 ? "p" : "a"}`;

export default function Analytics() {
  const { ready } = useAuthGuard(["admin", "super"]);
  const [period, setPeriod] = useState("Today");
  const [tokens, setTokens] = useState<HistTok[]>([]);

  useEffect(() => listenBusinessTokens(BUSINESS, setTokens), []);

  const a = useMemo(() => {
    const now = new Date();
    let cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // today 00:00
    if (period === "This Week") cutoff = new Date(now.getTime() - 7 * 86400000);
    else if (period === "This Month") cutoff = new Date(now.getTime() - 30 * 86400000);
    const filtered = tokens.filter((t) => t.createdAt && t.createdAt >= cutoff);

    const total = filtered.length;
    const cancelled = filtered.filter((t) => t.status === "cancelled").length;
    const served = filtered.filter((t) => t.status === "served").length;
    const hourly: Record<number, number> = {};
    HOURS.forEach((h) => (hourly[h] = 0));
    filtered.forEach((t) => { if (t.createdAt) { const h = t.createdAt.getHours(); if (h in hourly) hourly[h]++; } });
    const maxH = Math.max(1, ...HOURS.map((h) => hourly[h]));
    const peakHour = HOURS.reduce((p, h) => (hourly[h] > hourly[p] ? h : p), HOURS[0]);
    const byCount: Record<string, number> = {};
    filtered.forEach((t) => (byCount[t.serviceId] = (byCount[t.serviceId] ?? 0) + 1));
    const byService = Object.entries(byCount).sort((x, y) => y[1] - x[1]).slice(0, 4)
      .map(([id, n], i) => ({ name: SVC_NAMES[id] ?? id, pct: total ? Math.round((n / total) * 100) : 0, color: SVC_COLORS[i] }));
    const byStaff: Record<string, number> = {};
    filtered.forEach((t) => { if (t.status === "served" && t.servedBy) byStaff[t.servedBy] = (byStaff[t.servedBy] ?? 0) + 1; });
    const staffPerf = Object.entries(byStaff).sort((x, y) => y[1] - x[1])
      .map(([name, count]) => ({ name, served: count, share: served ? Math.round((count / served) * 100) : 0 }));
    return { total, cancelled, served, hourly, maxH, peakHour, byService, staffPerf };
  }, [tokens, period]);

  const stats = [
    { l: "Total Tokens", v: `${a.total}`, c: "today", icon: "🎫", bg: "var(--al)", color: "#06D6A0" },
    { l: "Served", v: `${a.served}`, c: `${a.total ? Math.round((a.served / a.total) * 100) : 0}% completion`, icon: "✅", bg: "rgba(6,214,160,.12)", color: "#06D6A0" },
    { l: "Peak Hour", v: fmtHour(a.peakHour), c: `${a.hourly[a.peakHour]} tokens/hr`, icon: "📈", bg: "rgba(247,127,0,.12)", color: "var(--wn)" },
    { l: "Cancellations", v: `${a.cancelled}`, c: "this period", icon: "❌", bg: "rgba(239,35,60,.12)", color: "var(--dng)" },
  ];

  function downloadCSV() {
    const rows: (string | number)[][] = [
      ["Waitless Analytics — Sunshine Clinic", period],
      [],
      ["Metric", "Value"],
      ["Total Tokens", a.total],
      ["Served", a.served],
      ["Cancelled", a.cancelled],
      ["Peak Hour", fmtHour(a.peakHour)],
      [],
      ["Hour", "Tokens"],
      ...HOURS.map((h) => [fmtHour(h), a.hourly[h]]),
      [],
      ["Service", "Share"],
      ...a.byService.map((s) => [s.name, `${s.pct}%`]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "waitless-analytics.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!ready) return <div className="flex-1 grid place-items-center text-ink-3 text-sm">Loading…</div>;

  return (
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Link href="/" className="grid place-items-center w-9 h-9 rounded-[10px] border border-border bg-surface text-ink-2" aria-label="Home">←</Link>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Analytics</h1>
            <p className="text-xs text-ink-3">{period} · Sunshine Clinic · live</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SignOut />
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="text-[13px] px-3 py-2 rounded-[10px] border border-border bg-surface outline-none">
            <option>Today</option><option>This Week</option><option>This Month</option>
          </select>
          <button onClick={downloadCSV} className="text-[13px] font-semibold px-3 py-2 rounded-[10px] border border-border bg-surface-2 text-ink hover:brightness-95">📥 CSV</button>
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
            <div className="text-[11.5px] font-semibold" style={{ color: s.color }}>{s.c}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-5 mb-5">
        <div className="bg-surface border border-border rounded-2xl p-4" style={{ boxShadow: "var(--sh)" }}>
          <div className="font-display font-bold text-ink mb-4">Tokens Per Hour</div>
          <div className="flex items-end gap-1.5 h-32">
            {HOURS.map((h) => {
              const count = a.hourly[h];
              const height = Math.round((count / a.maxH) * 100);
              const peak = h === a.peakHour && count > 0;
              return (
                <div key={h} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full" title={`${count} tokens`}>
                  <div className="w-full rounded-t-md transition-all" style={{ height: `${Math.max(height, 2)}%`, background: peak ? "var(--dng)" : "var(--acc)", opacity: peak ? 1 : count === 0 ? 0.2 : 0.75 }} />
                  <span className="text-[9px] text-ink-3 font-medium">{shortHour(h)}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-4" style={{ boxShadow: "var(--sh)" }}>
          <div className="font-display font-bold text-ink mb-4">By Service</div>
          <div className="flex flex-col gap-3">
            {a.byService.length === 0 && <div className="text-sm text-ink-3">No data yet.</div>}
            {a.byService.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="font-semibold text-ink">{s.name}</span>
                  <span className="num text-ink-3">{s.pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4" style={{ boxShadow: "var(--sh)" }}>
        <div className="font-display font-bold text-ink mb-3">Staff Performance</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 360 }}>
            <thead>
              <tr>{["Staff", "Tokens served", "Share"].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wide text-ink-3 px-3 py-2.5 bg-surface-2 border-b border-border">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {a.staffPerf.map((s) => (
                <tr key={s.name} className="hover:bg-surface-2">
                  <td className="px-3 py-3 text-[13px] font-semibold text-ink border-b border-border">{s.name}</td>
                  <td className="num px-3 py-3 text-[13px] text-ink border-b border-border">{s.served}</td>
                  <td className="px-3 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-surface-2 min-w-[60px]"><div className="h-full rounded-full" style={{ width: `${s.share}%`, background: "var(--acc)" }} /></div>
                      <span className="num text-[12px] text-ink-3 w-9 text-right">{s.share}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {a.staffPerf.length === 0 && <tr><td colSpan={3} className="text-center text-sm text-ink-3 py-6">No served-token data yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
