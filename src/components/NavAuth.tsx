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
      <div className="flex items-center gap-2.5">
        <button onClick={() => signOutUser()} className="text-sm font-semibold text-ink-2 px-3 py-2 rounded-[10px] hover:bg-surface-2 transition">
          Sign out
        </button>
        <Link href={homeFor(user.role)} className="text-sm font-semibold text-white px-4 py-2.5 rounded-[10px] bg-acc hover:bg-acc-dark transition">
          {label}
        </Link>
      </div>
    );
  }

  return (
    <Link href="/login" className="text-sm font-semibold text-white px-4 py-2.5 rounded-[10px] bg-acc hover:bg-acc-dark transition">
      Sign in
    </Link>
  );
}
