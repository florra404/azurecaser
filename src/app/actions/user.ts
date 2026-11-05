"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getLevelInfo } from "@/lib/levels";
import { redeemPromocodeForUser } from "@/lib/promocodes";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/cases");
  revalidatePath("/upgrader");
  revalidatePath("/contracts");
  revalidatePath("/profile");
}

export async function addSimulatorBalance(amount: number) {
  const safeAmount = Math.min(Math.max(amount, 10), 25000);
  const user = await getCurrentUser();
  if (!user) return null;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: safeAmount },
    },
  });

  revalidateAll();
  return Number(updated.balance.toFixed(2));
}

export async function updateProfileAction(input: {
  username: string;
  avatar: string;
}): Promise<{
  ok: boolean;
  error?: string;
  user?: {
    id: string;
    username: string;
    avatar: string;
  };
}> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Профиль не найден" };
  }

  const cleanUsername = input.username.trim();
  if (cleanUsername.length < 2 || cleanUsername.length > 24) {
    return {
      ok: false,
      error: "Никнейм должен содержать от 2 до 24 символов",
    };
  }

  const cleanAvatar = input.avatar.trim() || "volt-viper";

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      username: cleanUsername,
      avatar: cleanAvatar,
    },
  });

  revalidateAll();
  return {
    ok: true,
    user: {
      id: updated.id,
      username: updated.username,
      avatar: updated.avatar,
    },
  };
}

export async function registerAccountAction(input: {
  username: string;
  email?: string;
  password: string;
  avatar?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  newBalance?: number;
}> {
  const cleanUsername = input.username.trim();
  const cleanEmail = (input.email || "").trim().toLowerCase();
  const cleanPassword = input.password.trim();

  if (cleanUsername.length < 3 || cleanUsername.length > 22) {
    return {
      ok: false,
      error: "Никнейм должен быть от 3 до 22 символов",
    };
  }

  if (cleanPassword.length < 4) {
    return {
      ok: false,
      error: "Пароль должен содержать минимум 4 символа",
    };
  }

  // Check if username is already taken
  const allUsers = await prisma.user.findMany();
  const exists = allUsers.find(
    (u) => u.username.toLowerCase() === cleanUsername.toLowerCase()
  );

  if (exists) {
    return {
      ok: false,
      error: "Этот никнейм уже занят. Выбери другой или войди в аккаунт.",
    };
  }

  const encodedAuth = `auth:${cleanEmail}:${cleanPassword}`;

  const created = await prisma.user.create({
    data: {
      username: cleanUsername,
      avatar: input.avatar || "volt-viper",
      balance: 1000.0,
      level: 1,
      xp: 0,
      totalOpened: 0,
      totalUpgraded: 0,
      totalProfit: 0,
      clientSeed: encodedAuth,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, created.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidateAll();
  return {
    ok: true,
    newBalance: created.balance,
  };
}

export async function loginAccountAction(input: {
  usernameOrEmail: string;
  password: string;
}): Promise<{
  ok: boolean;
  error?: string;
  newBalance?: number;
}> {
  const query = input.usernameOrEmail.trim().toLowerCase();
  const pass = input.password.trim();

  if (!query) {
    return { ok: false, error: "Введи никнейм или Email" };
  }

  const allUsers = await prisma.user.findMany();
  const target = allUsers.find((u) => {
    const unameMatch = u.username.toLowerCase() === query;
    if (u.clientSeed.startsWith("auth:")) {
      const parts = u.clientSeed.split(":");
      const emailPart = (parts[1] || "").toLowerCase();
      return unameMatch || (emailPart && emailPart === query);
    }
    return unameMatch;
  });

  if (!target) {
    return {
      ok: false,
      error: "Аккаунт с таким никнеймом или Email не найден",
    };
  }

  if (target.clientSeed.startsWith("auth:")) {
    const parts = target.clientSeed.split(":");
    const savedPass = parts.slice(2).join(":");
    if (savedPass !== pass) {
      return { ok: false, error: "Неверный пароль" };
    }
  }

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
  };
}

export async function claimRankBonusAction(): Promise<{
  ok: boolean;
  error?: string;
  bonusUsd?: number;
  xpAdded?: number;
  newBalance?: number;
  newLevel?: number;
  newXp?: number;
}> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Профиль не найден" };

  const info = getLevelInfo(user.xp);
  const bonusUsd = info.rank.bonusUsd;
  const xpAdded = 350; // +1 Full Level Up & Rank Cash Reward
  const nextXp = user.xp + xpAdded;
  const nextLevel = getLevelInfo(nextXp).level;

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      balance: { increment: bonusUsd },
      xp: nextXp,
      level: nextLevel,
    },
  });

  revalidateAll();
  return {
    ok: true,
    bonusUsd,
    xpAdded,
    newBalance: Number(updated.balance.toFixed(2)),
    newLevel: updated.level,
    newXp: updated.xp,
  };
}

export async function redeemPromoAction(code: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "Профиль не найден" };
  }

  const res = await redeemPromocodeForUser(code, user.id);
  if (res.ok) {
    revalidateAll();
  }
  return res;
}
