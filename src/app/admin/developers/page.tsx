"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { listenBusiness, effectivePlan, listenApiKeys, type ApiKey } from "@/lib/db";

export default function DevelopersPage() {
  const { user, ready } = useAuthGuard(["admin"]);
  const [bizDoc, setBizDoc] = useState<any>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [generating, setGenerating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.businessId) return;
    const unsubBiz = listenBusiness(user.businessId, (b) => {
      setBizDoc(b);
    });
    const unsubKeys = listenApiKeys(user.businessId, (k) => {
      setKeys(k);
    });
    return () => { unsubBiz(); unsubKeys(); };
  }, [user?.businessId]);

  const planNow = effectivePlan(bizDoc);
  const isEnterprise = planNow === "enterprise";

  const handleGenerate = async () => {
    if (!user?.businessId || !isEnterprise || !keyName.trim()) return;
    setGenerating(true);
    try {
      // Generate a random key starting with wk_live_
      const newKey = "wk_live_" + Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      
      await addDoc(collection(db, "api_keys"), {
        businessId: user.businessId,
        name: keyName.trim(),
        key: newKey,
        createdAt: serverTimestamp()
      });
      setKeyName("");
    } catch (e) {
      console.error(e);
      alert("Failed to generate API key");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key? Systems using it will immediately lose access.")) return;
    try {
      await deleteDoc(doc(db, "api_keys", keyId));
    } catch (e) {
      console.error(e);
      alert("Failed to revoke API key");
    }
  };

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!ready) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="bg-[#edf3fa] min-h-screen p-4 md:p-5 font-sans text-gray-800">
      <div className="max-w-[1180px] mx-auto">
        <div className="bg-white rounded-[22px] shadow-sm p-6 mb-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Developer API</h1>
            <p className="text-gray-500 text-sm mt-1">Manage API keys for custom integrations</p>
          </div>
          <Link href="/admin" className="px-4 py-2 bg-gray-100 rounded-xl font-semibold hover:bg-gray-200 transition text-sm">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-[22px] shadow-sm p-8 relative overflow-hidden">
          {!isEnterprise && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
              <div className="bg-white shadow-xl rounded-2xl p-8 max-w-sm text-center border border-gray-100">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                  🔒
                </div>
                <h3 className="text-xl font-bold mb-2">Enterprise Feature</h3>
                <p className="text-gray-500 text-sm mb-6">
                  API access and custom integrations are exclusively available on the Enterprise plan.
                </p>
                <Link href="/admin/billing" className="block w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition">
                  Upgrade to Enterprise
                </Link>
              </div>
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-900 mb-6">API Keys</h2>
          
          <div className="max-w-3xl space-y-8">
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-2">Generate New Key</h3>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="e.g. Hospital Main POS"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <button
                  onClick={handleGenerate}
                  disabled={generating || !isEnterprise || !keyName.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50"
                >
                  {generating ? "Generating..." : "Generate Key"}
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 mb-4">Active API Keys</h3>
              {keys.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No API keys generated yet.</p>
              ) : (
                <div className="space-y-4">
                  {keys.map((k) => (
                    <div key={k.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                      <div>
                        <div className="font-bold text-gray-900">{k.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">
                            {k.key.substring(0, 12)}••••••••••••
                          </code>
                          <button
                            onClick={() => handleCopy(k.key)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                          >
                            {copied === k.key ? "Copied!" : "Copy Full Key"}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(k.id)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-lg transition"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="pt-6 border-t border-gray-100">
              <h3 className="font-bold text-gray-900 mb-2">API Documentation</h3>
              <p className="text-sm text-gray-500 mb-4">
                Use your API key to authenticate requests. Pass the key in the HTTP header:
              </p>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-sm font-mono overflow-x-auto">
                {`Authorization: Bearer wk_live_...`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
