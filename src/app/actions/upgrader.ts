"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { WonDropResult } from "./case";
import { getCurrentUser } from "@/lib/auth";
import { getLevelInfo } from "@/lib/levels";
import { rollCs2WearAndPrice } from "@/lib/wear";

export interface PerformUpgradeInput {
  mode: "skins" | "balance";
  sourceItemIds: string[];
  balanceBet: number;
  targetSkinId: string;
  invertSector: boolean;
}

export interface PerformUpgradeResult {
  ok: boolean;
  error?: string;
  isSuccess?: boolean;
  rollValue?: number;
  targetAngle?: number;
  chance?: number;
  newBalance?: number;
  newInventoryCount?: number;
  consumedItemIds?: string[];
  wonItem?: WonDropResult;
}

export async function performUpgradeAction(
  input: PerformUpgradeInput
): Promise<PerformUpgradeResult> {
  const [user, targetSkin] = await Promise.all([
    getCurrentUser(),
    prisma.skin.findUnique({ where: { id: input.targetSkinId } }),
  ]);

  if (!user || !targetSkin) {
    return { ok: false, error: "Скин или профиль не найден" };
  }

  let sourceValue = 0;
  let consumedIds: string[] = [];

  if (input.mode === "skins") {
    if (!input.sourceItemIds || input.sourceItemIds.length === 0) {
      return { ok: false, error: "Выбери хотя бы один скин для апгрейда" };
    }

    const items = await prisma.inventoryItem.findMany({
      where: {
        id: { in: input.sourceItemIds },
        userId: user.id,
        status: "IN_INVENTORY",
      },
    });

    if (items.length !== input.sourceItemIds.length) {
      return {
        ok: false,
        error: "Выбранные скины уже проданы или использованы",
      };
    }

    sourceValue = Number(
      items.reduce((sum, item) => sum + item.price, 0).toFixed(2)
    );
    consumedIds = items.map((i) => i.id);
  } else {
    const bet = Number(input.balanceBet.toFixed(2));
    if (bet < 0.5) {
      return { ok: false, error: "Минимальная сумма ставки — $0.50" };
    }
    if (user.balance < bet) {
      return { ok: false, error: "Недостаточно средств на балансе" };
    }
    sourceValue = bet;
  }

  if (targetSkin.basePrice <= sourceValue * 1.05) {
    return {
      ok: false,
      error: "Целевой скин должен быть дороже твоей ставки",
    };
  }

  const rawChance = (sourceValue / targetSkin.basePrice) * 96;
  const chance = Number(Math.min(Math.max(rawChance, 1.0), 80.0).toFixed(2));
  const rollValue = Number((Math.random() * 100).toFixed(2));

  const isSuccess = !input.invertSector
    ? rollValue <= chance
    : rollValue >= Number((100 - chance).toFixed(2));

  const targetAngle = Number(((rollValue / 100) * 360).toFixed(2));

  // Mark used source skins as consumed
  if (input.mode === "skins" && consumedIds.length > 0) {
    await prisma.inventoryItem.updateMany({
      where: { id: { in: consumedIds } },
      data: { status: "UPGRADED_LOST" },
    });
  }

  let wonItemResult: WonDropResult | undefined = undefined;

  if (isSuccess) {
    const { wear, floatValue, isStatTrak, finalPrice } = rollCs2WearAndPrice(
      targetSkin.basePrice,
      targetSkin.canBeStatTrak
    );

    const createdInv = await prisma.inventoryItem.create({
      data: {
        userId: user.id,
        skinId: targetSkin.id,
        wear,
        floatValue,
        isStatTrak,
        price: finalPrice,
        status: "IN_INVENTORY",
        obtainedFrom: "UPGRADE",
        caseName: "Апгрейд",
      },
    });

    wonItemResult = {
      inventoryItemId: createdInv.id,
      skinId: targetSkin.id,
      name: targetSkin.name,
      weapon: targetSkin.weapon,
      skinName: targetSkin.skinName,
      rarity: targetSkin.rarity,
      imageUrl: targetSkin.imageUrl,
      wear,
      floatValue,
      isStatTrak,
      price: finalPrice,
      rollNumber: rollValue,
      dropChance: chance,
    };
  }

  const profitDelta = isSuccess
    ? Number((targetSkin.basePrice - sourceValue).toFixed(2))
    : -sourceValue;
  const newXp = user.xp + (isSuccess ? 140 : 45);
  const newLevel = getLevelInfo(newXp).level;

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance:
        input.mode === "balance" ? { decrement: sourceValue } : undefined,
      totalUpgraded: { increment: 1 },
      totalProfit: { increment: profitDelta },
      xp: newXp,
      level: newLevel,
      nonce: { increment: 1 },
    },
  });

  await prisma.upgradeHistory.create({
    data: {
      userId: user.id,
      sourceValue,
      targetSkinName: targetSkin.name,
      targetWeapon: targetSkin.weapon,
      targetRarity: targetSkin.rarity,
      targetImageUrl: targetSkin.imageUrl,
      targetPrice: targetSkin.basePrice,
      chance,
      rollValue,
      isSuccess,
    },
  });

  const newInventoryCount = await prisma.inventoryItem.count({
    where: { userId: user.id, status: "IN_INVENTORY" },
  });

  revalidatePath("/upgrader");
  revalidatePath("/profile");
  revalidatePath("/contracts");
  revalidatePath("/");

  return {
    ok: true,
    isSuccess,
    rollValue,
    targetAngle,
    chance,
    newBalance: Number(updatedUser.balance.toFixed(2)),
    newInventoryCount,
    consumedItemIds: consumedIds,
    wonItem: wonItemResult,
  };
}
