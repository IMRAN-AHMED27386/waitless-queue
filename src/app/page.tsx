import Link from "next/link";
import NavAuth from "@/components/NavAuth";

const stats = [
  { n: "50K+", l: "Daily Tokens" },
  { n: "340+", l: "Businesses" },
  { n: "99.9%", l: "Uptime" },
  { n: "7", l: "Industries" },
];

const industries = [
  "🏥 Hospitals", "💊 Clinics", "✂️ Salons", "🏦 Banks",
  "🏛️ Government", "🍽️ Restaurants", "🔧 Service Centers",
];

const features = [
  { ic: "📱", t: "Mobile Token Booking", d: "Customers scan a QR or open a link to join the queue. No app download needed." },
  { ic: "⚡", t: "Realtime Updates", d: "Live position tracking, wait times, and a push notification as the turn approaches." },
  { ic: "🎛️", t: "Feature Toggles", d: "Switch on exactly what your business needs — SMS, WhatsApp, voice, analytics." },
  { ic: "📊", t: "Analytics & Reports", d: "Daily stats, peak hours, staff performance, and CSV / PDF export." },
  { ic: "🏢", t: "Multi-Branch", d: "Run unlimited branches, each with its own queues, staff and services." },
  { ic: "📺", t: "TV Queue Display", d: "A fullscreen board for waiting areas — multi-counter, voice announcements." },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 sm:px-8 h-16 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-[10px] text-white text-lg"
            style={{ background: "linear-gradient(135deg,#4361EE,#818CF8)" }}>⚡</span>
          <span className="font-display text-xl font-extrabold text-ink">
            Wait<span className="text-acc">less</span>
          </span>
        </div>
        <NavAuth />
      </nav>

      {/* Hero */}
      <section className="px-5 sm:px-8 max-w-6xl mx-auto w-full">
        <div className="relative overflow-hidden rounded-[20px] px-6 sm:px-12 py-12 sm:py-16 text-white"
          style={{ background: "linear-gradient(135deg,#0D1B3E 0%,#1A3A8F 55%,#0D1B3E 100%)" }}>
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
              style={{ background: "rgba(67,97,238,.3)", color: "#93C5FD", border: "1px solid rgba(147,197,253,.2)" }}>
              ✦ Smart Queue Management SaaS
            </span>
            <h1 className="font-display font-bold leading-[1.12] tracking-[-0.005em] text-[30px] sm:text-[38px] lg:text-[46px] mb-3 [text-wrap:balance] [-webkit-font-smoothing:antialiased]">
              No more waiting<br />in line — for <span style={{ color: "#93C5FD" }}>any</span> business
            </h1>
            <p className="text-[15px] leading-relaxed mb-7" style={{ color: "rgba(255,255,255,.62)" }}>
              Customers take a token from their phone, track the live queue, and get
              notified when their turn is near. Staff and owners manage everything from
              one dashboard.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/app" className="text-center font-semibold text-white px-6 py-3 rounded-xl bg-acc hover:bg-acc-dark transition">
                Customer Demo →
              </Link>
              <Link href="/board" className="text-center font-semibold px-6 py-3 rounded-xl transition"
                style={{ background: "rgba(255,255,255,.12)", border: "1.5px solid rgba(255,255,255,.25)", color: "#fff" }}>
                Live Display ↗
              </Link>
              <Link href="/login" className="text-center font-semibold px-6 py-3 rounded-xl bg-white text-ink hover:brightness-95 transition">
                Get Started
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10">
              {stats.map((s) => (
                <div key={s.l}>
                  <div className="num text-2xl font-bold">{s.n}</div>
                  <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,.48)" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="px-5 sm:px-8 max-w-6xl mx-auto w-full mt-10">
        <h2 className="font-display text-lg font-bold text-ink mb-1">Built for every industry</h2>
        <p className="text-sm text-ink-3 mb-4">One platform, fully configurable</p>
        <div className="flex flex-wrap gap-2">
          {industries.map((i) => (
            <span key={i} className="text-sm font-semibold text-ink-2 px-3.5 py-2 rounded-full bg-surface border border-border">
              {i}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-5 sm:px-8 max-w-6xl mx-auto w-full mt-10">
        <h2 className="font-display text-lg font-bold text-ink mb-1">Everything you need</h2>
        <p className="text-sm text-ink-3 mb-4">Powerful features, zero complexity</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map((f) => (
            <div key={f.t} className="bg-surface border border-border rounded-2xl p-4 flex gap-3.5 items-start" style={{ boxShadow: "var(--sh)" }}>
              <span className="grid place-items-center w-10 h-10 rounded-xl text-lg shrink-0 bg-surface-2">{f.ic}</span>
              <div>
                <div className="font-display text-[15px] font-bold text-ink mb-1">{f.t}</div>
                <div className="text-[13px] text-ink-3 leading-snug">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-5 sm:px-8 max-w-6xl mx-auto w-full mt-10">
        <h2 className="font-display text-lg font-bold text-ink mb-1">Simple pricing</h2>
        <p className="text-sm text-ink-3 mb-4">Start free, scale as you grow</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-3">Free</div>
            <div className="num text-3xl font-bold text-ink mt-1">$0<span className="text-sm text-ink-3 font-normal"> /mo</span></div>
            <ul className="mt-4 flex flex-col gap-2 text-[13px] text-ink-2">
              <li>✓ 1 branch</li><li>✓ 2 counters</li><li>✓ Online booking</li><li>✓ Basic analytics</li>
            </ul>
            <Link href="/login" className="block text-center mt-5 py-2.5 rounded-xl font-semibold text-sm border border-border text-ink-2 hover:bg-surface-2 transition">Get started free</Link>
          </div>
          <div className="rounded-2xl p-5 relative" style={{ border: "1.5px solid var(--acc)", background: "linear-gradient(to bottom,#EEF1FF,#fff)" }}>
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white px-3 py-0.5 rounded-full bg-acc whitespace-nowrap">Most Popular</span>
            <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-3">Pro</div>
            <div className="num text-3xl font-bold text-ink mt-1">$29<span className="text-sm text-ink-3 font-normal"> /mo</span></div>
            <ul className="mt-4 flex flex-col gap-2 text-[13px] text-ink-2">
              <li>✓ 5 branches</li><li>✓ Unlimited counters</li><li>✓ SMS + WhatsApp</li><li>✓ Advanced analytics</li><li>✓ CSV / PDF export</li>
            </ul>
            <Link href="/login" className="block text-center mt-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-acc hover:bg-acc-dark transition">Start free trial</Link>
          </div>
          <div className="bg-surface border border-border rounded-2xl p-5">
            <div className="text-[11px] uppercase tracking-wide font-semibold text-ink-3">Enterprise</div>
            <div className="num text-2xl font-bold text-ink mt-1">Custom</div>
            <ul className="mt-4 flex flex-col gap-2 text-[13px] text-ink-2">
              <li>✓ Unlimited branches</li><li>✓ White-label</li><li>✓ API access</li><li>✓ Custom integrations</li><li>✓ Dedicated support</li>
            </ul>
            <Link href="/login" className="block text-center mt-5 py-2.5 rounded-xl font-semibold text-sm border border-border text-ink-2 hover:bg-surface-2 transition">Contact sales</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 sm:px-8 max-w-6xl mx-auto w-full mt-12 mb-8 pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-display font-extrabold text-ink">
            Wait<span className="text-acc">less</span>
          </span>
          <span className="text-xs text-ink-3">© 2026 Waitless · Smart queue & token management</span>
        </div>
      </footer>
    </main>
  );
}
