import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

function monthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }

    const key = authHeader.split("Bearer ")[1].trim();
    if (!key) {
      return NextResponse.json({ error: "API key is empty" }, { status: 401 });
    }

    // Lookup API key
    const keysSnap = await adminDb.collection("api_keys").where("key", "==", key).get();
    if (keysSnap.empty) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    const keyData = keysSnap.docs[0].data();
    const businessId = keyData.businessId;

    // Parse body
    const body = await req.json().catch(() => ({}));
    const { serviceId, name, phone, priority } = body;

    if (!serviceId) {
      return NextResponse.json({ error: "Missing serviceId in request body" }, { status: 400 });
    }

    const bizRef = adminDb.doc(`businesses/${businessId}`);
    const serviceRef = adminDb.doc(`businesses/${businessId}/services/${serviceId}`);
    const tokenRef = adminDb.collection("tokens").doc();

    let out = null;

    await adminDb.runTransaction(async (tx) => {
      const [bizSnap, snap] = await Promise.all([tx.get(bizRef), tx.get(serviceRef)]);
      if (!snap.exists) throw new Error("Service not found.");
      
      const b = bizSnap.exists ? bizSnap.data() : {};
      if (b?.status === "suspended") {
        throw new Error("This business has paused its queue.");
      }

      // API keys are an Enterprise feature, so we don't strictly block based on limits,
      // but we still increment the monthly counter for analytics.
      const mk = monthKey();
      const used = b?.tokensMonthKey === mk ? (b.monthlyTokens || 0) : 0;

      const s = snap.data();
      const next = (s?.lastIssued || 0) + 1;
      const prefix = s?.prefix || "A";
      const number = `${prefix}-${next}`;

      tx.update(serviceRef, { lastIssued: next });
      tx.update(bizRef, { monthlyTokens: used + 1, tokensMonthKey: mk });
      tx.set(tokenRef, {
        businessId,
        serviceId,
        prefix,
        numericValue: next,
        number,
        customerName: name || "API Guest",
        phone: phone || "",
        priority: priority || "regular",
        status: "waiting",
        createdAt: FieldValue.serverTimestamp(),
        waCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
        source: "api"
      });

      out = { id: tokenRef.id, number, numericValue: next, status: "waiting" };
    });

    return NextResponse.json(out, { status: 201 });

  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
