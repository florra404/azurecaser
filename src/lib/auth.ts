import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { getLevelInfo } from "./levels";

export const SESSION_COOKIE_NAME = "azurecaser_uid";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const uid = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (uid) {
      const found = await prisma.user.findUnique({
        where: { id: uid },
      });
      if (found) {
        return syncUserLevel(found);
      }
    }
  } catch {
    // Fallback if cookies() is called outside request context
  }

  const fallback = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (fallback) {
    return syncUserLevel(fallback);
  }

  return null;
}

async function syncUserLevel<
  T extends { id: string; xp: number; level: number }
>(user: T): Promise<T> {
  const computedLevel = getLevelInfo(user.xp).level;
  if (computedLevel !== user.level) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { level: computedLevel },
      });
      return { ...user, level: computedLevel };
    } catch {
      return { ...user, level: computedLevel };
    }
  }
  return user;
}
