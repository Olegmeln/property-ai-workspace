/**
 * Глобальный выбор страны. Хранится в localStorage. По умолчанию — ОАЭ
 * (там работает REST API из коробки).
 */

import { create } from "zustand";

export type Country = "AE" | "AM" | "GE";

const STORAGE_KEY = "paw.country";

function initial(): Country {
  if (typeof window === "undefined") return "AE";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "AE" || stored === "AM" || stored === "GE") return stored;
  return "AE";
}

interface CountryState {
  country: Country;
  setCountry: (c: Country) => void;
}

export const useCountryStore = create<CountryState>((set) => ({
  country: initial(),
  setCountry: (c) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, c);
    } catch {
      /* ignore */
    }
    set({ country: c });
  }
}));

export const COUNTRY_META: Record<Country, { flag: string; label: string; code: string }> = {
  AE: { flag: "🇦🇪", label: "ОАЭ", code: "UAE" },
  AM: { flag: "🇦🇲", label: "Армения", code: "AM" },
  GE: { flag: "🇬🇪", label: "Грузия", code: "GE" }
};
