"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Smartphone,
  Building2,
  Bell,
  Mail,
  Lock,
  Shield,
  UserCog,
  ArrowRightCircle,
} from "lucide-react";
import { signIn, signInWithGoogle, getRole, homeFor } from "@/lib/auth";

/* ── Inline styles matching the home-page hero design language ── */

const leftPanelStyle: React.CSSProperties = {
  background:
    "linear-gradient(120deg,rgba(14,23,38,.98),rgba(24,36,59,.92)),linear-gradient(90deg,rgba(0,168,135,.2) 1px,transparent 1px),linear-gradient(0deg,rgba(255,255,255,.06) 1px,transparent 1px)",
  backgroundSize: "auto,88px 88px,88px 88px",
};

const boltStyle: React.CSSProperties = {
  display: "block",
  width: 14,
  height: 22,
  background: "linear-gradient(180deg,#ffe066,#ffb22c)",
  clipPath: "polygon(58% 0,17% 48%,45% 48%,31% 100%,88% 35%,57% 35%)",
  filter: "drop-shadow(0 1px 2px rgba(16,24,40,.2))",
  transform: "rotate(8deg)",
};

const brandIconStyle: React.CSSProperties = {
  background: "linear-gradient(135deg,#315cff 0%,#315cff 64%,#59d4d1 100%)",
  boxShadow: "0 12px 26px rgba(49,92,255,.32)",
};

const previewCardStyle: React.CSSProperties = {
  borderColor: "rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.06)",
};

const iconBoxStyle: React.CSSProperties = {
  background: "rgba(255,255,255,.1)",
};

const statusPillStyle: React.CSSProperties = {
  borderColor: "rgba(255,255,255,.12)",
  background: "rgba(255,255,255,.06)",
  color: "rgba(255,255,255,.78)",
};

const features = [
  { icon: MapPin, color: "text-[#06d6a0]", title: "Live queue tracking", sub: "Real-time position updates for every customer" },
  { icon: Smartphone, color: "text-[#4361ee]", title: "Mobile token booking", sub: "QR scan, link, or kiosk — no app download" },
  { icon: Building2, color: "text-[#f77f00]", title: "Multi-branch control", sub: "Independent queues, counters, and permissions" },
  { icon: Bell, color: "text-[#f472b6]", title: "Smart notifications", sub: "Push, SMS, and WhatsApp alerts before turn" },
];

