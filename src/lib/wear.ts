export interface WearTierInfo {
  code: "FN" | "MW" | "FT" | "WW" | "BS";
  nameRu: string;
  nameEn: string;
  minFloat: number;
  maxFloat: number;
  weight: number;
  priceMultiplier: number;
  color: string;
}

export const CS2_WEAR_TIERS: WearTierInfo[] = [
  {
    code: "FN",
    nameRu: "Прямо с завода",
    nameEn: "Factory New",
    minFloat: 0.0001,
    maxFloat: 0.07,
    weight: 18,
    priceMultiplier: 1.35, // Самое дорогое качество (+35% к базе)
    color: "#10B981",
  },
  {
    code: "MW",
    nameRu: "Немного поношенное",
    nameEn: "Minimal Wear",
    minFloat: 0.0701,
    maxFloat: 0.15,
    weight: 30,
    priceMultiplier: 1.05, // Чуть выше базы (+5%)
    color: "#38BDF8",
  },
  {
    code: "FT",
    nameRu: "После полевых испытаний",
    nameEn: "Field-Tested",
    minFloat: 0.1501,
    maxFloat: 0.38,
    weight: 30,
    priceMultiplier: 0.82, // Стандартное среднее (-18%)
    color: "#FACC15",
  },
  {
    code: "WW",
    nameRu: "Поношенное",
    nameEn: "Well-Worn",
    minFloat: 0.3801,
    maxFloat: 0.45,
    weight: 12,
    priceMultiplier: 0.64, // Дешевле (-36%)
    color: "#FB923C",
  },
  {
    code: "BS",
    nameRu: "Закалённое в боях",
    nameEn: "Battle-Scarred",
    minFloat: 0.4501,
    maxFloat: 0.99,
    weight: 10,
    priceMultiplier: 0.48, // Самое дешёвое (-52%)
    color: "#F43F5E",
  },
];

export const STATTRAK_MULTIPLIER = 1.35;

export function getWearInfo(wearCode: string): WearTierInfo {
  return (
    CS2_WEAR_TIERS.find((w) => w.code === wearCode) || CS2_WEAR_TIERS[0]
  );
}

export function calculateSkinExactPrice(opts: {
  basePrice: number;
  wear: string;
  floatValue: number;
  isStatTrak: boolean;
}): {
  finalPrice: number;
  wearMult: number;
  lowFloatBonusMult: number;
  statTrakMult: number;
} {
  const tier = getWearInfo(opts.wear);
  const wearMult = tier.priceMultiplier;

  // Коллекционная наценка за ультра-низкий Float (например 0.000x или 0.00x)
  let lowFloatBonusMult = 1.0;
  if (opts.floatValue < 0.001) {
    lowFloatBonusMult = 1.25; // +25% за коллекционный 0.000x float
  } else if (opts.floatValue < 0.008) {
    lowFloatBonusMult = 1.12; // +12% за чистый 0.00x float
  }

  const statTrakMult = opts.isStatTrak ? STATTRAK_MULTIPLIER : 1.0;
  const raw =
    opts.basePrice * wearMult * lowFloatBonusMult * statTrakMult;

  return {
    finalPrice: Number(Math.max(0.25, raw).toFixed(2)),
    wearMult,
    lowFloatBonusMult,
    statTrakMult,
  };
}

export function rollCs2WearAndPrice(
  basePrice: number,
  canBeStatTrak: boolean
): {
  wear: string;
  floatValue: number;
  isStatTrak: boolean;
  finalPrice: number;
} {
  const totalWeight = CS2_WEAR_TIERS.reduce((acc, w) => acc + w.weight, 0);
  let r = Math.random() * totalWeight;
  let chosen = CS2_WEAR_TIERS[1];

  for (const tier of CS2_WEAR_TIERS) {
    if (r < tier.weight) {
      chosen = tier;
      break;
    }
    r -= tier.weight;
  }

  const floatValue = Number(
    (
      chosen.minFloat +
      Math.random() * (chosen.maxFloat - chosen.minFloat)
    ).toFixed(6)
  );

  const isStatTrak = canBeStatTrak && Math.random() < 0.12;
  const { finalPrice } = calculateSkinExactPrice({
    basePrice,
    wear: chosen.code,
    floatValue,
    isStatTrak,
  });

  return {
    wear: chosen.code,
    floatValue,
    isStatTrak,
    finalPrice,
  };
}

// Helpers to encode/decode custom Name Tag inside caseName field without DB migration
export function parseCaseAndNameTag(rawCaseName: string | null | undefined): {
  originSource: string;
  nameTag: string | null;
} {
  if (!rawCaseName) {
    return { originSource: "Кейс", nameTag: null };
  }
  const parts = rawCaseName.split("||tag:");
  return {
    originSource: parts[0] || "Кейс",
    nameTag: parts[1] ? parts[1].trim() : null,
  };
}

export function encodeCaseAndNameTag(
  originSource: string,
  nameTag: string | null
): string {
  const cleanOrigin = (originSource || "Кейс").split("||tag:")[0].trim();
  const cleanTag = (nameTag || "").trim();
  if (!cleanTag) return cleanOrigin;
  return `${cleanOrigin}||tag:${cleanTag}`;
}
