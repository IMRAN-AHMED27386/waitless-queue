"use client";

import { useRouter } from "next/navigation";
import { signOutUser } from "@/lib/auth";

export default function SignOut() {
  const router = useRouter();
  return (
    <button
      onClick={async () => { await signOutUser(); router.replace("/login"); }}
      className="text-[13px] font-semibold px-3 py-1.5 rounded-lg border border-border bg-surface text-ink-2 hover:bg-surface-2 transition"
    >
      Sign out
    </button>
  );
}