const demo = [
  { role: "Admin", email: "admin@waitless.app", sub: "Business", iconColor: "#4361ee", bgColor: "rgba(67,97,238,.1)", Icon: Shield },
  { role: "Staff", email: "staff@waitless.app", sub: "Counter", iconColor: "#06d6a0", bgColor: "rgba(6,214,160,.1)", Icon: UserCog },
  { role: "Super", email: "super@waitless.app", sub: "Platform", iconColor: "#7209b7", bgColor: "rgba(114,9,183,.08)", Icon: ({ size, style }: { size: number; style: React.CSSProperties }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={style.color as string} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 .682.557l5.857 1.353a.5.5 0 0 1 .27.846l-4.072 4.283a1 1 0 0 0-.255.775l.643 6.006a.5.5 0 0 1-.717.514L12.463 20.6a1 1 0 0 0-.926 0l-5.335 2.604a.5.5 0 0 1-.717-.514l.643-6.006a1 1 0 0 0-.255-.775L1.8 11.626a.5.5 0 0 1 .27-.846l5.857-1.353a1 1 0 0 0 .682-.557z"/>
    </svg>
  )},
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function doLogin(em: string, p: string) {
    setErr(""); setBusy(true);
    try {
      const cred = await signIn(em, p);
      const role = await getRole(cred.user.uid);
      router.replace(homeFor(role));
    } catch (error: any) {
      console.error("Email Auth Error:", error);
      setErr("Login failed: " + (error?.message || "Check console."));
      setBusy(false);
    }
  }

  async function googleLogin() {
    setErr(""); setBusy(true);
    try {
      const cred = await signInWithGoogle();
      const role = await getRole(cred.user.uid);
      router.replace(homeFor(role));
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      setErr("Google login failed: " + (error?.message || "Check console."));
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full flex justify-center overflow-x-hidden">
      {/* ═══════════════ BACKGROUND SPLIT LAYER ═══════════════ */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className="hidden lg:block w-1/2 h-full relative" style={leftPanelStyle}>
          {/* Subtle radial glow */}
          <div className="absolute bottom-0 right-0 w-[80%] h-[60%] opacity-70"
            style={{ background: "radial-gradient(ellipse at 100% 100%, rgba(49,92,255,.16), transparent 70%)" }} />
        </div>
        <div className="w-full lg:w-1/2 h-full" style={{ background: "linear-gradient(180deg,#f5f8fd 0%,#fff 100%)" }} />
      </div>

      {/* ═══════════════ CONTENT LAYER ═══════════════ */}
      <div className="relative z-10 w-full max-w-[1120px] grid lg:grid-cols-2">
        
        {/* LEFT PANEL */}
        <div className="hidden lg:flex flex-col justify-center pr-12 text-white py-12">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-12">
            <span className="grid place-items-center w-[38px] h-[38px] rounded-[10px]" style={brandIconStyle}>
              <span style={boltStyle} />
            </span>
            <span className="font-display font-black text-[1.3rem]">Waitless</span>
          </div>

          {/* Status pill */}
          <div className="inline-flex items-center gap-[9px] mb-10 px-3.5 py-2 border rounded-full text-[0.82rem] font-extrabold w-fit" style={statusPillStyle}>
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--lv)", boxShadow: "0 0 0 6px rgba(6,214,160,.18)" }} />
            Live queue management for busy service teams
          </div>

          {/* Headline */}
          <h1 className="font-display font-extrabold text-[clamp(2.2rem,3.5vw,3rem)] leading-[1.05] tracking-tight mb-[18px] max-w-[440px]">
            Sign in to manage your queue.
          </h1>
          <p className="text-[1.05rem] leading-[1.7] max-w-[400px] mb-[42px]" style={{ color: "rgba(255,255,255,.68)" }}>
            One dashboard for tokens, counters, branches, and analytics. Built for teams that serve people every day.
          </p>

          {/* Feature cards */}
          <div className="flex flex-col gap-3 max-w-[480px]">
            {features.map((f) => (
              <div key={f.title} className="flex items-center gap-[14px] py-[14px] px-[18px] border rounded-[10px] transition hover:bg-white/10" style={previewCardStyle}>
                <div className="w-10 h-10 rounded-[10px] grid place-items-center shrink-0" style={iconBoxStyle}>
                  <f.icon size={20} className={f.color} />
                </div>
                <div>
                  <strong className="block text-[0.92rem] font-bold mb-[2px]">{f.title}</strong>
                  <span className="text-[0.78rem]" style={{ color: "rgba(255,255,255,.52)" }}>{f.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-col justify-center items-center lg:items-end px-6 sm:px-10 py-12">
          <div className="w-full max-w-[420px]">
            {/* Brand (visible on mobile only) */}
            <Link href="/" className="flex lg:hidden items-center gap-[10px] justify-center mb-8">
              <span className="grid place-items-center w-9 h-9 rounded-[10px]" style={{ ...brandIconStyle, boxShadow: "0 8px 20px rgba(49,92,255,.25)" }}>
                <span style={{ ...boltStyle, width: 12, height: 19 }} />
              </span>
              <span className="font-display text-[1.4rem] font-black text-ink">Wait<span className="text-acc">less</span></span>
            </Link>

            {/* Form card */}
            <div className="bg-white border border-border rounded-[20px] p-8" style={{ boxShadow: "0 18px 45px rgba(16,24,40,.10)" }}>
              <h1 className="font-display text-[1.5rem] font-extrabold text-ink mb-1.5">Welcome back</h1>
              <p className="text-[0.88rem] text-ink-3 mb-6">Sign in to access your Waitless dashboard.</p>

              {/* Google sign-in */}
              <button onClick={googleLogin} disabled={busy}
                className="w-full flex items-center justify-center gap-2.5 py-[13px] rounded-xl border border-border bg-white text-ink font-semibold text-[0.88rem] hover:bg-surface-2 hover:shadow-[0_4px_12px_rgba(16,24,40,.06)] transition disabled:opacity-50 mb-5 cursor-pointer">
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3.5 mb-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[0.72rem] text-ink-3">or with email</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email */}
              <label className="block mb-4">
                <span className="text-[0.81rem] font-semibold text-ink-2">Email</span>
                <div className="relative mt-[7px]">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"><Mail size={18} /></span>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    inputMode="email"
                    className="w-full pl-11 pr-3.5 py-3 rounded-xl border border-border bg-white text-[0.92rem] text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)] transition"
                  />
                </div>
              </label>

              {/* Password */}
              <label className="block mb-5">
                <span className="text-[0.81rem] font-semibold text-ink-2">Password</span>
                <div className="relative mt-[7px]">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"><Lock size={18} /></span>
                  <input
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    type="password"
                    placeholder="••••••••"
                    className="w-full pl-11 pr-3.5 py-3 rounded-xl border border-border bg-white text-[0.92rem] text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)] transition"
                  />
                </div>
              </label>

              {/* Error */}
              {err && <p className="text-[0.82rem] mb-3" style={{ color: "var(--dng)" }}>{err}</p>}

              {/* Sign in button */}
              <button onClick={() => doLogin(email, pw)} disabled={busy || !email || !pw}
                className="w-full py-[14px] rounded-xl text-[0.92rem] font-bold text-white transition-all disabled:opacity-50 cursor-pointer hover:-translate-y-px"
                style={{ background: "#315cff", boxShadow: "0 14px 30px rgba(49,92,255,.28)" }}>
                {busy ? "Signing in…" : "Sign in"}
              </button>

              {/* Sign-up link */}
              <p className="text-center text-[0.8rem] text-ink-3 mt-3.5">
                New business? <Link href="/signup" className="font-semibold text-acc hover:underline">Create a free account</Link>
              </p>

              {/* ── Demo Section ── */}
              <div className="mt-[22px] pt-5 border-t border-border">
                <p className="text-[0.7rem] font-bold uppercase tracking-wider text-ink-3 mb-3">Try a demo</p>

                {/* Customer experience button */}
                <button onClick={() => router.push("/app")}
                  className="w-full flex items-center justify-center gap-[9px] py-3 rounded-[10px] text-[0.86rem] font-bold text-white transition-all cursor-pointer hover:-translate-y-px mb-3.5"
                  style={{ background: "#315cff", boxShadow: "0 10px 24px rgba(49,92,255,.24)" }}>
                  <ArrowRightCircle size={18} />
                  <div className="text-left">
                    <div>Explore Customer Experience</div>
                    <small className="text-[0.72rem] font-medium opacity-85">No login required</small>
                  </div>
                </button>

                <p className="text-[0.72rem] text-ink-3 mb-2.5">Or sign in to a staff / business account:</p>

                {/* Demo role cards */}
                <div className="grid grid-cols-3 gap-2.5">
                  {demo.map((d) => (
                    <button
                      key={d.role}
                      onClick={() => doLogin(d.email, "waitless123")}
                      disabled={busy}
                      className="flex flex-col items-center gap-1 py-4 px-2.5 rounded-xl border border-border bg-white transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(16,24,40,.08)] hover:border-acc/30 disabled:opacity-50"
                    >
                      <div className="w-[44px] h-[44px] rounded-xl grid place-items-center mb-1" style={{ background: d.bgColor }}>
                        <d.Icon size={22} style={{ color: d.iconColor }} />
                      </div>
                      <div className="text-[0.86rem] font-bold text-ink">{d.role}</div>
                      <div className="text-[0.7rem] text-ink-3">{d.sub}</div>
                    </button>
                  ))}
                </div>

                <p className="text-center text-[0.7rem] text-ink-3 mt-2.5">All demo accounts use password: <strong className="font-semibold">waitless123</strong></p>
              </div>
            </div>

            {/* Back to home */}
            <Link href="/" className="block text-center text-[0.82rem] text-ink-3 mt-[18px] hover:text-ink-2 transition">← Back to home</Link>
          </div>
        </div>

      </div>
    </main>
  );
}
