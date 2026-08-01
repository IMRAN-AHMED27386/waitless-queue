"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard, signOutUser } from "@/lib/auth";
import { Tok, listenDoctorQueue, doctorCallToken, doctorCompleteToken, listenRooms, Room, listenAllServices, Svc } from "@/lib/db";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DoctorDashboard() {
  const { user, ready } = useAuthGuard(["doctor"]);
  const router = useRouter();
  const [tokens, setTokens] = useState<Tok[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [services, setServices] = useState<Svc[]>([]);
  const [busy, setBusy] = useState(false);
  
  useEffect(() => {
    if (!ready || !user?.businessId) return;
    return listenRooms(user.businessId, setRooms);
  }, [ready, user?.businessId]);

  // Stabilise roomName — only update state when the actual string value changes,
  // not every time the rooms array gets a new reference from Firestore snapshots.
  const derivedRoomName = rooms.find((r) => r.id === user?.roomId)?.name;
  const [stableRoomName, setStableRoomName] = useState<string | undefined>();
  useEffect(() => {
    setStableRoomName((prev) => (prev === derivedRoomName ? prev : derivedRoomName));
  }, [derivedRoomName]);

  // Track previous room to only clear tokens on a genuine room switch
  const prevRoomRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!ready || !user?.businessId || !stableRoomName) return;
    // Only clear tokens when the doctor actually switches to a different room
    if (prevRoomRef.current && prevRoomRef.current !== stableRoomName) {
      setTokens([]);
    }
    prevRoomRef.current = stableRoomName;
    return listenDoctorQueue(user.businessId, stableRoomName, setTokens);
  }, [ready, user?.businessId, stableRoomName]);

  useEffect(() => {
    if (!ready || !user?.businessId) return;
    return listenAllServices((all) => setServices(all.filter((s) => s.businessId === user.businessId)));
  }, [ready, user?.businessId]);

  if (!ready) return <div className="p-8 text-center">Loading...</div>;

  const currentServing = tokens.find((t) => t.status === "serving_doctor");
  const waitingTokens = tokens.filter((t) => t.status === "transferred");

  const currentServiceName = currentServing 
    ? services.find((s) => s.id === currentServing.serviceId)?.name || "General Consultation"
    : "General Consultation";

  // If a doctor doesn't have a room assigned, let them select one.
  const handleSelectRoom = async (roomId: string) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { roomId });
  };

  const handleSignOut = async () => {
    await signOutUser();
    router.replace("/login");
  };





  return (
    <div className="bg-[#edf3fa] min-h-screen p-4 md:p-5 font-sans text-gray-800">
      <div className="max-w-[1180px] mx-auto">
        {/* Top Header */}
        <div className="bg-white rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-6 md:px-7 flex flex-col md:flex-row justify-between items-center mb-5 gap-4">
          <div>
            <div className="text-slate-500 font-medium text-sm mb-1">Doctor Dashboard</div>
            <h1 className="text-2xl md:text-3xl font-bold m-0 text-gray-900">Hello, Dr. {user?.name || "Doctor"}</h1>
            <div className="text-green-600 font-bold mt-1 text-sm">● Online</div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <button onClick={handleSignOut} className="text-red-500 font-bold hover:underline">Sign Out</button>
            <div className="mt-1">
              <select 
                value={user?.roomId || ""} 
                onChange={(e) => handleSelectRoom(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none cursor-pointer hover:bg-gray-100 transition"
              >
                <option value="" disabled>-- Select a Room --</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid md:grid-cols-2 gap-[22px]">
          
          {/* Currently Serving Card */}
          <div className="bg-white rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-6 flex flex-col h-[480px]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold m-0 text-gray-900">Currently Serving</h2>
              <span className="bg-emerald-50 text-green-600 px-3 py-1 rounded-full text-[13px] font-bold uppercase tracking-wider">Live</span>
            </div>

            {!user?.roomId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <div className="text-5xl mb-2">--</div>
                <div className="font-medium">Please select a room above.</div>
              </div>
            ) : currentServing ? (
              <div className="flex flex-col flex-1 justify-between">
                <div>
                  <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-[18px] text-white text-center p-[18px] max-w-[240px] mx-auto shadow-[0_12px_28px_rgba(37,99,235,0.28)]">
                    <small className="block opacity-90 tracking-[2px] text-[10px] md:text-xs font-semibold uppercase">Current Token</small>
                    <h1 className="mt-2.5 mb-0 text-[48px] md:text-[58px] font-black leading-none">{currentServing.number}</h1>
                  </div>

                  <div className="text-center my-[18px]">
                    <h3 className="m-0 text-2xl md:text-[30px] font-bold text-gray-900">{currentServing.customerName || "Patient"}</h3>
                    <p className="my-1.5 text-slate-500 font-medium">{currentServiceName}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 my-5">
                    <div className="bg-slate-50 border border-gray-200 rounded-[14px] p-3.5">
                      <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1">Arrival</label>
                      <b className="text-lg font-bold text-gray-800">
                        {currentServing.createdAt && typeof currentServing.createdAt.toDate === "function"
                          ? currentServing.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : "--"}
                      </b>
                    </div>
                    <div className="bg-slate-50 border border-gray-200 rounded-[14px] p-3.5">
                      <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1">Status</label>
                      <b className="text-lg font-bold text-green-600 whitespace-nowrap">Inside Consultation</b>
                    </div>
                  </div>
                </div>

                <button 
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await doctorCompleteToken(currentServing.id);
                    } catch (e) {
                      console.error("Failed to complete:", e);
                      alert(e instanceof Error ? e.message : "Could not complete consultation.");
                    }
                    setBusy(false);
                  }}
                  className="w-full py-4 rounded-[14px] bg-green-600 hover:bg-green-700 text-white font-bold text-[15px] transition shadow-sm disabled:opacity-50"
                >
                  {busy ? "Completing..." : "✓ Complete Consultation"}
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <div className="text-5xl mb-2">--</div>
                <div className="font-medium">No one is currently inside.</div>
              </div>
            )}
          </div>

          {/* Up Next Card */}
          <div className="bg-white rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] p-6 flex flex-col h-[480px]">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold m-0 text-gray-900">Up Next</h2>
              <span className="text-gray-500 font-medium text-sm">{waitingTokens.length} Waiting</span>
            </div>
            
            <div className="flex-1 overflow-y-auto mb-5 pr-2">
              {!user?.roomId ? (
                <div className="h-full flex items-center justify-center text-gray-400 font-medium">Select a room to view queue</div>
              ) : waitingTokens.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 font-medium">Queue is empty</div>
              ) : (
                <ul className="list-none p-0 m-0">
                  {waitingTokens.map((t) => (
                    <li key={t.id} className="flex justify-between items-center py-3.5 px-2 border-b border-gray-100 last:border-0">
                      <b className="text-gray-900 font-bold">{t.number}</b>
                      <span className="text-slate-600 font-medium">{t.customerName || "Patient"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-auto pt-2">
              <button 
                disabled={waitingTokens.length === 0 || !!currentServing || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await doctorCallToken(waitingTokens[0].id);
                  } catch (e) {
                    console.error("Failed to call next:", e);
                    alert(e instanceof Error ? e.message : "Could not call next patient.");
                  }
                  setBusy(false);
                }}
                className="w-full py-4 rounded-[14px] bg-blue-600 hover:bg-blue-700 text-white font-bold text-[15px] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Calling..." : "Call Next Patient"}
              </button>
              {currentServing && (
                <p className="text-xs text-center text-gray-400 mt-2 font-medium">Complete current patient to call the next.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
