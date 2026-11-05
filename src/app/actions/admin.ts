"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getLevelInfo } from "@/lib/levels";
import { expandCatalogAndRebalanceCases } from "@/lib/rebalance";
import {
  createPromocodeRecord,
  deletePromocodeRecord,
} from "@/lib/promocodes";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/cases");
  revalidatePath("/upgrader");
  revalidatePath("/contracts");
  revalidatePath("/profile");
  revalidatePath("/admin");
}

export async function adminSetBalanceAndLevelAction(input: {
  userId?: string;
  balance?: number;
  addBalance?: number;
  xp?: number;
  addXp?: number;
}) {
  const current = await getCurrentUser();
  const targetId = input.userId || current?.id;
  if (!targetId) return { ok: false, error: "Пользователь не найден" };

  const targetUser = await prisma.user.findUnique({ where: { id: targetId } });
  if (!targetUser) return { ok: false, error: "Пользователь не найден" };

  const nextBalance =
    typeof input.balance === "number"
      ? Math.max(0, input.balance)
      : typeof input.addBalance === "number"
      ? Math.max(0, targetUser.balance + input.addBalance)
      : targetUser.balance;

  const nextXp =
    typeof input.xp === "number"
      ? Math.max(0, Math.floor(input.xp))
      : typeof input.addXp === "number"
      ? Math.max(0, targetUser.xp + Math.floor(input.addXp))
      : targetUser.xp;

  const nextLevel = getLevelInfo(nextXp).level;

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: {
      balance: Number(nextBalance.toFixed(2)),
      xp: nextXp,
      level: nextLevel,
    },
  });

  revalidateAll();
  return {
    ok: true,
    newBalance: updated.balance,
    newLevel: updated.level,
    newXp: updated.xp,
  };
}

export async function adminGiveSkinAction(input: {
  userId?: string;
  skinId: string;
  wear: string;
  floatValue: number;
  isStatTrak: boolean;
  customPrice?: number;
  quantity?: number;
}) {
  const current = await getCurrentUser();
  const targetId = input.userId || current?.id;
  if (!targetId) return { ok: false, error: "Пользователь не найден" };

  const skin = await prisma.skin.findUnique({ where: { id: input.skinId } });
  if (!skin) return { ok: false, error: "Скин не найден" };

  const qty = Math.min(Math.max(Math.floor(input.quantity || 1), 1), 10);
  const finalPrice =
    typeof input.customPrice === "number" && input.customPrice > 0
      ? Number(input.customPrice.toFixed(2))
      : skin.basePrice;

  for (let i = 0; i < qty; i++) {
    await prisma.inventoryItem.create({
      data: {
        userId: targetId,
        skinId: skin.id,
        wear: input.wear || "FN",
        floatValue: Number((input.floatValue || 0.001337).toFixed(6)),
        isStatTrak: !!input.isStatTrak,
        price: finalPrice,
        status: "IN_INVENTORY",
        obtainedFrom: "BONUS",
        caseName: "ADMIN SPAWN",
      },
    });
  }

  const newInventoryCount = await prisma.inventoryItem.count({
    where: { userId: targetId, status: "IN_INVENTORY" },
  });

  revalidateAll();
  return {
    ok: true,
    skinName: skin.name,
    quantity: qty,
    newInventoryCount,
  };
}

export async function adminGiveGodPackAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Пользователь не найден" };

  const godNames = [
    "AWP | Dragon Lore",
    "AWP | Gungnir",
    "★ Butterfly Knife | Gamma Doppler",
    "★ Karambit | Doppler",
    "AK-47 | Wild Lotus",
    "M4A4 | Howl",
    "★ Sport Gloves | Pandora's Box",
    "AK-47 | Gold Arabesque",
  ];

  const allSkins = await prisma.skin.findMany();
  let spawned = 0;

  for (const gName of godNames) {
    const sk =
      allSkins.find((s) => s.name === gName) ||
      allSkins.find((s) => s.name.includes(gName.split("|")[1]?.trim() || ""));
    if (sk) {
      await prisma.inventoryItem.create({
        data: {
          userId: user.id,
          skinId: sk.id,
          wear: "FN",
          floatValue: 0.000777,
          isStatTrak: sk.canBeStatTrak,
          price: sk.basePrice,
          status: "IN_INVENTORY",
          obtainedFrom: "BONUS",
          caseName: "VIPERR GOD PACK",
        },
      });
      spawned++;
    }
  }

  const newInventoryCount = await prisma.inventoryItem.count({
    where: { userId: user.id, status: "IN_INVENTORY" },
  });

  revalidateAll();
  return {
    ok: true,
    spawned,
    newInventoryCount,
  };
}

