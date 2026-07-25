"use client";

import type { ReactNode } from "react";

export default function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(13,27,62,.45)" }} onClick={onClose}>
      <div className="w-full max-w-md bg-surface rounded-2xl p-5" style={{ boxShadow: "0 20px 60px rgba(13,27,62,.25)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 grid place-items-center rounded-lg text-ink-3 hover:bg-surface-2">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputCls = "w-full px-[14px] py-3 rounded-xl border border-border bg-white text-[0.92rem] text-ink outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgba(49,92,255,0.1)] transition";
