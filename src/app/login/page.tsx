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
} from "lucide-react";
import { signIn, signInWithGoogle, getRole, homeFor, resetPassword } from "@/lib/auth";

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

export default function Login() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [fieldErrs, setFieldErrs] = useState<{ email?: string; pw?: string }>({});
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  async function doLogin(em: string, p: string) {
    setErr("");
    setFieldErrs({});
    if (!em.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.trim())) {
      setFieldErrs({ email: "Please enter a valid email address." });
      return;
    }
    if (!p) {
      setFieldErrs({ pw: "Please enter your password." });
      return;
    }

    setBusy(true);
    try {
      const cred = await signIn(em.trim(), p);
      const role = await getRole(cred.user.uid);
      router.replace(homeFor(role));
    } catch (error: any) {
      console.error("Email Auth Error:", error);
      const code = error?.code;
      if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
        setErr("Incorrect email or password.");
      } else if (code === "auth/too-many-requests") {
        setErr("Too many failed attempts. Please try again later.");
      } else {
        setErr("Login failed. Please try again.");
      }
      setBusy(false);
    }
  }

  async function googleLogin() {
    setErr(""); setFieldErrs({}); setBusy(true);
    try {
      const cred = await signInWithGoogle();
      const role = await getRole(cred.user.uid);
      router.replace(homeFor(role));
    } catch (error: any) {
      console.error("Google Auth Error:", error);
      if (error?.code !== "auth/popup-closed-by-user" && error?.code !== "auth/cancelled-popup-request") {
        setErr("Google sign-in was canceled or failed.");
      }
      setBusy(false);
    }
  }

  async function handleReset() {
    setFieldErrs({});
    setErr("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFieldErrs({ email: "Please enter a valid email address." });
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (error: any) {
      console.error("Reset Error:", error);
      if (error?.code === "auth/user-not-found") {
        setErr("No account found with this email.");
      } else {
        setErr("Could not send reset email. Please try again.");
      }
    }
    setBusy(false);
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

              {/* ── FORGOT PASSWORD MODE ── */}
              {resetMode ? (
                <>
                  <h1 className="font-display text-[1.5rem] font-extrabold text-ink mb-1.5">Reset password</h1>
                  <p className="text-[0.88rem] text-ink-3 mb-6">Enter your email and we&apos;ll send a reset link.</p>

                  {resetSent ? (
                    <div className="text-center py-6">
                      <div className="text-[2.5rem] mb-3">✉️</div>
                      <p className="text-[1rem] font-bold text-ink mb-2">Check your inbox</p>
                      <p className="text-[0.85rem] text-ink-3 mb-5 leading-relaxed">We sent a password reset link to <strong className="text-ink-2">{email}</strong>. Follow the link to set a new password.</p>
                      <button onClick={() => { setResetMode(false); setResetSent(false); setErr(""); }}
                        className="text-[0.85rem] font-semibold text-acc hover:underline cursor-pointer">
                        ← Back to sign in
                      </button>
                    </div>
                  ) : (
                    <>
                      <label className="block mb-5">
                        <span className="text-[0.81rem] font-semibold text-ink-2">Email</span>
                        <div className="relative mt-[7px]">
                          <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${fieldErrs.email ? 'text-red-400' : 'text-ink-3'}`}><Mail size={18} /></span>
                          <input
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setFieldErrs(prev => ({...prev, email: undefined})); }}
                            placeholder="you@business.com"
                            inputMode="email"
                            className={`w-full pl-11 pr-3.5 py-3 rounded-xl border bg-white text-[0.92rem] text-ink outline-none transition ${
                              fieldErrs.email 
                                ? "border-red-500 bg-red-50/30 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,.15)]" 
                                : "border-border focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)]"
                            }`}
                          />
                        </div>
                        {fieldErrs.email && <p className="text-[0.78rem] text-red-500 mt-1.5 font-medium">{fieldErrs.email}</p>}
                      </label>

                      {err && <p className="text-[0.82rem] mb-3" style={{ color: "var(--dng)" }}>{err}</p>}

                      <button onClick={handleReset} disabled={busy}
                        className="w-full py-[14px] rounded-xl text-[0.92rem] font-bold text-white transition-all disabled:opacity-50 cursor-pointer hover:-translate-y-px"
                        style={{ background: "#315cff", boxShadow: "0 14px 30px rgba(49,92,255,.28)" }}>
                        {busy ? "Sending…" : "Send reset link"}
                      </button>

                      <p className="text-center text-[0.8rem] text-ink-3 mt-3.5">
                        <button onClick={() => { setResetMode(false); setErr(""); }} className="font-semibold text-acc hover:underline cursor-pointer">← Back to sign in</button>
                      </p>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* ── NORMAL SIGN-IN MODE ── */}
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
                      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${fieldErrs.email ? 'text-red-400' : 'text-ink-3'}`}><Mail size={18} /></span>
                      <input
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setFieldErrs(prev => ({...prev, email: undefined})); setErr(""); }}
                        placeholder="you@business.com"
                        inputMode="email"
                        className={`w-full pl-11 pr-3.5 py-3 rounded-xl border bg-white text-[0.92rem] text-ink outline-none transition ${
                          fieldErrs.email 
                            ? "border-red-500 bg-red-50/30 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,.15)]" 
                            : "border-border focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)]"
                        }`}
                      />
                    </div>
                    {fieldErrs.email && <p className="text-[0.78rem] text-red-500 mt-1.5 font-medium">{fieldErrs.email}</p>}
                  </label>

                  {/* Password */}
                  <label className="block mb-2">
                    <span className="text-[0.81rem] font-semibold text-ink-2">Password</span>
                    <div className="relative mt-[7px]">
                      <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${fieldErrs.pw ? 'text-red-400' : 'text-ink-3'}`}><Lock size={18} /></span>
                      <input
                        value={pw}
                        onChange={(e) => { setPw(e.target.value); setFieldErrs(prev => ({...prev, pw: undefined})); setErr(""); }}
                        type="password"
                        placeholder="••••••••"
                        className={`w-full pl-11 pr-3.5 py-3 rounded-xl border bg-white text-[0.92rem] text-ink outline-none transition ${
                          fieldErrs.pw 
                            ? "border-red-500 bg-red-50/30 focus:border-red-500 focus:shadow-[0_0_0_3px_rgba(239,68,68,.15)]" 
                            : "border-border focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)]"
                        }`}
                      />
                    </div>
                    {fieldErrs.pw && <p className="text-[0.78rem] text-red-500 mt-1.5 font-medium">{fieldErrs.pw}</p>}
                  </label>

                  {/* Forgot password link */}
                  <div className="text-right mb-4">
                    <button onClick={() => { setResetMode(true); setErr(""); }} className="text-[0.78rem] font-semibold text-acc hover:underline cursor-pointer">
                      Forgot password?
                    </button>
                  </div>

                  {/* Summary Error */}
                  {err && (
                    <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-50/50 border border-red-100 text-red-600 text-[0.82rem] font-medium">
                      <span className="mt-0.5">⚠️</span>
                      <p>{err}</p>
                    </div>
                  )}

                  {/* Sign in button */}
                  <button onClick={() => doLogin(email, pw)} disabled={busy}
                    className="w-full py-[14px] rounded-xl text-[0.92rem] font-bold text-white transition-all disabled:opacity-50 cursor-pointer hover:-translate-y-px mb-4"
                    style={{ background: "#315cff", boxShadow: "0 14px 30px rgba(49,92,255,.28)" }}>
                    {busy ? "Signing in…" : "Sign in"}
                  </button>

                  {/* Sign-up link */}
                  <p className="text-center text-[0.8rem] text-ink-3 mt-3.5">
                    New business? <Link href="/signup" className="font-semibold text-acc hover:underline">Create a free account</Link>
                  </p>
                </>
              )}
            </div>

            {/* Back to home */}
            <Link href="/" className="block text-center text-[0.82rem] text-ink-3 mt-[18px] hover:text-ink-2 transition">← Back to home</Link>
          </div>
        </div>

      </div>
    </main>
  );
}
