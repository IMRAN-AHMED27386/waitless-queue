"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  Mail,
  Lock,
  Shield,
  UserCog,
  Crown,
  MapPin,
  Smartphone,
  Building2,
  Bell,
  ArrowRightCircle,
} from "lucide-react";
import { signIn, signInWithGoogle, getRole, homeFor } from "@/lib/auth";

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
    } catch {
      setErr("Wrong email or password.");
      setBusy(false);
    }
  }

  async function googleLogin() {
    setErr(""); setBusy(true);
    try {
      const cred = await signInWithGoogle();
      const role = await getRole(cred.user.uid);
      router.replace(homeFor(role));
    } catch {
      setErr("Google sign-in was cancelled or failed.");
      setBusy(false);
    }
  }

  const demo = [
    { role: "Admin", email: "admin@waitless.app", color: "var(--acc)" },
    { role: "Staff", email: "staff@waitless.app", color: "#06D6A0" },
    { role: "Super", email: "super@waitless.app", color: "var(--pur)" },
  ];

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-6xl lg:grid-cols-2 gap-12 items-center">

        <div className="hidden lg:flex flex-col justify-center">
  <div className="inline-flex items-center gap-3 mb-8">
    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white text-2xl shadow-lg">
      <span className="text-2xl">⚡</span>
    </div>
    <div>
      <h1 className="text-4xl font-black text-ink">Waitless</h1>
      <p className="text-ink-3">Modern Queue Management Platform</p>
    </div>
  </div>

  <h2 className="text-5xl font-black leading-tight text-ink">
    Reduce Waiting.<br />
    Improve Experience.
  </h2>

  <p className="mt-6 text-lg text-ink-3 max-w-lg">
    Built for hospitals, clinics, banks, restaurants, salons and government offices.
  </p>

  <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-md border border-slate-200 w-fit">
    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
    <span className="text-sm font-medium text-slate-700">System Status: Online</span>
  </div>

  <div className="mt-10 grid gap-4">
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"><div className="flex items-center gap-3">

  <MapPin size={20} className="text-red-500" />

  <span>Live Queue Tracking</span>

</div></div>
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"><div className="flex items-center gap-3">
  <Smartphone size={20} className="text-blue-500" />
  <span>QR Code Check-in</span>
</div></div>
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"><div className="flex items-center gap-3">
  <Building2 size={20} className="text-indigo-500" />
  <span>Multi-Branch Management</span>
</div></div>
    <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm"><div className="flex items-center gap-3">
  <Bell size={20} className="text-amber-500" />
  <span>Real-time Notifications</span>
</div></div>
  </div>
</div>

        <div className="w-full max-w-md lg:max-w-lg mx-auto">
          <Link href="/" className="flex items-center gap-2 justify-center mb-6">
            <span
  className="grid place-items-center w-12 h-12 rounded-[10px] shadow-lg"
  style={{ background: "linear-gradient(135deg,#4361EE,#818CF8)" }}
>
  <span className="text-xl">⚡</span>
</span>
            <span className="font-display text-2xl font-black text-ink">Wait<span className="text-acc">less</span></span>
          </Link>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl">
            <h1 className="font-display text-2xl font-black text-ink">Welcome back</h1>
            <p className="mt-2 mb-6 text-sm text-ink-3">
              Sign in to access your Waitless dashboard.
            </p>

            <button onClick={googleLogin} disabled={busy}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl border border-border bg-surface text-ink font-semibold text-[14px] hover:bg-slate-50 hover:shadow-sm transition disabled:opacity-50 mb-4">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/></svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-border"></div>
              <span className="text-[11px] text-ink-3">or with email</span>
              <div className="flex-1 h-px bg-border"></div>
            </div>

            <label className="block mb-3">
              <span className="text-[13px] font-semibold text-ink-2">Email</span>
              <div className="relative mt-1.5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
  <Mail size={18} />
</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  inputMode="email"
                  className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc"
                />
              </div>
            </label>
            <label className="block mb-4">
              <span className="text-[13px] font-semibold text-ink-2">Password</span>
              <div className="relative mt-1.5">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
  <Lock size={18} />
</span>
                <input
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  className="w-full pl-11 pr-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc"
                />
              </div>
            </label>

            {err && <p className="text-[13px] mb-3" style={{ color: "var(--dng)" }}>{err}</p>}

            <button onClick={() => doLogin(email, pw)} disabled={busy || !email || !pw}
              className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white transition disabled:opacity-50 bg-indigo-600 hover:bg-indigo-700">
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <p className="text-center text-xs text-ink-3 mt-3">
              New business? <Link href="/signup" className="font-semibold text-acc">Create a free account</Link>
            </p>

            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-[11px] uppercase tracking-wide font-semibold text-ink-3 mb-2">Try a demo</p>
              <button onClick={() => router.push("/app")}
                className="w-full mb-3 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-acc hover:bg-acc-dark transition">
                <div className="flex flex-col items-center leading-tight">
  <div className="flex items-center gap-2 font-semibold">
    <ArrowRightCircle size={18} />
    <span>Explore Customer Experience</span>
  </div>
  <span className="text-xs opacity-90">
    No login required
  </span>
</div>
              </button>
              <p className="text-[11px] text-ink-3 mb-2">Or sign in to a staff / business account:</p>
              <div className="grid grid-cols-3 gap-3">
  {demo.map((d) => {
    const icon =
      d.role === "Admin" ? (
        <Shield size={26} className="text-blue-600" />
      ) : d.role === "Staff" ? (
        <UserCog size={26} className="text-emerald-600" />
      ) : (
        <Crown size={26} className="text-violet-600" />
      );

    const subtitle =
      d.role === "Admin"
        ? "Platform"
        : d.role === "Staff"
        ? "Reception"
        : "Owner";

    return (
      <button
        key={d.role}
        onClick={() => doLogin(d.email, "waitless123")}
        disabled={busy}
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all disabled:opacity-50"
      >
        <div className="text-xl">{icon}</div>

        <div className="mt-1 text-[14px] font-bold text-slate-800">
          {d.role}
        </div>

        <div className="text-[11px] text-slate-500">
          {subtitle}
        </div>
      </button>
    );
  })}
</div>
              <p className="text-[11px] text-ink-3 mt-2 text-center">All demo accounts use password: waitless123</p>
            </div>
          </div>

          <Link href="/" className="block text-center text-[13px] text-ink-3 mt-4 hover:text-ink-2">← Back to home</Link>
        </div>
      </div>
    </main>
  );
}
