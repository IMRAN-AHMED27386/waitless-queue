"use client";

import Link from "next/link";
import { useState } from "react";
import NavAuth from "@/components/NavAuth";

const stats = [
  { n: "50K+", l: "daily tokens" },
  { n: "340+", l: "businesses" },
  { n: "18m", l: "avg. wait saved" },
  { n: "99.9%", l: "uptime" },
];

const industries = [
  { i: "H", l: "Hospitals" },
  { i: "C", l: "Clinics" },
  { i: "S", l: "Salons" },
  { i: "B", l: "Banks" },
  { i: "G", l: "Government" },
  { i: "R", l: "Restaurants" },
];

const features = [
  { n: "01", t: "Mobile token booking", d: "Customers join through QR, link, or kiosk and see their place in line from any phone." },
  { n: "02", t: "Realtime updates", d: "Automatic alerts keep customers nearby without forcing them to stand in a physical queue." },
  { n: "03", t: "Service toggles", d: "Switch queues, counters, staff, branches, WhatsApp alerts, voice calls, and analytics on as needed." },
  { n: "04", t: "Analytics and reports", d: "Track peak hours, service duration, staff performance, missed turns, and exportable reports." },
  { n: "05", t: "Multi-branch control", d: "Run separate branches with independent services, counters, queues, permissions, and displays." },
  { n: "06", t: "TV queue display", d: "Show live tokens, counter numbers, announcements, and service lanes on a waiting-room screen." },
];

const prices = [
  { plan: "Free", name: "Starter desk", price: "$0", period: "/mo", items: ["1 service queue", "1,000 monthly tokens", "QR booking and live TV board", "Basic analytics"], link: "/login", label: "Get started free", featured: false },
  { plan: "Pro", name: "Growing branch", price: "$299", period: "/mo", items: ["Unlimited services and tokens", "5 branches included", "Advanced analytics and CSV export", "WhatsApp alerts add-on", "30-day free trial"], link: "/login", label: "Start free trial", featured: true },
  { plan: "Enterprise", name: "Network rollout", price: "$599", period: "+ Custom", items: ["Unlimited branches", "White-label setup", "API access", "Custom integrations", "Dedicated support"], link: "/login", label: "Contact sales", featured: false },
];

