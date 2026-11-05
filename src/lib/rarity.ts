import { CURRENCIES, CurrencyCode, useAppStore } from "./store";

export type RarityType =
  | "MIL_SPEC"
  | "RESTRICTED"
  | "CLASSIFIED"
  | "COVERT"
  | "GOLD";

export interface RarityTheme {
  id: RarityType;
  label: string;
  ruLabel: string;
  color: string;
  bgGlow: string;
  border: string;
  badgeBg: string;
  text: string;
  gradient: string;
}

export const RARITY_THEMES: Record<string, RarityTheme> = {
  MIL_SPEC: {
    id: "MIL_SPEC",
    label: "Mil-Spec",
    ruLabel: "Армейское",
    color: "#3B82F6",
    bgGlow: "rgba(59, 130, 246, 0.22)",
    border: "rgba(59, 130, 246, 0.45)",
    badgeBg: "rgba(59, 130, 246, 0.15)",
    text: "#60A5FA",
    gradient: "from-blue-500/25 via-blue-600/5 to-transparent",
  },
  RESTRICTED: {
    id: "RESTRICTED",
    label: "Restricted",
    ruLabel: "Запрещённое",
    color: "#8B5CF6",
    bgGlow: "rgba(139, 92, 246, 0.25)",
    border: "rgba(139, 92, 246, 0.45)",
    badgeBg: "rgba(139, 92, 246, 0.15)",
    text: "#A78BFA",
    gradient: "from-violet-500/25 via-purple-600/5 to-transparent",
  },
  CLASSIFIED: {
    id: "CLASSIFIED",
    label: "Classified",
    ruLabel: "Засекреченное",
    color: "#EC4899",
    bgGlow: "rgba(236, 72, 153, 0.26)",
    border: "rgba(236, 72, 153, 0.5)",
    badgeBg: "rgba(236, 72, 153, 0.16)",
    text: "#F472B6",
    gradient: "from-pink-500/25 via-fuchsia-600/5 to-transparent",
  },
  COVERT: {
    id: "COVERT",
    label: "Covert",
    ruLabel: "Тайное",
    color: "#EF4444",
    bgGlow: "rgba(239, 68, 68, 0.28)",
    border: "rgba(239, 68, 68, 0.55)",
    badgeBg: "rgba(239, 68, 68, 0.16)",
    text: "#F87171",
    gradient: "from-red-500/30 via-rose-600/5 to-transparent",
  },
  GOLD: {
    id: "GOLD",
    label: "Rare Special",
    ruLabel: "Ножи / Перчатки ★",
    color: "#F59E0B",
    bgGlow: "rgba(245, 158, 11, 0.32)",
    border: "rgba(245, 158, 11, 0.65)",
    badgeBg: "rgba(245, 158, 11, 0.18)",
    text: "#FBBF24",
    gradient: "from-amber-400/35 via-yellow-500/10 to-transparent",
  },
};

export function getRarityTheme(rarity: string): RarityTheme {
  return RARITY_THEMES[rarity] || RARITY_THEMES.MIL_SPEC;
}

export function formatPrice(
  usdPrice: number,
  currencyCode: CurrencyCode = "USD"
): string {
  const cfg = CURRENCIES[currencyCode] || CURRENCIES.USD;
  const converted = usdPrice * cfg.rate;

  if (currencyCode === "UAH") {
    const formatted = new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: converted < 100 ? 1 : 0,
      maximumFractionDigits: converted < 100 ? 1 : 0,
    }).format(converted);
    return `${formatted} ₴`;
  }

  if (currencyCode === "KZT") {
    const formatted = new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 0,
    }).format(converted);
    return `${formatted} ₸`;
  }

  if (currencyCode === "EUR") {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
}

export function useFormatPrice() {
  const currency = useAppStore((s) => s.currency);
  return {
    currency,
    cfg: CURRENCIES[currency],
    fp: (usdPrice: number) => formatPrice(usdPrice, currency),
  };
}
