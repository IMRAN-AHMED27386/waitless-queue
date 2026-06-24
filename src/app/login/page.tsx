"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
    <main className="flex-1 w-full bg-page flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 justify-center mb-6">
          <span className="grid place-items-center w-9 h-9 rounded-[10px] text-white text-lg" style={{ background: "linear-gradient(135deg,#4361EE,#818CF8)" }}>⚡</span>
          <span className="font-display text-xl font-extrabold text-ink">Wait<span className="text-acc">less</span></span>
        </Link>

        <div className="bg-surface border border-border rounded-2xl p-6" style={{ boxShadow: "var(--sh)" }}>
          <h1 className="font-display text-xl font-bold text-ink mb-1">Sign in</h1>
          <p className="text-sm text-ink-3 mb-5">Staff &amp; business accounts</p>

          <button onClick={googleLogin} disabled={busy}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-border bg-surface text-ink font-semibold text-[14px] hover:bg-surface-2 transition disabled:opacity-50 mb-4">
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
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" inputMode="email"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc" />
          </label>
          <label className="block mb-4">
            <span className="text-[13px] font-semibold text-ink-2">Password</span>
            <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="••••••••"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc" />
          </label>

          {err && <p className="text-[13px] mb-3" style={{ color: "var(--dng)" }}>{err}</p>}

          <button onClick={() => doLogin(email, pw)} disabled={busy || !email || !pw}
            className="w-full py-3 rounded-xl font-semibold text-white transition disabled:opacity-50 bg-acc hover:bg-acc-dark">
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="mt-5 pt-4 border-t border-border">
            <p className="text-[11px] uppercase tracking-wide font-semibold text-ink-3 mb-2">Try a demo</p>
            <button onClick={() => router.push("/app")}
              className="w-full mb-3 py-2.5 rounded-lg text-[13px] font-semibold text-white bg-acc hover:bg-acc-dark transition">
              🎫 Continue as a Customer — no login
            </button>
            <p className="text-[11px] text-ink-3 mb-2">Or sign in to a staff / business account:</p>
            <div className="grid grid-cols-3 gap-2">
              {demo.map((d) => (
                <button key={d.role} onClick={() => doLogin(d.email, "waitless123")} disabled={busy}
                  className="py-2 rounded-lg text-[13px] font-semibold border border-border bg-surface-2 text-ink hover:brightness-95 transition disabled:opacity-50">
                  {d.role}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-ink-3 mt-2 text-center">Staff / Admin / Super password: waitless123</p>
          </div>
        </div>

        <Link href="/" className="block text-center text-[13px] text-ink-3 mt-4 hover:text-ink-2">← Back to home</Link>
      </div>
    </main>
  );
}
