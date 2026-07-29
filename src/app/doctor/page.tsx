"use client";

import { useState, useEffect } from "react";
import { useAuthGuard } from "@/lib/auth";
import { Tok, listenDoctorQueue, doctorCallToken, doctorCompleteToken, listenRooms, Room } from "@/lib/db";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DoctorDashboard() {
  const { user, ready } = useAuthGuard(["doctor"]);
  const [tokens, setTokens] = useState<Tok[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  useEffect(() => {
    if (!ready || !user?.businessId) return;
    return listenRooms(user.businessId, setRooms);
  }, [ready, user?.businessId]);

  useEffect(() => {
    if (!ready || !user?.businessId || !user?.roomId) return;
    return listenDoctorQueue(user.businessId, user.roomId, setTokens);
  }, [ready, user?.businessId, user?.roomId]);

  if (!ready) return <div className="p-8 text-center">Loading...</div>;

  const currentServing = tokens.find((t) => t.status === "serving_doctor");
  const waitingTokens = tokens.filter((t) => t.status === "transferred");

  // If a doctor doesn't have a room assigned, let them select one.
  const handleSelectRoom = async (roomId: string) => {
    if (!user) return;
    await updateDoc(doc(db, "users", user.uid), { roomId });
  };

  if (!user?.roomId) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold mb-4">Doctor Dashboard</h1>
        <p className="mb-4 text-gray-600">You do not have a room assigned. Please select your room for today:</p>
        <div className="flex flex-col gap-2">
          {rooms.map(r => (
            <button key={r.id} onClick={() => handleSelectRoom(r.id)} className="p-4 bg-white rounded-xl shadow text-left hover:bg-gray-50 border">
              <div className="font-bold">{r.name}</div>
            </button>
          ))}
          {rooms.length === 0 && <p className="text-sm text-gray-500">No rooms available. Ask your admin to create a room.</p>}
        </div>
      </div>
    );
  }

  const roomName = rooms.find((r) => r.id === user.roomId)?.name || "Room";

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold">Hello, Dr. {user.name || "Doctor"}</h1>
          <p className="text-gray-500">{roomName}</p>
        </div>
        <button onClick={() => handleSelectRoom("")} className="text-sm text-blue-600 underline">Change Room</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Serving */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col items-center justify-center text-center min-h-[250px]">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-2">Currently Serving</h2>
          {currentServing ? (
            <>
              <div className="text-6xl font-black text-gray-900 my-4">{currentServing.number}</div>
              <div className="text-lg text-gray-600 mb-6">{currentServing.customerName || "Patient"}</div>
              <button 
                onClick={() => doctorCompleteToken(currentServing.id)}
                className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-green-700"
              >
                Complete Consultation
              </button>
            </>
          ) : (
             <div className="text-gray-400">
               <div className="text-5xl mb-2">--</div>
               <div>No one is currently inside.</div>
             </div>
          )}
        </div>

        {/* Next in Queue */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold text-gray-800">Up Next</h2>
            <div className="text-sm text-gray-500">{waitingTokens.length} waiting</div>
          </div>
          
          <div className="flex-1 overflow-y-auto mb-4 space-y-2 max-h-[300px]">
            {waitingTokens.length === 0 ? (
              <div className="text-center text-gray-400 py-8">Queue is empty</div>
            ) : (
              waitingTokens.map((t) => (
                <div key={t.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <div className="font-bold text-gray-900">{t.number}</div>
                    <div className="text-sm text-gray-600">{t.customerName || "Patient"}</div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Waiting
                  </div>
                </div>
              ))
            )}
          </div>

          <button 
            disabled={waitingTokens.length === 0 || !!currentServing}
            onClick={() => doctorCallToken(waitingTokens[0].id)}
            className="w-full bg-blue-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-xl hover:bg-blue-700 transition"
          >
            Call Next Patient
          </button>
          {currentServing && waitingTokens.length > 0 && (
             <p className="text-xs text-center text-gray-500 mt-2">Complete current patient to call the next.</p>
          )}
        </div>
      </div>
    </div>
  );
}
