"use client";

export type Country = {
  code: string;
  name: string;
  phonePrefix: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  flag: string;
};

export const DEFAULT_COUNTRIES: Country[] = [
  { code: "US",  name: "United States",       phonePrefix: "+1",    currency: "USD", currencySymbol: "$",   timezone: "America/New_York",        flag: "🇺🇸" },
  { code: "GB",  name: "United Kingdom",      phonePrefix: "+44",   currency: "GBP", currencySymbol: "£",   timezone: "Europe/London",           flag: "🇬🇧" },
  { code: "AE",  name: "United Arab Emirates",  phonePrefix: "+971",  currency: "AED", currencySymbol: "د.إ", timezone: "Asia/Dubai",               flag: "🇦🇪" },
  { code: "IN",  name: "India",               phonePrefix: "+91",   currency: "INR", currencySymbol: "₹",   timezone: "Asia/Kolkata",            flag: "🇮🇳" },
  { code: "SA",  name: "Saudi Arabia",        phonePrefix: "+966",  currency: "SAR", currencySymbol: "﷼",   timezone: "Asia/Riyadh",             flag: "🇸🇦" },
  { code: "SG",  name: "Singapore",           phonePrefix: "+65",   currency: "SGD", currencySymbol: "$",   timezone: "Asia/Singapore",          flag: "🇸🇬" },
  { code: "MY",  name: "Malaysia",            phonePrefix: "+60",   currency: "MYR", currencySymbol: "RM",  timezone: "Asia/Kuala_Lumpur",       flag: "🇲🇾" },
  { code: "ID",  name: "Indonesia",           phonePrefix: "+62",   currency: "IDR", currencySymbol: "Rp",  timezone: "Asia/Jakarta",            flag: "🇮🇩" },
  { code: "BD",  name: "Bangladesh",          phonePrefix: "+880",  currency: "BDT", currencySymbol: "৳",   timezone: "Asia/Dhaka",              flag: "🇧🇩" },
  { code: "MV",  name: "Maldives",            phonePrefix: "+960",  currency: "MVR", currencySymbol: "Rf",  timezone: "Indian/Maldives",         flag: "🇲🇻" },
];

/** Lookup country by code. */
export function countryByCode(code: string): Country | undefined {
  return DEFAULT_COUNTRIES.find((c) => c.code === code);
}

/** Detect country from browser locale. Falls back to "US" if unknown. */
export function detectCountry(): string {
  if (typeof navigator === "undefined") return "US";

  // Try navigator.language: "en-IN", "en-US", etc.
  const lang = (navigator.language ?? "").split("-").pop()?.toUpperCase() ?? "";
  if (DEFAULT_COUNTRIES.some((c) => c.code === lang)) return lang;

  // Try Intl locale: the resolved locale can hint at country.
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    const tz = resolved.timeZone || "";
    const match = DEFAULT_COUNTRIES.find((c) => tz.includes(c.code.toLowerCase()));
    if (match) return match.code;
  } catch { /* fall through */ }

  return "US";
}

/** Format a phone prefix for display (e.g. "+960") */
export function phoneHint(country: Country): string {
  return `${country.phonePrefix} XXXXXXX`;
}

/** Format a price for a country's currency. */
export function formatPrice(amount: number, country?: Country, compact?: boolean): string {
  const c = country ?? DEFAULT_COUNTRIES[0];
  if (c.code === "US" || c.code === "SG") return `${c.currencySymbol}${amount}`;
  if (c.code === "GB") return `${c.currencySymbol}${amount}`;
  if (c.code === "IN") return `${c.currencySymbol}${amount}`;
  // Generic fallback: symbol + amount
  return `${c.currencySymbol}${amount}`;
}