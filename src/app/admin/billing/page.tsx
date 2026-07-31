"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthGuard } from "@/lib/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { listenBusiness, effectivePlan } from "@/lib/db";
import AdminSidebar from "@/components/AdminSidebar";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BillingPage() {
  const { user, ready } = useAuthGuard(["admin"]);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [bizDoc, setBizDoc] = useState<any>(null);

  useEffect(() => {
    if (!user?.businessId) return;
    const unsub = listenBusiness(user.businessId, (b) => {
      setBizDoc(b);
    });
    return () => unsub();
  }, [user?.businessId]);

  const planNow = effectivePlan(bizDoc);
  const isActive = bizDoc?.status === "active";
  const bizId = user?.businessId;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  const handleSubscribe = async (planType: "pro" | "enterprise") => {
    if (!user || !scriptLoaded || !auth.currentUser) return;
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ planType }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create subscription");
      }

      if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        throw new Error("Razorpay Key ID is missing. Please configure NEXT_PUBLIC_RAZORPAY_KEY_ID in Vercel.");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        subscription_id: data.subscriptionId,
        name: "WaitlessQueue",
        description: `${planType === 'pro' ? 'Pro' : 'Enterprise'} Monthly Subscription`,
        handler: async function (response: any) {
          // Update Firestore to mark user as subscribed
          await updateDoc(doc(db, "users", user.uid), {
            subscriptionStatus: "active",
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySubscriptionId: response.razorpay_subscription_id,
            planType: planType
          });
          
          if (user.businessId) {
            await updateDoc(doc(db, "businesses", user.businessId), {
              status: "active",
              plan: planType
            });
          }

          alert("Payment Successful! Your subscription is now active.");
          router.push("/admin");
        },
        prefill: {
          name: user.name || "",
          email: user.email || "",
        },
        theme: {
          color: "#315cff",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f8fd]">
      {/* ════════ SIDEBAR ════════ */}
      <AdminSidebar active="billing" bizId={bizId || ""} />

      {/* ════════ MAIN DASHBOARD ════════ */}
      <main className="flex-1 h-full overflow-y-auto px-6 py-8 md:px-12 md:py-12 relative z-10 text-gray-800">
        <div className="max-w-[1000px] mx-auto">
          <div className="mb-8">
            <h1 className="font-display text-[2.2rem] font-extrabold text-ink tracking-tight leading-none mb-2">Billing & Subscription</h1>
            <p className="text-[0.95rem] font-medium text-ink-3">Manage your plan and payments</p>
          </div>

          <div className="grid md:grid-cols-2 gap-[22px]">
            {/* Pro Plan */}
          <div className="bg-white rounded-[22px] shadow-sm p-8 flex flex-col border-2 border-transparent hover:border-blue-500 transition">
            <h2 className="text-xl font-bold text-gray-900">Pro Monthly</h2>
            <div className="text-4xl font-black text-gray-900 my-4">₹2,500 <span className="text-base text-gray-500 font-medium">/mo</span></div>
            <ul className="space-y-3 mb-8 flex-1 text-gray-600">
              <li>✓ Unlimited services and tokens</li>
              <li>✓ 5 branches included</li>
              <li>✓ Advanced analytics and CSV export</li>
              <li>✓ WhatsApp alerts add-on</li>
            </ul>
            <button
              onClick={() => handleSubscribe("pro")}
              disabled={loading || !scriptLoaded || (isActive && planNow === "pro") || (isActive && planNow === "enterprise")}
              className={`w-full py-3.5 font-bold rounded-xl transition ${isActive && planNow === "pro" ? "bg-gray-200 text-gray-500" : isActive && planNow === "enterprise" ? "bg-gray-100 text-gray-400" : "bg-blue-600 hover:bg-blue-700 text-white"} disabled:opacity-50`}
            >
              {isActive && planNow === "pro" ? "Current Plan" : "Subscribe to Pro"}
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-white rounded-[22px] shadow-sm p-8 flex flex-col border-2 border-transparent hover:border-blue-500 transition relative overflow-hidden">
            <div className="absolute top-5 right-5 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold uppercase tracking-wide py-1 px-3 rounded-full">
              Best Value
            </div>
            <h2 className="text-xl font-bold text-gray-900">Enterprise Monthly</h2>
            <div className="text-4xl font-black text-gray-900 my-4">₹10,000 <span className="text-base text-gray-500 font-medium">/mo</span></div>
            <ul className="space-y-3 mb-8 flex-1 text-gray-600">
              <li>✓ Unlimited services and tokens</li>
              <li>✓ Unlimited branches</li>
              <li>✓ Advanced analytics and CSV export</li>
              <li>✓ Dedicated Support & Custom integrations</li>
            </ul>
            <button
              onClick={() => handleSubscribe("enterprise")}
              disabled={loading || !scriptLoaded || (isActive && planNow === "enterprise")}
              className={`w-full py-3.5 font-bold rounded-xl transition ${isActive && planNow === "enterprise" ? "bg-gray-200 text-gray-500" : "bg-gray-900 hover:bg-gray-800 text-white"} disabled:opacity-50`}
            >
              {isActive && planNow === "enterprise" ? "Current Plan" : loading ? "Loading..." : "Subscribe to Enterprise"}
            </button>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
