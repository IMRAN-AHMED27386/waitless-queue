"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/lib/auth";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { listenBusiness, effectivePlan } from "@/lib/db";

export default function SettingsPage() {
  const { user, ready } = useAuthGuard(["admin"]);
  const [bizDoc, setBizDoc] = useState<any>(null);
  
  const [customLogoUrl, setCustomLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#315cff");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user?.businessId) return;
    const unsub = listenBusiness(user.businessId, (b) => {
      setBizDoc(b);
      if (b?.customLogoUrl) setCustomLogoUrl(b.customLogoUrl);
      if (b?.brandColor) setBrandColor(b.brandColor);
    });
    return () => unsub();
  }, [user?.businessId]);

  const planNow = effectivePlan(bizDoc);
  const isEnterprise = planNow === "enterprise";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.businessId || !isEnterprise) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const storageRef = ref(storage, `businesses/${user.businessId}/logo_${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setCustomLogoUrl(url);
    } catch (err) {
      console.error(err);
      alert("Failed to upload image");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = ""; // Reset input
    }
  };

  const handleSave = async () => {
    if (!user?.businessId || !isEnterprise) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "businesses", user.businessId), {
        customLogoUrl: customLogoUrl.trim(),
        brandColor: brandColor.trim()
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
      alert("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!ready) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="bg-[#edf3fa] min-h-screen p-4 md:p-5 font-sans text-gray-800">
      <div className="max-w-[1180px] mx-auto">
        <div className="bg-white rounded-[22px] shadow-sm p-6 mb-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Business Settings</h1>
            <p className="text-gray-500 text-sm mt-1">Manage your branding and preferences</p>
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
                  Custom branding and white-labeling is exclusively available on the Enterprise plan.
                </p>
                <Link href="/admin/billing" className="block w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition">
                  Upgrade to Enterprise
                </Link>
              </div>
            </div>
          )}

          <h2 className="text-xl font-bold text-gray-900 mb-6">White-Label Branding</h2>
          
          <div className="max-w-2xl space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Custom Logo URL</label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="https://example.com/logo.png"
                  value={customLogoUrl}
                  onChange={(e) => setCustomLogoUrl(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    disabled={uploading || !isEnterprise}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    disabled={uploading || !isEnterprise}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition whitespace-nowrap disabled:opacity-50"
                  >
                    {uploading ? "Uploading..." : "Upload Image"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Paste a direct link or upload an image from your computer. We recommend a transparent PNG (max 400x150px).</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Brand Primary Color</label>
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-0 p-0"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-32"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">This color will be used for buttons, QR codes, and TV Board accents.</p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving || !isEnterprise}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition disabled:opacity-50"
              >
                {saving ? "Saving..." : saved ? "Saved!" : "Save Branding"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
