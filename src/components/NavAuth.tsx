"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onUser, signOutUser, homeFor, type AppUser } from "@/lib/auth";

export default function NavAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => onUser((u) => { setUser(u); setLoaded(true); }), []);

  // Avoid a flash of "Sign in" before auth resolves.
  if (!loaded) return <div className="w-[120px] h-9" aria-hidden="true" />;

  if (user) {
    const label = user.role === "customer" ? "Open app" : "Dashboard";
    return (
      <div className="flex items-center gap-3">
        <button onClick={() => signOutUser()} className="text-sm font-semibold text-white/70 hover:text-white px-2 py-2 transition cursor-pointer">
          Sign out
        </button>
        <Link href={homeFor(user.role)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#315cff] text-white font-extrabold text-[0.88rem] no-underline shadow-[0_12px_24px_rgba(49,92,255,.28)] hover:bg-[#1e45d6] hover:-translate-y-px transition-all">
          {label}
        </Link>
      </div>
    );
  }

  return (
    <Link href="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#315cff] text-white font-extrabold text-[0.88rem] no-underline shadow-[0_12px_24px_rgba(49,92,255,.28)] hover:bg-[#1e45d6] hover:-translate-y-px transition-all">
      Sign in
    </Link>
  );
}