const tabContent = [
  {
    title: "Customers join without crowding the desk.",
    body: "Scan a QR code, choose the service, receive a live token, and get notified before the turn arrives.",
    checks: ["No app download required", "WhatsApp, SMS, and web alerts", "Clear wait time and position"],
  },
  {
    title: "Staff can call, skip, transfer, and close tokens fast.",
    body: "Counters get a focused view of the current token, next customer, wait time, and service notes.",
    checks: ["One-click call next", "Transfer between services", "Missed-turn recovery"],
  },
  {
    title: "Owners see pressure before it becomes chaos.",
    body: "Branch-level dashboards show service speed, peak windows, missed tokens, and staffing signals.",
    checks: ["Live branch comparison", "Peak-hour reporting", "Exportable daily summaries"],
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const tab = tabContent[activeTab];

  return (
    <main className="flex-1" style={{ background: "linear-gradient(180deg,#edf2fb 0,#f7f9fd 38rem,#ffffff 76rem)" }}>
      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] text-white overflow-hidden" style={{ background: "linear-gradient(120deg,rgba(14,23,38,.98),rgba(24,36,59,.92)),linear-gradient(90deg,rgba(0,168,135,.2) 1px,transparent 1px),linear-gradient(0deg,rgba(255,255,255,.06) 1px,transparent 1px)", backgroundSize: "auto,88px 88px,88px 88px" }}>
        {/* Fade to page bg */}
        <div className="absolute inset-x-0 bottom-0 h-56 pointer-events-none -z-0" style={{ background: "linear-gradient(180deg,rgba(245,247,251,0),#edf2fb)" }} />

        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between gap-5 h-[72px] max-w-[1120px] mx-auto px-6" aria-label="Primary navigation">
          <Link href="/" className="flex items-center gap-[11px] font-display font-black text-xl text-white">
            <span className="relative grid place-items-center w-[34px] h-[34px] rounded-lg overflow-hidden" style={{ background: "linear-gradient(135deg,#315cff 0%,#315cff 64%,#59d4d1 100%)", boxShadow: "0 12px 26px rgba(49,92,255,.32)" }}>
              <span className="block w-[13px] h-[21px]" style={{ background: "linear-gradient(180deg,#ffe066,#ffb22c)", clipPath: "polygon(58% 0,17% 48%,45% 48%,31% 100%,88% 35%,57% 35%)", filter: "drop-shadow(0 1px 2px rgba(16,24,40,.2))", transform: "rotate(8deg)" }} />
            </span>
            Waitless
          </Link>
          <div className="hidden lg:flex items-center gap-2 text-[0.92rem]" style={{ color: "rgba(255,255,255,.74)" }}>
            <a href="#workflow" className="px-3 py-2.5 rounded-lg hover:bg-white/10 hover:text-white transition">Workflow</a>
            <a href="#industries" className="px-3 py-2.5 rounded-lg hover:bg-white/10 hover:text-white transition">Industries</a>
            <a href="#features" className="px-3 py-2.5 rounded-lg hover:bg-white/10 hover:text-white transition">Features</a>
            <a href="#pricing" className="px-3 py-2.5 rounded-lg hover:bg-white/10 hover:text-white transition">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <NavAuth />
          </div>
        </nav>

        {/* Hero grid */}
        <div className="relative z-10 grid lg:grid-cols-[minmax(0,0.98fr)_minmax(420px,1.02fr)] items-center gap-[46px] max-w-[1120px] mx-auto px-6 py-[54px] lg:min-h-[calc(92vh-72px)]">
          <div className="max-w-[650px]">
            <div className="inline-flex items-center gap-[9px] mb-[22px] px-3 py-2 border rounded-full text-[0.82rem] font-extrabold" style={{ borderColor: "rgba(255,255,255,.18)", background: "rgba(255,255,255,.08)", color: "rgba(255,255,255,.84)" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: "var(--lv)", boxShadow: "0 0 0 7px rgba(6,214,160,.18)" }} />
              Live queue management for busy service teams
            </div>
            <h1 className="font-display font-extrabold text-[4.4rem] lg:text-[4.4rem] leading-[0.98] tracking-0 mb-5 max-w-[770px]" style={{ fontSize: "clamp(2.58rem,5vw,4.4rem)" }}>
              Turn waiting rooms into calm, predictable flow.
            </h1>
            <p className="mb-7 max-w-[620px] text-[1.08rem] leading-[1.75]" style={{ color: "rgba(255,255,255,.74)" }}>
              Waitless gives customers a token from their phone, shows staff what to call next, and gives owners a live view of every branch before queues become a problem.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-[34px]">
  <Link href="/app" className="btn bg-indigo-600 text-white hover:bg-indigo-700">
    Launch Demo →
  </Link>
  <Link href="/login" className="btn">
    Get Started
  </Link>
</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-[640px]">
              {stats.map((s) => (
                <div key={s.l} className="min-h-[86px] p-[15px] border rounded-lg" style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)" }}>
                  <strong className="block mb-1 text-[1.45rem] font-extrabold">{s.n}</strong>
                  <span className="text-[0.8rem]" style={{ color: "rgba(255,255,255,.62)" }}>{s.l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Product board mockup */}
          <div className="relative min-h-[540px]">
            <div className="absolute right-0 top-[26px] w-full lg:w-[560px] min-h-[456px] border rounded-lg p-0 overflow-hidden" style={{ borderColor: "rgba(255,255,255,.15)", background: "rgba(255,255,255,.1)", boxShadow: "0 28px 80px rgba(0,0,0,.34)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-between min-h-[58px] px-[18px] border-b" style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.08)" }}>
                <strong className="text-[0.95rem]">Island Branch Command</strong>
                <span className="inline-flex items-center gap-[7px] min-h-[28px] px-[10px] rounded-full text-[0.76rem] font-extrabold" style={{ background: "rgba(6,214,160,.16)", color: "#9ff5df" }}><span className="w-2 h-2 rounded-full bg-live" /> 7 counters live</span>
              </div>
              <div className="grid grid-cols-[1.05fr_0.95fr] gap-[14px] p-4">
                <div className="p-3 border rounded-lg" style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(7,12,22,.44)" }}>
                  {[
                    { ticket: "A18", title: "Now serving", sub: "Counter 04 · Clinic desk", wait: "0m" },
                    { ticket: "A19", title: "Next customer", sub: "SMS sent · arriving soon", wait: "4m" },
                    { ticket: "B07", title: "Priority lane", sub: "Document verification", wait: "7m" },
                  ].map((q) => (
                    <div key={q.ticket} className="grid grid-cols-[48px_1fr_auto] items-center gap-[10px] min-h-[62px] p-[10px] rounded-lg mb-[10px] last:mb-0" style={{ background: "rgba(255,255,255,.08)" }}>
                      <span className="grid place-items-center w-[44px] h-[44px] rounded-lg num font-black text-white" style={{ background: "rgba(49,92,255,.22)" }}>{q.ticket}</span>
                      <div><strong className="block mb-1 text-[0.9rem]">{q.title}</strong><span className="text-[0.78rem]" style={{ color: "rgba(255,255,255,.58)" }}>{q.sub}</span></div>
                      <span className="num font-black text-[0.86rem]">{q.wait}</span>
                    </div>
                  ))}
                </div>
                <div className="relative min-h-[224px] p-[14px] border rounded-lg overflow-hidden" style={{ borderColor: "rgba(255,255,255,.12)", background: "linear-gradient(135deg,rgba(255,178,44,.16),rgba(0,168,135,.1)),rgba(7,12,22,.44)" }}>
                  <div className="absolute inset-4 border border-dashed rounded-lg" style={{ borderColor: "rgba(255,255,255,.18)" }} />
                  <div className="relative flex items-center justify-between gap-[10px] mb-[18px] text-[0.85rem] font-black" style={{ color: "rgba(255,255,255,.82)" }}>
                    <span>Branch load</span><span>India · New Delhi</span>
                  </div>
                  <span className="absolute left-[28%] top-[48%] w-[13px] h-[13px] rounded-full border-2 border-white" style={{ background: "var(--lv)", boxShadow: "0 0 0 9px rgba(6,214,160,.18)" }} />
                  <span className="absolute right-[25%] top-[38%] w-[13px] h-[13px] rounded-full border-2 border-white" style={{ background: "var(--wn)", boxShadow: "0 0 0 9px rgba(247,127,0,.16)" }} />
                  <span className="absolute right-[36%] bottom-[24%] w-[13px] h-[13px] rounded-full border-2 border-white" style={{ background: "var(--dng)", boxShadow: "0 0 0 9px rgba(239,35,60,.16)" }} />
                </div>
              </div>
            </div>

            {/* Insight strip */}
            <div className="hidden lg:block absolute left-0 bottom-[54px] w-[258px] p-[14px] border rounded-lg" style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(7,12,22,.44)", boxShadow: "0 22px 46px rgba(0,0,0,.2)" }}>
              <div className="flex items-end gap-2 h-[88px] mb-3">
                {["38%", "62%", "80%", "55%", "72%"].map((h, i) => (
                  <span key={i} className="flex-1 min-w-[12px] rounded-t-[5px]" style={{ height: h, background: ["var(--lv)", "#7fc7ff", "var(--wn)", "var(--acc)", "var(--dng)"][i] }} />
                ))}
              </div>
              <strong className="block text-[0.9rem] mb-1">Peak predicted at 3:20 PM</strong>
              <small className="text-[0.74rem]" style={{ color: "rgba(255,255,255,.58)" }}>Open Counter 06 to keep wait time under 12 minutes.</small>
            </div>

            {/* Phone mockup */}
            <div className="hidden lg:block absolute right-6 bottom-[2px] w-[212px] min-h-[318px] p-[13px] border rounded-lg" style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(7,12,22,.44)", boxShadow: "0 22px 46px rgba(0,0,0,.26)" }}>
              <div className="min-h-[292px] rounded-lg p-[14px]" style={{ background: "#f9fbff", color: "var(--t1)" }}>
                <div className="flex justify-between items-center text-[0.72rem] font-black mb-[17px]" style={{ color: "#475467" }}><span>9:41</span><span>Waitless</span></div>
                <div className="grid place-items-center w-[96px] h-[96px] mx-auto mb-4 rounded-full border-[9px] bg-white num text-[1.8rem] font-black" style={{ borderColor: "#e7eefc", color: "var(--acc)" }}>A19</div>
                <h3 className="mb-[7px] text-[1rem] text-center font-display">Your turn is close</h3>
                <p className="max-w-[148px] mx-auto mb-[14px] text-[0.77rem] leading-[1.45] text-center text-ink-3">Stay nearby. We will alert you when Counter 04 is ready.</p>
                <div className="overflow-hidden h-2 rounded-full" style={{ background: "#e6ebf5" }}><span className="block w-[68%] h-full rounded-full bg-live" /></div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: phone card below board */}
        <div className="lg:hidden relative z-10 max-w-[1120px] mx-auto px-6 pb-[104px]">
          <div className="grid grid-cols-1 gap-4 -mt-8">
            <div className="p-[13px] border rounded-lg mx-auto w-[212px]" style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(7,12,22,.44)", boxShadow: "0 22px 46px rgba(0,0,0,.26)" }}>
              <div className="min-h-[292px] rounded-lg p-[14px]" style={{ background: "#f9fbff", color: "var(--t1)" }}>
                <div className="flex justify-between items-center text-[0.72rem] font-black mb-[17px]" style={{ color: "#475467" }}><span>9:41</span><span>Waitless</span></div>
                <div className="grid place-items-center w-[96px] h-[96px] mx-auto mb-4 rounded-full border-[9px] bg-white num text-[1.8rem] font-black" style={{ borderColor: "#e7eefc", color: "var(--acc)" }}>A19</div>
                <h3 className="mb-[7px] text-[1rem] text-center font-display">Your turn is close</h3>
                <p className="max-w-[148px] mx-auto mb-[14px] text-[0.77rem] leading-[1.45] text-center text-ink-3">Stay nearby. We will alert you when Counter 04 is ready.</p>
                <div className="overflow-hidden h-2 rounded-full" style={{ background: "#e6ebf5" }}><span className="block w-[68%] h-full rounded-full bg-live" /></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Workflow ── */}
      <section id="workflow" className="max-w-[1120px] mx-auto px-6 py-[84px]">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-7 mb-7">
          <div>
            <div className="mb-[10px] text-[0.78rem] font-black uppercase text-acc">Product workflow</div>
            <h2 className="font-display text-[clamp(1.7rem,3vw,2.15rem)] font-extrabold leading-[1.13] max-w-[680px]">One system for customers, counters, and owners.</h2>
          </div>
          <p className="max-w-[380px] text-ink-3 leading-[1.6]">The interface is designed around the real queue journey, not a list of disconnected features.</p>
        </div>

        <div className="border border-border rounded-lg bg-surface overflow-hidden" style={{ boxShadow: "0 18px 45px rgba(16,24,40,.12)" }}>
          <div className="grid grid-cols-3 border-b border-border" style={{ background: "#eef3fb" }} role="tablist">
            {["Customer token", "Staff counter", "Owner dashboard"].map((t, i) => (
              <button key={t} onClick={() => setActiveTab(i)} role="tab" aria-selected={activeTab === i}
                className="min-h-[58px] border-0 border-r last:border-r-0 border-border font-black text-[0.92rem] cursor-pointer transition"
                style={{ background: activeTab === i ? "#fff" : "transparent", color: activeTab === i ? "var(--t1)" : "#475467", boxShadow: activeTab === i ? "inset 0 -3px 0 var(--lv)" : "none" }}>
                {t}
              </button>
            ))}
          </div>
          <div className="grid lg:grid-cols-[0.82fr_1.18fr] min-h-[424px]">
            <div className="p-[34px] lg:border-r border-border bg-surface">
              <h3 className="font-display text-[1.55rem] font-extrabold mb-3">{tab.title}</h3>
              <p className="text-ink-3 leading-[1.65]">{tab.body}</p>
              <ul className="grid gap-3 my-6">
                {tab.checks.map((c) => (
                  <li key={c} className="flex items-center gap-[10px] font-bold" style={{ color: "#344054" }}>
                    <span className="grid place-items-center w-[22px] h-[22px] rounded-full shrink-0 text-[0.78rem]" style={{ background: "#dff8ef", color: "#047857" }}>✓</span>
                    {c}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="btn btn-primary">Start with a free queue</Link>
            </div>
            <div className="p-[22px]" style={{ background: "linear-gradient(180deg,#f7faff,#eef4ff)" }}>
              <div className="grid grid-cols-[1fr_0.82fr] gap-[14px] h-full">
                <div className="p-[18px] border rounded-lg bg-surface" style={{ borderColor: "#dbe4f4", boxShadow: "0 10px 26px rgba(16,24,40,.08)" }}>
                  <div className="flex justify-between items-center gap-3 mb-4 font-black"><span>TV queue board</span><span className="text-[0.78rem] text-ink-3">Live display</span></div>
                  <div className="grid grid-cols-2 gap-3 mb-[14px]">
                    <div className="min-h-[130px] p-[18px] rounded-lg text-white flex flex-col" style={{ background: "#0D1B3E" }}>
                      <small className="font-extrabold" style={{ color: "rgba(255,255,255,.65)" }}>Serving</small>
                      <strong className="num text-[2.2rem] mt-3">A18</strong>
                      <span style={{ color: "rgba(255,255,255,.65)" }}>Counter 04</span>
                    </div>
                    <div className="min-h-[130px] p-[18px] rounded-lg text-white flex flex-col" style={{ background: "#11392f" }}>
                      <small className="font-extrabold" style={{ color: "rgba(255,255,255,.65)" }}>Next</small>
                      <strong className="num text-[2.2rem] mt-3">A19</strong>
                      <span style={{ color: "rgba(255,255,255,.65)" }}>SMS sent</span>
                    </div>
                  </div>
                  <div className="grid gap-[10px]">
                    {["B07","C12","A20"].map((t) => (
                      <div key={t} className="flex items-center justify-between min-h-[42px] px-3 rounded-lg font-extrabold" style={{ background: "#f2f6fd", color: "#344054" }}><span>{t}</span></div>
                    ))}
                  </div>
                </div>
                <div className="grid content-between p-[18px] border rounded-lg bg-surface min-h-full" style={{ borderColor: "#dbe4f4", boxShadow: "0 10px 26px rgba(16,24,40,.08)" }}>
                  <div>
                    <div className="flex justify-between items-center gap-3 font-black"><span>Join queue</span><span className="text-[0.78rem] text-ink-3">QR</span></div>
                    <div className="grid grid-cols-5 gap-[5px] w-[150px] h-[150px] mx-auto my-4 p-[9px] border rounded-lg bg-surface" style={{ borderColor: "#d8e1f0" }}>
                      {Array.from({ length: 25 }).map((_, i) => (
                        <span key={i} className="rounded-[2px]" style={{ background: i % 3 === 0 || i % 4 === 0 ? "#e6edf7" : "var(--t1)" }} />
                      ))}
                    </div>
                    <p className="text-ink-3 leading-[1.5] text-center">Scan to choose your service and get a live token.</p>
                  </div>
                  <Link href="/app" className="btn btn-light">Preview customer flow</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Industries ── */}
      <section id="industries" className="py-12" style={{ background: "var(--sbg)" }}>
        <div className="grid lg:grid-cols-[0.68fr_1.32fr] gap-[34px] items-center max-w-[1120px] mx-auto px-6 text-white">
          <div>
            <div className="mb-[10px] text-[0.78rem] font-black uppercase text-acc">Built for high traffic desks</div>
            <h2 className="font-display text-[clamp(1.7rem,3vw,1.85rem)] font-extrabold leading-[1.13]">Configurable for the places where people actually wait.</h2>
            <p className="mt-3 leading-[1.6]" style={{ color: "rgba(255,255,255,.65)" }}>Create services, counters, languages, branch rules, and alerts without rebuilding the product for every industry.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-[10px]">
            {industries.map((ind) => (
              <div key={ind.l} className="flex items-center gap-[10px] min-h-[64px] p-3 border rounded-lg font-extrabold" style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)" }}>
                <span className="grid place-items-center w-[34px] h-[34px] rounded-lg shrink-0" style={{ background: "rgba(255,255,255,.1)", color: "var(--wn)" }}>{ind.i}</span>
                {ind.l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="max-w-[1120px] mx-auto px-6 py-[84px]">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-7 mb-7">
          <div>
            <div className="mb-[10px] text-[0.78rem] font-black uppercase text-acc">Everything you need</div>
            <h2 className="font-display text-[clamp(1.7rem,3vw,2.15rem)] font-extrabold leading-[1.13] max-w-[680px]">Less waiting outside. Better control inside.</h2>
          </div>
          <p className="max-w-[380px] text-ink-3 leading-[1.6]">Designed for daily operation: simple enough for staff, detailed enough for owners.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
          {features.map((f) => (
            <article key={f.n} className="min-h-[238px] p-[22px] border border-border rounded-lg bg-surface" style={{ boxShadow: "0 10px 26px rgba(16,24,40,.08)" }}>
              <div className="grid place-items-center w-[42px] h-[42px] mb-[18px] rounded-lg font-black" style={{ background: "#edf4ff", color: "var(--acc)" }}>{f.n}</div>
              <h3 className="font-display text-[1.08rem] font-extrabold mb-[10px]">{f.t}</h3>
              <p className="text-ink-3 leading-[1.6]">{f.d}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="max-w-[1120px] mx-auto px-6 pt-[30px] pb-[84px]">
        <div className="flex flex-col lg:flex-row justify-between items-end gap-7 mb-7">
          <div>
            <div className="mb-[10px] text-[0.78rem] font-black uppercase text-acc">Pricing</div>
            <h2 className="font-display text-[clamp(1.7rem,3vw,2.15rem)] font-extrabold leading-[1.13] max-w-[680px]">Start with one queue, then scale to every branch.</h2>
          </div>
          <p className="max-w-[380px] text-ink-3 leading-[1.6]">Simple pricing that grows cleanly from a single counter to a national rollout.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-[14px] items-stretch">
          {prices.map((p) => (
            <article key={p.name} className="relative flex flex-col min-h-[420px] p-6 border rounded-lg bg-surface" style={{ boxShadow: p.featured ? "0 18px 45px rgba(49,92,255,.14)" : "0 10px 26px rgba(16,24,40,.08)", borderColor: p.featured ? "var(--acc)" : "var(--bd)" }}>
              {p.featured && <span className="absolute top-[18px] right-[18px] rounded-full px-[10px] py-[6px] text-[0.72rem] font-black" style={{ background: "#eaf0ff", color: "var(--acc)" }}>Most popular</span>}
              <small className="text-ink-3 font-black uppercase">{p.plan}</small>
              <h3 className="font-display text-[1.4rem] font-extrabold mt-3 mb-2">{p.name}</h3>
              <div className="flex items-end gap-1.5 mt-0 mb-[22px] font-black num">
                <span className="text-[2.4rem]">{p.price}</span>
                {p.period && <span className="pb-[7px] text-[0.86rem] font-extrabold text-ink-3">{p.period}</span>}
              </div>
              <ul className="grid gap-[13px] mb-[26px] text-[0.92rem] leading-[1.42]" style={{ color: "#344054" }}>
                {p.items.map((it) => (
                  <li key={it} className="before:content-[''] before:inline-block before:w-[7px] before:h-[7px] before:mr-[10px] before:rounded-full before:bg-live before:align-[1px]">{it}</li>
                ))}
              </ul>
              <Link href={p.link} className={`btn ${p.featured ? "btn-primary" : "btn-light"} mt-auto w-full`}>{p.label}</Link>
            </article>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border bg-surface">
        <div className="flex flex-col sm:flex-row items-center sm:items-center justify-between gap-5 min-h-[92px] max-w-[1120px] mx-auto px-6 text-[0.9rem] text-ink-3">
          <Link href="/" className="flex items-center gap-[11px] font-display font-black text-xl text-ink">
            <span className="relative grid place-items-center w-[34px] h-[34px] rounded-lg overflow-hidden" style={{ background: "linear-gradient(135deg,#315cff 0%,#315cff 64%,#59d4d1 100%)", boxShadow: "0 12px 26px rgba(49,92,255,.32)" }}>
              <span className="block w-[13px] h-[21px]" style={{ background: "linear-gradient(180deg,#ffe066,#ffb22c)", clipPath: "polygon(58% 0,17% 48%,45% 48%,31% 100%,88% 35%,57% 35%)", filter: "drop-shadow(0 1px 2px rgba(16,24,40,.2))", transform: "rotate(8deg)" }} />
            </span>
            Waitless
          </Link>
          <span>© 2026 Waitless · Smart queue and token management</span>
        </div>
      </footer>

      {/* ── Shared button styles (injected inline for this page) ── */}
      <style jsx>{`
        .btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          min-height: 44px; padding: 0 18px; border: 1px solid var(--bd);
          border-radius: 8px; background: #fff; color: var(--t1);
          font-weight: 800; cursor: pointer;
          transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
          white-space: nowrap; text-decoration: none;
        }
        .btn:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0,0,0,.16); }
        .btn-primary {
          background: #315cff; color: #fff; border-color: transparent;
          box-shadow: 0 14px 30px rgba(49,92,255,.32);
        }
        .btn-primary:hover { background: #1e45d6; }
        .btn-ghost {
          background: rgba(255,255,255,.1); color: #fff;
          border-color: rgba(255,255,255,.2); backdrop-filter: blur(12px);
        }
        .btn-ghost:hover { background: rgba(255,255,255,.18); transform: translateY(-1px); }
        .btn-light { border-color: var(--bd); background: #fff; color: var(--t1); }
        .btn-light:hover { box-shadow: 0 10px 22px rgba(0,0,0,.06); }
      `}</style>
    </main>
  );
}