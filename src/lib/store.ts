"use client";

import { create } from "zustand";

export type CurrencyCode = "USD" | "UAH" | "EUR" | "KZT";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rate: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: { code: "USD", symbol: "$", label: "USD ($)", rate: 1 },
  UAH: { code: "UAH", symbol: "₴", label: "UAH (₴)", rate: 41.5 },
  EUR: { code: "EUR", symbol: "€", label: "EUR (€)", rate: 0.92 },
  KZT: { code: "KZT", symbol: "₸", label: "KZT (₸)", rate: 488 },
};

interface AppStore {
  balance: number | null;
  setBalance: (balance: number) => void;
  inventoryCount: number | null;
  setInventoryCount: (count: number) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  balance: null,
  setBalance: (balance) => set({ balance }),
  inventoryCount: null,
  setInventoryCount: (count) => set({ inventoryCount: count }),
  soundEnabled: true,
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
  currency: "UAH",
  setCurrency: (currency) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("azurecaser_currency", currency);
    }
    set({ currency });
  },
}));
