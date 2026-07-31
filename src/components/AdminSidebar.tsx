"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listenBusiness, effectivePlan, trialDaysLeft, FREE_MONTHLY_TOKENS, tokensUsedThisMonth } from "@/lib/db";
import { signOutUser } from "@/lib/auth";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function AdminSidebar({
  active,
  bizId,
  isSuper = false,
}: {
  active: "dashboard" | "analytics" | "billing" | "board" | "settings" | "developers" | "super";
  bizId: string;
  isSuper?: boolean;
}) {
  const router = useRouter();
  const [bizDoc, setBizDoc] = useState<any>(null);

  useEffect(() => {
    if (!bizId) return;
    return listenBusiness(bizId, (b) => {
      setBizDoc(b);
    });
  }, [bizId]);

  const planNow = effectivePlan(bizDoc);
  const isTrial = bizDoc?.status === "trial" && planNow === "pro";
  const daysLeft = trialDaysLeft(bizDoc);

  async function doSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  const sidebarBg = isSuper
    ? "linear-gradient(180deg,#1c0a30 0%,#2a104a 100%)"
    : "linear-gradient(180deg,#0a1128 0%,#162550 100%)";
  const sidebarShadow = isSuper
    ? "4px 0 24px rgba(28,10,48,0.15)"
    : "4px 0 24px rgba(10,17,40,0.15)";
  const logoBg = isSuper
    ? "linear-gradient(135deg,#7209b7,#b5179e)"
    : "linear-gradient(135deg,#315cff,#59d4d1)";
  const logoShadow = isSuper
    ? "0 8px 24px rgba(114,9,183,.4)"
    : "0 8px 24px rgba(49,92,255,.4)";

  const getCls = (id: string) =>
    active === id
      ? "flex items-center gap-3 px-4 py-3.5 rounded-[12px] bg-white/10 text-white font-semibold transition shadow-sm border border-white/5"
      : "flex items-center gap-3 px-4 py-3.5 rounded-[12px] hover:bg-white/5 text-white/70 hover:text-white transition font-semibold";

  return (
    <div className="w-[280px] shrink-0 h-full flex flex-col justify-between text-white relative z-20" style={{ background: sidebarBg, boxShadow: sidebarShadow }}>
      <div className="p-7">
        <div className="flex items-center gap-3.5 mb-12">
          {bizDoc?.customLogoUrl && !isSuper ? (
            <img src={bizDoc.customLogoUrl} alt={bizDoc.name} className="h-11 max-w-[200px] object-contain" />
          ) : (
            <>
              <span className="grid place-items-center w-11 h-11 rounded-[12px] text-white text-xl" style={{ background: logoBg, boxShadow: logoShadow }}>⚡</span>
              <span className="font-display text-[1.55rem] font-bold tracking-tight">Waitless</span>
            </>
          )}
        </div>
        
        <div className="text-[0.7rem] uppercase tracking-widest font-bold text-white/50 mb-3 px-1.5">Business</div>
        <div className="font-display font-bold text-[1.1rem] px-1.5 mb-1 truncate leading-tight">{bizDoc?.name ?? "—"}</div>
        <div className="text-[0.75rem] font-medium text-white/60 px-1.5 mb-8 truncate">{bizId || "—"}</div>

        <nav className="flex flex-col gap-2">
          {!isSuper && <Link href="/admin" className={getCls("dashboard")}>🏢 Dashboard</Link>}
          {isSuper && <Link href="/super" className={getCls("super")}>🏢 All Businesses</Link>}
          <Link href="/analytics" className={getCls("analytics")}>📊 Analytics</Link>
          {!isSuper && <Link href="/admin/billing" className={getCls("billing")}>💳 Billing</Link>}
          <Link href="/board" className={getCls("board")}>📺 TV Board</Link>
          {!isSuper && <Link href="/admin/settings" className={getCls("settings")}>⚙️ Settings</Link>}
          {!isSuper && <Link href="/admin/developers" className={getCls("developers")}>👨‍💻 Developers</Link>}
        </nav>
      </div>
      
      <div className="p-7 pt-0">
        {!isSuper && (
          <div className="px-5 py-4 rounded-[16px] bg-white/5 border border-white/10 mb-5 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl -translate-y-1/2 translate-x-1/2" />
            <div className="text-[0.75rem] uppercase tracking-wider text-white/60 font-bold mb-1.5">Plan</div>
            <div className="text-[1.1rem] font-bold flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {cap(planNow)}
                {!isTrial && planNow !== "free" && (
                  <span className="text-[0.65rem] text-[#06d6a0] bg-[#06d6a0]/20 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#06d6a0]"></div>
                    Active
                  </span>
                )}
              </div>
              {isTrial && <span className="text-[0.7rem] text-[#06d6a0] bg-[#06d6a0]/20 px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">{daysLeft}d left</span>}
            </div>
            {planNow !== "enterprise" && (
              <Link href="/admin/billing" className="block text-center w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-[0.8rem] font-bold rounded-xl transition">
                {isTrial ? "Subscribe to Pro" : planNow === "pro" ? "Upgrade to Enterprise" : "Upgrade Plan"}
              </Link>
            )}
          </div>
        )}
        <button onClick={doSignOut} className="w-full text-[0.85rem] font-bold px-4 py-3 rounded-[12px] border border-white/20 bg-transparent text-white/80 hover:bg-white/10 hover:text-white transition">
          Sign out
        </button>
      </div>
    </div>
  );
}
