import fs from "fs/promises";
import path from "path";
import { prisma } from "./prisma";
import { getLevelInfo } from "./levels";
import { rollCs2WearAndPrice } from "./wear";

export interface PromoCodeRecord {
  code: string;
  description: string;
  rewardType: "BALANCE" | "SKIN" | "XP";
  amount: number; // USD for BALANCE, XP for XP
  skinName?: string;
  wear?: "FN" | "MW" | "FT" | "WW" | "BS";
  isStatTrak?: boolean;
  maxUses: number;
  usedBy: string[];
  createdAt: string;
}

const PROMO_FILE_PATH = process.env.VERCEL
  ? "/tmp/promocodes.json"
  : path.join(process.cwd(), "prisma", "promocodes.json");

const DEFAULT_PROMOCODES: PromoCodeRecord[] = [
  {
    code: "VIPERR777",
    description: "Эксклюзивный ваучер создателя на $2,500",
    rewardType: "BALANCE",
    amount: 2500,
    maxUses: 999,
    usedBy: [],
    createdAt: new Date().toISOString(),
  },
  {
    code: "START250",
    description: "Подъёмный бонус для открытия кейсов ($250)",
    rewardType: "BALANCE",
    amount: 250,
    maxUses: 500,
    usedBy: [],
    createdAt: new Date().toISOString(),
  },
  {
    code: "DRAGON",
    description: "Секретный скин-ваучер: AWP | Dragon Lore (FN)",
    rewardType: "SKIN",
    amount: 0,
    skinName: "AWP | Dragon Lore",
    wear: "FN",
    isStatTrak: false,
    maxUses: 50,
    usedBy: [],
    createdAt: new Date().toISOString(),
  },
  {
    code: "KARAMBIT",
    description: "Ножевой ваучер: ★ Karambit | Doppler (FN)",
    rewardType: "SKIN",
    amount: 0,
    skinName: "★ Karambit | Doppler",
    wear: "FN",
    isStatTrak: true,
    maxUses: 50,
    usedBy: [],
    createdAt: new Date().toISOString(),
  },
  {
    code: "BOOSTXP",
    description: "Буст ранга: +3,500 XP (+10 уровней)",
    rewardType: "XP",
    amount: 3500,
    maxUses: 200,
    usedBy: [],
    createdAt: new Date().toISOString(),
  },
];

export async function getAllPromocodes(): Promise<PromoCodeRecord[]> {
  try {
    const raw = await fs.readFile(PROMO_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as PromoCodeRecord[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // Initialize file with default codes
  }

  await savePromocodes(DEFAULT_PROMOCODES);
  return DEFAULT_PROMOCODES;
}

async function savePromocodes(list: PromoCodeRecord[]) {
  try {
    await fs.writeFile(PROMO_FILE_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch {
    // Ignore write errors in read-only environments
  }
}

export async function createPromocodeRecord(input: {
  code: string;
  description: string;
  rewardType: "BALANCE" | "SKIN" | "XP";
  amount: number;
  skinName?: string;
  wear?: "FN" | "MW" | "FT" | "WW" | "BS";
  isStatTrak?: boolean;
  maxUses: number;
}): Promise<{ ok: boolean; error?: string }> {
  const cleanCode = input.code.trim().toUpperCase();
  if (cleanCode.length < 3) {
    return { ok: false, error: "Код должен содержать минимум 3 символа" };
  }

  const list = await getAllPromocodes();
  const filtered = list.filter((p) => p.code.toUpperCase() !== cleanCode);

  const newPromo: PromoCodeRecord = {
    code: cleanCode,
    description: input.description.trim() || `Промокод ${cleanCode}`,
    rewardType: input.rewardType,
    amount: Math.max(0, Number(input.amount) || 0),
    skinName: input.skinName,
    wear: input.wear || "FN",
    isStatTrak: !!input.isStatTrak,
    maxUses: Math.max(1, Math.floor(input.maxUses || 100)),
    usedBy: [],
    createdAt: new Date().toISOString(),
  };

  await savePromocodes([newPromo, ...filtered]);
  return { ok: true };
}

export async function deletePromocodeRecord(code: string) {
  const list = await getAllPromocodes();
  const next = list.filter((p) => p.code.toUpperCase() !== code.toUpperCase());
  await savePromocodes(next);
  return { ok: true };
}

export async function redeemPromocodeForUser(
  rawCode: string,
  userId: string
): Promise<{
  ok: boolean;
  error?: string;
  message?: string;
  newBalance?: number;
  newInventoryCount?: number;
}> {
  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) {
    return { ok: false, error: "Введи промокод или секретный ваучер" };
  }

  const list = await getAllPromocodes();
  const promo = list.find((p) => p.code.toUpperCase() === cleanCode);

  if (!promo) {
    return {
      ok: false,
      error: "Промокод не найден или введён с ошибкой",
    };
  }

  if (promo.usedBy.length >= promo.maxUses) {
    return {
      ok: false,
      error: "Лимит активаций этого промокода уже исчерпан",
    };
  }

  if (promo.usedBy.includes(userId)) {
    return {
      ok: false,
      error: "Ты уже активировал этот промокод на своём аккаунте",
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false, error: "Профиль не найден" };
  }

  promo.usedBy.push(userId);
  await savePromocodes(list);

  if (promo.rewardType === "BALANCE") {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        balance: { increment: promo.amount },
      },
    });
    return {
      ok: true,
      message: `Промокод ${promo.code} активирован! Начислено +$${promo.amount}`,
      newBalance: Number(updated.balance.toFixed(2)),
    };
  }

  if (promo.rewardType === "XP") {
    const nextXp = user.xp + Math.floor(promo.amount);
    const nextLevel = getLevelInfo(nextXp).level;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        xp: nextXp,
        level: nextLevel,
      },
    });
    return {
      ok: true,
      message: `Промокод ${promo.code} активирован! Получено +${promo.amount} XP (Уровень ${nextLevel})!`,
    };
  }

  // SKIN VOUCHER
  const allSkins = await prisma.skin.findMany();
  const targetSkin =
    allSkins.find((s) => s.name === promo.skinName) ||
    allSkins.find((s) =>
      s.name.toLowerCase().includes((promo.skinName || "").toLowerCase())
    ) ||
    allSkins[0];

  const rolled = rollCs2WearAndPrice(
    targetSkin.basePrice,
    targetSkin.canBeStatTrak
  );

  await prisma.inventoryItem.create({
    data: {
      userId: user.id,
      skinId: targetSkin.id,
      wear: promo.wear || rolled.wear,
      floatValue: promo.wear === "FN" ? 0.001337 : rolled.floatValue,
      isStatTrak:
        typeof promo.isStatTrak === "boolean"
          ? promo.isStatTrak
          : rolled.isStatTrak,
      price: rolled.finalPrice,
      status: "IN_INVENTORY",
      obtainedFrom: "BONUS",
      caseName: `ВАУЧЕР ${promo.code}`,
    },
  });

  const newInvCount = await prisma.inventoryItem.count({
    where: { userId: user.id, status: "IN_INVENTORY" },
  });

  return {
    ok: true,
    message: `Секретный ваучер ${promo.code} активирован! Скин «${targetSkin.name}» добавлен в твой инвентарь!`,
    newInventoryCount: newInvCount,
  };
}
