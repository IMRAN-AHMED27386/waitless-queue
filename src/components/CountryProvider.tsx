"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_COUNTRIES, detectCountry, countryByCode, type Country } from "@/lib/countries";

type CountryCtx = {
  country: Country;
  setCountry: (code: string) => void;
  countries: Country[];
  allCountries: Country[];
};

const CountryContext = createContext<CountryCtx>({
  country: DEFAULT_COUNTRIES[0],
  setCountry: () => {},
  countries: DEFAULT_COUNTRIES,
  allCountries: DEFAULT_COUNTRIES,
});

export function CountryProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<string>("US");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // 1. Try localStorage override
    const saved = localStorage.getItem("waitless-country");
    if (saved && DEFAULT_COUNTRIES.some((c: Country) => c.code === saved)) {
      setCode(saved);
      setLoaded(true);
      return;
    }
    // 2. Auto-detect from browser
    const detected = detectCountry();
    setCode(detected);
    setLoaded(true);
  }, []);

  const setCountry = (c: string) => {
    if (DEFAULT_COUNTRIES.some((co: Country) => co.code === c)) {
      setCode(c);
      localStorage.setItem("waitless-country", c);
    }
  };

  const country = countryByCode(code) ?? DEFAULT_COUNTRIES[0];

  if (!loaded) {
    // Avoid flash of wrong country during SSR/hydration
    return <>{children}</>;
  }

  return (
    <CountryContext.Provider
      value={{ country, setCountry, countries: DEFAULT_COUNTRIES, allCountries: DEFAULT_COUNTRIES }}
    >
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry(): CountryCtx {
  return useContext(CountryContext);
}