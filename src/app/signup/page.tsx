"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { Zap, Shield } from "lucide-react";
import { signUp } from "@/lib/auth";
import { onboardBusiness, BUSINESS_CATEGORIES } from "@/lib/db";
import { DEFAULT_COUNTRIES } from "@/lib/countries";

/* ── Inline styles matching the home-page & login hero design language ── */

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

export default function Signup() {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState(BUSINESS_CATEGORIES[0]);
  const [country, setCountry] = useState(DEFAULT_COUNTRIES[0].code);
  const [location, setLocation] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const valid = businessName.trim() && ownerName.trim() && email.trim() && pw.length >= 6;

  async function submit() {
    if (!valid || busy) return;
    setErr(""); setBusy(true);
    try {
      await signUp(email.trim(), pw);
    } catch (e: any) {
      setBusy(false);
      console.error("Signup error:", e);
      if (e instanceof FirebaseError && e.code === "auth/email-already-in-use") {
        setErr("That email already has an account — sign in instead.");
      } else if (e instanceof FirebaseError && e.code === "auth/weak-password") {
        setErr("Password must be at least 6 characters.");
      } else {
        setErr("Couldn't create your account: " + (e?.message || "Unknown error"));
      }
      return;
    }
    try {
      await onboardBusiness({ businessName: businessName.trim(), category, country, location: location.trim(), ownerName: ownerName.trim() });
      router.replace("/admin");
    } catch (e: any) {
      setBusy(false);
      console.error("Business setup error:", e);
      setErr("Your account was created, but setting up your business failed. Please sign in and contact support.");
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
            <span className="w-2 h-2 rounded-full" style={{ background: "#06d6a0", boxShadow: "0 0 0 6px rgba(6,214,160,.18)" }} />
            Start your free 30-day Pro trial today
          </div>

          {/* Headline */}
          <h1 className="font-display font-extrabold text-[clamp(2.2rem,3.5vw,3rem)] leading-[1.05] tracking-tight mb-[18px] max-w-[440px]">
            Set up your queue in minutes.
          </h1>
          <p className="text-[1.05rem] leading-[1.7] max-w-[400px] mb-[42px]" style={{ color: "rgba(255,255,255,.68)" }}>
            Join thousands of service teams worldwide streamlining their operations. No credit card required to start.
          </p>

          {/* Feature cards */}
          <div className="flex flex-col gap-3 max-w-[480px]">
            <div className="flex items-center gap-[14px] py-[14px] px-[18px] border rounded-[10px] transition hover:bg-white/10" style={previewCardStyle}>
              <div className="w-10 h-10 rounded-[10px] grid place-items-center shrink-0" style={iconBoxStyle}>
                <Zap size={20} color="#ffe066" />
              </div>
              <div>
                <strong className="block text-[0.92rem] font-bold mb-[2px]">Instant Setup</strong>
                <span className="text-[0.78rem]" style={{ color: "rgba(255,255,255,.52)" }}>Ready to accept customers immediately</span>
              </div>
            </div>

            <div className="flex items-center gap-[14px] py-[14px] px-[18px] border rounded-[10px] transition hover:bg-white/10" style={previewCardStyle}>
              <div className="w-10 h-10 rounded-[10px] grid place-items-center shrink-0" style={iconBoxStyle}>
                <Shield size={20} color="#06d6a0" />
              </div>
              <div>
                <strong className="block text-[0.92rem] font-bold mb-[2px]">Enterprise Grade</strong>
                <span className="text-[0.78rem]" style={{ color: "rgba(255,255,255,.52)" }}>Secure, reliable, and scales with your business</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL (SIGNUP FORM) */}
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
              <h1 className="font-display text-[1.5rem] font-extrabold text-ink mb-1.5">Create your account</h1>
              <p className="text-[0.88rem] text-ink-3 mb-6">Enter your details to get started.</p>

              {/* Business Name */}
              <label className="block mb-4">
                <span className="block text-[0.81rem] font-semibold text-ink-2 mb-1.5">Business Name</span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Clinic"
                  className="w-full px-[14px] py-3 rounded-xl border border-border bg-white text-[0.92rem] text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)] transition"
                />
              </label>

              {/* Category & Country Grid */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <label className="block">
                  <span className="block text-[0.81rem] font-semibold text-ink-2 mb-1.5">Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-[14px] py-3 rounded-xl border border-border bg-white text-[0.92rem] text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)] transition"
                  >
                    {BUSINESS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[0.81rem] font-semibold text-ink-2 mb-1.5">Country</span>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-[14px] py-3 rounded-xl border border-border bg-white text-[0.92rem] text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)] transition"
                  >
                    {DEFAULT_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
                  </select>
                </label>
              </div>

              <div className="h-px bg-border my-5" />

              {/* City */}
              <label className="block mb-4">
                <span className="block text-[0.81rem] font-semibold text-ink-2 mb-1.5">City / Location</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="New York"
                  className="w-full px-[14px] py-3 rounded-xl border border-border bg-white text-[0.92rem] text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)] transition"
                />
              </label>

              {/* Your Name */}
              <label className="block mb-4">
                <span className="block text-[0.81rem] font-semibold text-ink-2 mb-1.5">Your Name</span>
                <input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-[14px] py-3 rounded-xl border border-border bg-white text-[0.92rem] text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)] transition"
                />
              </label>

              {/* Email */}
              <label className="block mb-4">
                <span className="block text-[0.81rem] font-semibold text-ink-2 mb-1.5">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  type="email"
                  className="w-full px-[14px] py-3 rounded-xl border border-border bg-white text-[0.92rem] text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)] transition"
                />
              </label>

              {/* Password */}
              <label className="block mb-6">
                <span className="block text-[0.81rem] font-semibold text-ink-2 mb-1.5">Password</span>
                <input
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  type="password"
                  placeholder="At least 6 characters"
                  className="w-full px-[14px] py-3 rounded-xl border border-border bg-white text-[0.92rem] text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(67,97,238,.1)] transition"
                />
              </label>

              {/* Error */}
              {err && <p className="text-[0.82rem] mb-4" style={{ color: "var(--dng)" }}>{err}</p>}

              {/* Submit Button */}
              <button
                onClick={submit}
                disabled={!valid || busy}
                className="w-full py-[14px] rounded-xl text-[0.92rem] font-bold text-white transition-all disabled:opacity-50 cursor-pointer hover:-translate-y-px mb-4"
                style={{ background: "#315cff", boxShadow: "0 14px 30px rgba(49,92,255,.28)" }}
              >
                {busy ? "Creating account…" : "Create my account →"}
              </button>

              {/* Login Link */}
              <p className="text-center text-[0.8rem] text-ink-3">
                Already have an account? <Link href="/login" className="font-semibold text-acc hover:underline">Sign in</Link>
              </p>

            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
