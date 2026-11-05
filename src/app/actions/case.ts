"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getLevelInfo } from "@/lib/levels";
import { encodeCaseAndNameTag, rollCs2WearAndPrice } from "@/lib/wear";

export interface WonDropResult {
  inventoryItemId: string;
  skinId: string;
  name: string;
  weapon: string;
  skinName: string;
  rarity: string;
  imageUrl: string;
  wear: string;
  floatValue: number;
  isStatTrak: boolean;
  price: number;
  rollNumber: number;
  dropChance: number;
}

const WEAR_TIERS = [
  { code: "FN", weight: 22, minFloat: 0.0005, maxFloat: 0.0699, mult: 1.15 },
  { code: "MW", weight: 32, minFloat: 0.0701, maxFloat: 0.1499, mult: 1.0 },
  { code: "FT", weight: 28, minFloat: 0.1501, maxFloat: 0.3799, mult: 0.86 },
  { code: "WW", weight: 10, minFloat: 0.3801, maxFloat: 0.4499, mult: 0.76 },
  { code: "BS", weight: 8, minFloat: 0.4501, maxFloat: 0.8999, mult: 0.68 },
];

function rollWearAndFloat() {
  const total = WEAR_TIERS.reduce((acc, w) => acc + w.weight, 0);
  let r = Math.random() * total;
  let chosen = WEAR_TIERS[1];

  for (const tier of WEAR_TIERS) {
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

  return {
    wear: chosen.code,
    floatValue,
    mult: chosen.mult,
  };
}

export async function openCaseBatch(
  caseId: string,
  count: number
): Promise<{
  ok: boolean;
  error?: string;
  newBalance?: number;
  drops?: WonDropResult[];
}> {
  const safeCount = Math.min(Math.max(Math.floor(count), 1), 5);

  const [user, caseData] = await Promise.all([
    getCurrentUser(),
    prisma.case.findUnique({
      where: { id: caseId },
      include: {
        items: {
          include: { skin: true },
        },
      },
    }),
  ]);

  if (!user || !caseData || caseData.items.length === 0) {
    return { ok: false, error: "Кейс не найден" };
  }

  const totalCost = Number((caseData.price * safeCount).toFixed(2));
  if (user.balance < totalCost) {
    return {
      ok: false,
      error: `Недостаточно средств на балансе (нужно $${totalCost.toFixed(2)})`,
    };
  }

  const totalWeight = caseData.items.reduce((acc, i) => acc + i.weight, 0);
  const wonDrops: WonDropResult[] = [];

  for (let i = 0; i < safeCount; i++) {
    const roll = Math.random() * totalWeight;
    let cursor = roll;
    let picked = caseData.items[0];

    for (const item of caseData.items) {
      if (cursor < item.weight) {
        picked = item;
        break;
      }
      cursor -= item.weight;
    }

    const { wear, floatValue, isStatTrak, finalPrice } = rollCs2WearAndPrice(
      picked.skin.basePrice,
      picked.skin.canBeStatTrak
    );
    const rollPercent = Number(((roll / totalWeight) * 100).toFixed(4));

    const createdInv = await prisma.inventoryItem.create({
      data: {
        userId: user.id,
        skinId: picked.skin.id,
        wear,
        floatValue,
        isStatTrak,
        price: finalPrice,
        status: "IN_INVENTORY",
        obtainedFrom: "CASE",
        caseName: caseData.name,
      },
    });

    await prisma.openHistory.create({
      data: {
        userId: user.id,
        caseId: caseData.id,
        skinName: picked.skin.name,
        weapon: picked.skin.weapon,
        rarity: picked.skin.rarity,
        imageUrl: picked.skin.imageUrl,
        wear,
        floatValue,
        isStatTrak,
        price: finalPrice,
        rollNumber: rollPercent,
      },
    });

    wonDrops.push({
      inventoryItemId: createdInv.id,
      skinId: picked.skin.id,
      name: picked.skin.name,
      weapon: picked.skin.weapon,
      skinName: picked.skin.skinName,
      rarity: picked.skin.rarity,
      imageUrl: picked.skin.imageUrl,
      wear,
      floatValue,
      isStatTrak,
      price: finalPrice,
      rollNumber: rollPercent,
      dropChance: picked.dropChance,
    });
  }

  const totalWonValue = wonDrops.reduce((s, d) => s + d.price, 0);
  const netProfitDelta = Number((totalWonValue - totalCost).toFixed(2));
  const newXp = user.xp + safeCount * 85;
  const newLevel = getLevelInfo(newXp).level;

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { decrement: totalCost },
      totalOpened: { increment: safeCount },
      totalProfit: { increment: netProfitDelta },
      xp: newXp,
      level: newLevel,
      nonce: { increment: safeCount },
    },
  });

  await prisma.case.update({
    where: { id: caseData.id },
    data: {
      openCount: { increment: safeCount },
    },
  });

  revalidatePath("/");
  revalidatePath(`/case/${caseData.slug}`);

  return {
    ok: true,
    newBalance: Number(updatedUser.balance.toFixed(2)),
    drops: wonDrops,
  };
}

export async function sellInventoryItems(itemIds: string[]): Promise<{
  ok: boolean;
  newBalance?: number;
  soldAmount?: number;
}> {
  if (!itemIds || itemIds.length === 0) {
    return { ok: false };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const items = await prisma.inventoryItem.findMany({
    where: {
      id: { in: itemIds },
      userId: user.id,
      status: "IN_INVENTORY",
    },
  });

  if (items.length === 0) {
    return { ok: false };
  }

  const totalSellPrice = Number(
    items.reduce((acc, item) => acc + item.price, 0).toFixed(2)
  );

  await prisma.inventoryItem.updateMany({
    where: {
      id: { in: items.map((i) => i.id) },
    },
    data: {
      status: "SOLD",
    },
  });

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: totalSellPrice },
    },
  });

  revalidatePath("/");
  return {
    ok: true,
    newBalance: Number(updatedUser.balance.toFixed(2)),
    soldAmount: totalSellPrice,
  };
}

export async function renameInventoryItemAction(
  itemId: string,
  nameTag: string
): Promise<{
  ok: boolean;
  newCaseName?: string;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const item = await prisma.inventoryItem.findFirst({
    where: { id: itemId, userId: user.id },
  });
  if (!item) return { ok: false };

  const cleanTag = nameTag.trim().slice(0, 26);
  const encoded = encodeCaseAndNameTag(item.caseName || "Кейс", cleanTag || null);

  await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { caseName: encoded },
  });

  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true, newCaseName: encoded };
}
