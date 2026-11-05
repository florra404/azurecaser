"use server";

import fs from "fs";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getLevelInfo } from "@/lib/levels";
import { MISSIONS_CATALOG, WHEEL_SECTORS } from "@/lib/retention-catalog";

const RETENTION_FILE = process.env.VERCEL
  ? "/tmp/retention.json"
  : path.join(process.cwd(), "prisma", "retention.json");

export interface UserRetentionRecord {
  userId: string;
  claimedMissions: string[];
  claimedTrophies: string[];
  streakDay: number;
  lastStreakClaimAt: number;
  lastWheelSpinAt: number;
  wheelSpinsCount: number;
}

function readRetentionStore(): Record<string, UserRetentionRecord> {
  try {
    if (fs.existsSync(RETENTION_FILE)) {
      const raw = fs.readFileSync(RETENTION_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch {
    // Fallback
  }
  return {};
}

function writeRetentionStore(data: Record<string, UserRetentionRecord>) {
  try {
    fs.writeFileSync(RETENTION_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Ignore write error
  }
}

function getOrCreateRecord(
  store: Record<string, UserRetentionRecord>,
  userId: string
): UserRetentionRecord {
  if (!store[userId]) {
    store[userId] = {
      userId,
      claimedMissions: [],
      claimedTrophies: [],
      streakDay: 1,
      lastStreakClaimAt: 0,
      lastWheelSpinAt: 0,
      wheelSpinsCount: 0,
    };
  }
  return store[userId];
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/missions");
  revalidatePath("/profile");
  revalidatePath("/cases");
}

export async function getUserRetentionRecordAction(
  userId: string
): Promise<UserRetentionRecord> {
  const store = readRetentionStore();
  return getOrCreateRecord(store, userId);
}

export async function claimMissionRewardAction(missionId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Профиль не найден" };

  const mission = MISSIONS_CATALOG.find((m) => m.id === missionId);
  if (!mission) return { ok: false, error: "Миссия не найдена" };

  const store = readRetentionStore();
  const rec = getOrCreateRecord(store, user.id);

  if (rec.claimedMissions.includes(missionId)) {
    return { ok: false, error: "Награда за эту миссию уже получена!" };
  }

  rec.claimedMissions.push(missionId);
  writeRetentionStore(store);

  const nextXp = user.xp + mission.rewardXp;
  const nextLevel = getLevelInfo(nextXp).level;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: mission.rewardUsd },
      xp: nextXp,
      level: nextLevel,
    },
  });

  revalidateAll();
  return {
    ok: true,
    rewardUsd: mission.rewardUsd,
    rewardXp: mission.rewardXp,
    newBalance: Number(updated.balance.toFixed(2)),
    newLevel: updated.level,
  };
}

export async function claimDailyStreakBonusAction() {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Профиль не найден" };

  const store = readRetentionStore();
  const rec = getOrCreateRecord(store, user.id);

  const now = Date.now();
  const cooldownMs = 4 * 60 * 1000;
  if (now - rec.lastStreakClaimAt < cooldownMs) {
    const leftSec = Math.ceil((cooldownMs - (now - rec.lastStreakClaimAt)) / 1000);
    return {
      ok: false,
      error: `Следующий стрик-бонус будет доступен через ${leftSec} сек.`,
    };
  }

  const day = rec.streakDay;
  const rewardsUsd = [0.22, 0.38, 0.55, 0.85, 1.25, 1.9, 3.5];
  const rewardUsd = rewardsUsd[(day - 1) % rewardsUsd.length];
  const rewardXp = day * 85;

  rec.lastStreakClaimAt = now;
  rec.streakDay = day >= 7 ? 1 : day + 1;
  writeRetentionStore(store);

  const nextXp = user.xp + rewardXp;
  const nextLevel = getLevelInfo(nextXp).level;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: rewardUsd },
      xp: nextXp,
      level: nextLevel,
    },
  });

  revalidateAll();
  return {
    ok: true,
    claimedDay: day,
    nextStreakDay: rec.streakDay,
    rewardUsd,
    rewardXp,
    newBalance: Number(updated.balance.toFixed(2)),
  };
}

export async function spinFortuneWheelAction(paidSpin: boolean = false) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Профиль не найден" };

  const store = readRetentionStore();
  const rec = getOrCreateRecord(store, user.id);
  const now = Date.now();
  const freeCooldownMs = 90 * 1000;
  const spinCostUsd = 0.35;

  if (!paidSpin && now - rec.lastWheelSpinAt < freeCooldownMs) {
    const waitSec = Math.ceil((freeCooldownMs - (now - rec.lastWheelSpinAt)) / 1000);
    return {
      ok: false,
      error: `Бесплатный прокрут перезаряжается (${waitSec}с). Либо крути платно за $0.35!`,
    };
  }

  if (paidSpin && user.balance < spinCostUsd) {
    return {
      ok: false,
      error: "Недостаточно баланса для платного вращения ($0.35)",
    };
  }

  const totalWeight = WHEEL_SECTORS.reduce((s, sec) => s + sec.weight, 0);
  let r = Math.random() * totalWeight;
  let chosenSector = WHEEL_SECTORS[0];
  for (const sec of WHEEL_SECTORS) {
    if (r < sec.weight) {
      chosenSector = sec;
      break;
    }
    r -= sec.weight;
  }

  if (!paidSpin) {
    rec.lastWheelSpinAt = now;
  }
  rec.wheelSpinsCount += 1;
  writeRetentionStore(store);

  let balanceDelta = paidSpin ? -spinCostUsd : 0;
  let xpDelta = 25;
  let droppedSkinName: string | null = null;

  if (chosenSector.type === "CASH" || chosenSector.type === "JACKPOT") {
    balanceDelta += chosenSector.amount;
  } else if (chosenSector.type === "XP") {
    xpDelta += chosenSector.amount;
  } else if (chosenSector.type === "SKIN") {
    const pool = await prisma.skin.findMany({
      where:
        chosenSector.amount > 1
          ? { basePrice: { gte: 1.5, lte: 18 } }
          : { basePrice: { gte: 0.15, lte: 3.5 } },
      take: 40,
    });
    const chosenSkin =
      pool[Math.floor(Math.random() * pool.length)] ||
      (await prisma.skin.findFirst());

    if (chosenSkin) {
      await prisma.inventoryItem.create({
        data: {
          userId: user.id,
          skinId: chosenSkin.id,
          wear: "FT",
          floatValue: 0.2145,
          isStatTrak: false,
          price: chosenSkin.basePrice,
          status: "IN_INVENTORY",
          obtainedFrom: "BONUS",
          caseName: "КОЛЕСО ФОРТУНЫ",
        },
      });
      droppedSkinName = `${chosenSkin.name} ($${chosenSkin.basePrice.toFixed(2)})`;
    }
  }

  const nextXp = user.xp + xpDelta;
  const nextLevel = getLevelInfo(nextXp).level;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: Number(balanceDelta.toFixed(2)) },
      xp: nextXp,
      level: nextLevel,
    },
  });

  const newInvCount = await prisma.inventoryItem.count({
    where: { userId: user.id, status: "IN_INVENTORY" },
  });

  revalidateAll();
  return {
    ok: true,
    sectorIndex: chosenSector.index,
    sectorLabel: chosenSector.label,
    sectorType: chosenSector.type,
    droppedSkinName,
    newBalance: Number(updated.balance.toFixed(2)),
    newInventoryCount: newInvCount,
    lastWheelSpinAt: rec.lastWheelSpinAt,
  };
}