export async function adminUpdateCaseAction(input: {
  caseId: string;
  price: number;
  oldPrice: number | null;
  badge: string | null;
}) {
  const safePrice = Math.max(0.2, Number(input.price.toFixed(2)));
  await prisma.case.update({
    where: { id: input.caseId },
    data: {
      price: safePrice,
      oldPrice: input.oldPrice ? Number(input.oldPrice.toFixed(2)) : null,
      badge: input.badge?.trim() || null,
    },
  });

  revalidateAll();
  return { ok: true };
}

export async function adminCreateCustomCaseAction(input: {
  name: string;
  subtitle: string;
  price: number;
  badge: string;
  categoryId: string;
  heroSkinId: string;
}) {
  const cleanName = input.name.trim();
  if (!cleanName) return { ok: false, error: "Укажи название кейса" };

  const heroSkin = await prisma.skin.findUnique({
    where: { id: input.heroSkinId },
  });
  if (!heroSkin) return { ok: false, error: "Главный скин не найден" };

  const safePrice = Math.max(0.5, Number(input.price.toFixed(2)));
  const slug = `custom-${Date.now()}`;

  const createdCase = await prisma.case.create({
    data: {
      slug,
      name: cleanName,
      subtitle: input.subtitle.trim() || "Авторская сборка администратора",
      price: safePrice,
      oldPrice: Number((safePrice * 1.2).toFixed(2)),
      imageUrl: heroSkin.imageUrl,
      accentColor: "#D4FF00",
      badge: input.badge.trim() || "ADMIN",
      openCount: 777,
      sortOrder: 0,
      categoryId: input.categoryId,
    },
  });

  // Auto-populate 10 balanced skins around safePrice
  const allSkins = await prisma.skin.findMany();
  const multipliers = [2.4, 1.7, 1.3, 1.05, 0.85, 0.7, 0.55, 0.42, 0.32];
  const chances = [3.5, 6.5, 10.0, 14.0, 16.0, 16.0, 14.0, 11.0, 7.0];
  const used = new Set<string>([heroSkin.id]);

  await prisma.caseItem.create({
    data: {
      caseId: createdCase.id,
      skinId: heroSkin.id,
      dropChance: 2.0,
      weight: 200,
    },
  });

  for (let i = 0; i < multipliers.length; i++) {
    const targetP = safePrice * multipliers[i];
    const candidate = [...allSkins]
      .filter((s) => !used.has(s.id))
      .sort(
        (a, b) =>
          Math.abs(a.basePrice - targetP) - Math.abs(b.basePrice - targetP)
      )[0];
    if (candidate) {
      used.add(candidate.id);
      await prisma.caseItem.create({
        data: {
          caseId: createdCase.id,
          skinId: candidate.id,
          dropChance: chances[i],
          weight: Math.round(chances[i] * 100),
        },
      });
    }
  }

  revalidateAll();
  return { ok: true, slug };
}

export async function adminRunFullRebalanceAction() {
  const result = await expandCatalogAndRebalanceCases();
  revalidateAll();
  return {
    ok: true,
    ...result,
  };
}

export async function adminTriggerLiveDropRainAction() {
  const user = await getCurrentUser();
  const firstCase = await prisma.case.findFirst();
  if (!user || !firstCase) return { ok: false };

  const topSkins = await prisma.skin.findMany({
    where: {
      rarity: { in: ["GOLD", "COVERT"] },
    },
    orderBy: { basePrice: "desc" },
    take: 12,
  });

  for (let i = 0; i < Math.min(6, topSkins.length); i++) {
    const sk = topSkins[i];
    await prisma.openHistory.create({
      data: {
        userId: user.id,
        caseId: firstCase.id,
        skinName: sk.name,
        weapon: sk.weapon,
        rarity: sk.rarity,
        imageUrl: sk.imageUrl,
        wear: "FN",
        floatValue: 0.00105,
        isStatTrak: true,
        price: sk.basePrice,
        rollNumber: 0.12,
      },
    });
  }

  revalidateAll();
  return { ok: true };
}

export async function adminSwitchUserSessionAction(userId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "Аккаунт не найден" };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, target.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidateAll();
  return {
    ok: true,
    newBalance: target.balance,
    username: target.username,
  };
}

export async function adminClearInventoryAction(userId?: string) {
  const current = await getCurrentUser();
  const targetId = userId || current?.id;
  if (!targetId) return { ok: false };

  await prisma.inventoryItem.updateMany({
    where: { userId: targetId, status: "IN_INVENTORY" },
    data: { status: "SOLD" },
  });

  revalidateAll();
  return { ok: true };
}

export async function adminCreatePromoAction(input: {
  code: string;
  description: string;
  rewardType: "BALANCE" | "SKIN" | "XP";
  amount: number;
  skinName?: string;
  wear?: "FN" | "MW" | "FT" | "WW" | "BS";
  isStatTrak?: boolean;
  maxUses: number;
}) {
  const res = await createPromocodeRecord(input);
  revalidateAll();
  return res;
}

export async function adminDeletePromoAction(code: string) {
  await deletePromocodeRecord(code);
  revalidateAll();
  return { ok: true };
}
