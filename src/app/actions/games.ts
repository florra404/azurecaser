"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getLevelInfo } from "@/lib/levels";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/earn");
  revalidatePath("/cases");
  revalidatePath("/upgrader");
  revalidatePath("/profile");
}

export async function claimEarnedMoneyAction(input: {
  amountUsd: number;
  sourceName: string;
  xpEarned?: number;
}): Promise<{
  ok: boolean;
  error?: string;
  newBalance?: number;
  addedUsd?: number;
  newLevel?: number;
  newXp?: number;
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Профиль не найден" };
  }

  const safeAmount = Number(
    Math.min(Math.max(input.amountUsd, 0.05), 120).toFixed(2)
  );
  const safeXp = Math.min(Math.max(Math.floor(input.xpEarned || 15), 5), 500);
  const nextXp = user.xp + safeXp;
  const nextLevel = getLevelInfo(nextXp).level;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: safeAmount },
      totalProfit: { increment: safeAmount },
      xp: nextXp,
      level: nextLevel,
    },
  });

  revalidateAll();
  return {
    ok: true,
    addedUsd: safeAmount,
    newBalance: Number(updated.balance.toFixed(2)),
    newLevel: updated.level,
    newXp: updated.xp,
  };
}

export async function placeMiniGameBetAction(betUsd: number): Promise<{
  ok: boolean;
  error?: string;
  newBalance?: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Профиль не найден" };

  const cleanBet = Number(betUsd.toFixed(2));
  if (cleanBet < 0.2) {
    return { ok: false, error: "Минимальная ставка — $0.20" };
  }
  if (cleanBet > 50) {
    return { ok: false, error: "Максимальная ставка в хардкор-режиме — $50.00" };
  }
  if (user.balance < cleanBet) {
    return {
      ok: false,
      error: "Недостаточно средств на балансе! Заработай в Тире или Цехе.",
    };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { decrement: cleanBet },
      nonce: { increment: 1 },
    },
  });

  revalidateAll();
  return {
    ok: true,
    newBalance: Number(updated.balance.toFixed(2)),
  };
}

export async function cashoutMiniGameWinAction(input: {
  winUsd: number;
  betUsd: number;
}): Promise<{
  ok: boolean;
  error?: string;
  newBalance?: number;
  newLevel?: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Профиль не найден" };

  const cleanWin = Number(Math.max(0, input.winUsd).toFixed(2));
  const netProfit = Number((cleanWin - input.betUsd).toFixed(2));
  const nextXp = user.xp + 65;
  const nextLevel = getLevelInfo(nextXp).level;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: cleanWin },
      totalProfit: { increment: Math.max(0, netProfit) },
      xp: nextXp,
      level: nextLevel,
    },
  });

  revalidateAll();
  return {
    ok: true,
    newBalance: Number(updated.balance.toFixed(2)),
    newLevel: updated.level,
  };
}
