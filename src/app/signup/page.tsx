"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { signUp } from "@/lib/auth";
import { onboardBusiness, BUSINESS_CATEGORIES } from "@/lib/db";
import { DEFAULT_COUNTRIES } from "@/lib/countries";

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
    } catch (e) {
      setBusy(false);
      if (e instanceof FirebaseError && e.code === "auth/email-already-in-use") {
        setErr("That email already has an account — sign in instead.");
      } else if (e instanceof FirebaseError && e.code === "auth/weak-password") {
        setErr("Password must be at least 6 characters.");
      } else {
        setErr("Couldn't create your account. Please try again.");
      }
      return;
    }
    try {
      await onboardBusiness({ businessName: businessName.trim(), category, country, location: location.trim(), ownerName: ownerName.trim() });
      router.replace("/admin");
    } catch {
      setBusy(false);
      setErr("Your account was created, but setting up your business failed. Please sign in and contact support.");
    }
  }

  return (
    <main className="flex-1 w-full bg-page flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center gap-2 justify-center mb-6">
          <span className="grid place-items-center w-9 h-9 rounded-[10px] text-white text-lg" style={{ background: "linear-gradient(135deg,#4361EE,#818CF8)" }}>⚡</span>
          <span className="font-display text-xl font-extrabold text-ink">Wait<span className="text-acc">less</span></span>
        </Link>

        <div className="bg-surface border border-border rounded-2xl p-6" style={{ boxShadow: "var(--sh)" }}>
          <h1 className="font-display text-xl font-bold text-ink mb-1">Start your free account</h1>
          <p className="text-sm text-ink-3 mb-5">Set up your queue in under a minute — no card required. Includes a <span className="font-semibold text-ink-2">30-day free Pro trial</span>.</p>

          <label className="block mb-3">
            <span className="text-[13px] font-semibold text-ink-2">Business name</span>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Acme Clinic"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc" />
          </label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-2">Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc">
                {BUSINESS_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[13px] font-semibold text-ink-2">Country</span>
              <select value={country} onChange={(e) => setCountry(e.target.value)}
                className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc">
                {DEFAULT_COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.name}</option>)}
              </select>
            </label>
          </div>

          <div className="h-px bg-border my-4" />

          <label className="block mb-3">
            <span className="text-[13px] font-semibold text-ink-2">City / Location</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc" />
          </label>

          <label className="block mb-3">
            <span className="text-[13px] font-semibold text-ink-2">Your name</span>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Full name"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc" />
          </label>
          <label className="block mb-3">
            <span className="text-[13px] font-semibold text-ink-2">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" inputMode="email"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc" />
          </label>
          <label className="block mb-4">
            <span className="text-[13px] font-semibold text-ink-2">Password</span>
            <input value={pw} onChange={(e) => setPw(e.target.value)} type="password" placeholder="At least 6 characters"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-[15px] outline-none focus:border-acc" />
          </label>

          {err && <p className="text-[13px] mb-3" style={{ color: "var(--dng)" }}>{err}</p>}

          <button onClick={submit} disabled={!valid || busy}
            className="w-full py-3 rounded-xl font-semibold text-white transition disabled:opacity-50 bg-acc hover:bg-acc-dark">
            {busy ? "Setting up your account…" : "Create my account →"}
          </button>

          <p className="text-center text-xs text-ink-3 mt-4">
            Already have an account? <Link href="/login" className="font-semibold text-acc">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
