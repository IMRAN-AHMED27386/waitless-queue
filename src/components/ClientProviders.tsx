"use client";

import { type ReactNode } from "react";
import { CountryProvider } from "./CountryProvider";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <CountryProvider>{children}</CountryProvider>;
}