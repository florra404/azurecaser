"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { WonDropResult } from "./case";
import { getCurrentUser } from "@/lib/auth";
import { getLevelInfo } from "@/lib/levels";
import { rollCs2WearAndPrice } from "@/lib/wear";

export async function performContractAction(itemIds: string[]): Promise<{
  ok: boolean;
  error?: string;
  inputTotal?: number;
  newInventoryCount?: number;
  wonItem?: WonDropResult;
}> {
  if (!itemIds || itemIds.length < 3 || itemIds.length > 10) {
    return {
      ok: false,
      error: "Для контракта нужно выбрать от 3 до 10 скинов",
    };
  }

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Профиль не найден" };

  const sourceItems = await prisma.inventoryItem.findMany({
    where: {
      id: { in: itemIds },
      userId: user.id,
      status: "IN_INVENTORY",
    },
  });

  if (sourceItems.length !== itemIds.length) {
    return {
      ok: false,
      error: "Некоторые скины уже использованы или проданы",
    };
  }

  const inputTotal = Number(
    sourceItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)
  );

  const minPrice = inputTotal * 0.45;
  const maxPrice = inputTotal * 2.85;

  const allSkins = await prisma.skin.findMany();
  const candidates = allSkins.filter(
    (s) => s.basePrice >= minPrice && s.basePrice <= maxPrice
  );

  // Roll multiplier between 0.5x and 2.6x
  const r = Math.random();
  const targetMultiplier =
    r < 0.52
      ? 0.52 + Math.random() * 0.48
      : r < 0.88
      ? 1.0 + Math.random() * 0.65
      : 1.65 + Math.random() * 1.1;

  const desiredPrice = inputTotal * targetMultiplier;
  const pool = candidates.length > 0 ? candidates : allSkins;

  const chosenSkin = pool.reduce((prev, curr) =>
    Math.abs(curr.basePrice - desiredPrice) <
    Math.abs(prev.basePrice - desiredPrice)
      ? curr
      : prev
  );

  await prisma.inventoryItem.updateMany({
    where: { id: { in: sourceItems.map((i) => i.id) } },
    data: { status: "CONTRACT_USED" },
  });

  const { wear, floatValue, isStatTrak, finalPrice } = rollCs2WearAndPrice(
    chosenSkin.basePrice,
    chosenSkin.canBeStatTrak
  );

  const createdInv = await prisma.inventoryItem.create({
    data: {
      userId: user.id,
      skinId: chosenSkin.id,
      wear,
      floatValue,
      isStatTrak,
      price: finalPrice,
      status: "IN_INVENTORY",
      obtainedFrom: "CONTRACT",
      caseName: "Контракт",
    },
  });

  const profitDelta = Number((finalPrice - inputTotal).toFixed(2));
  const newXp = user.xp + 110;
  const newLevel = getLevelInfo(newXp).level;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totalProfit: { increment: profitDelta },
      xp: newXp,
      level: newLevel,
      nonce: { increment: 1 },
    },
  });

  const newInventoryCount = await prisma.inventoryItem.count({
    where: { userId: user.id, status: "IN_INVENTORY" },
  });

  revalidatePath("/contracts");
  revalidatePath("/profile");
  revalidatePath("/upgrader");
  revalidatePath("/");

  return {
    ok: true,
    inputTotal,
    newInventoryCount,
    wonItem: {
      inventoryItemId: createdInv.id,
      skinId: chosenSkin.id,
      name: chosenSkin.name,
      weapon: chosenSkin.weapon,
      skinName: chosenSkin.skinName,
      rarity: chosenSkin.rarity,
      imageUrl: chosenSkin.imageUrl,
      wear,
      floatValue,
      isStatTrak,
      price: finalPrice,
      rollNumber: Number((targetMultiplier * 100).toFixed(2)),
      dropChance: 100,
    },
  };
}
