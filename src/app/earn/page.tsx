import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import LiveDropRadar, { LiveDropItem } from "@/components/LiveDropRadar";
import EarnClient from "@/components/EarnClient";

export const dynamic = "force-dynamic";

export default async function EarnPage() {
  const user = await getCurrentUser();

  const [recentDrops, inventoryCount] = await Promise.all([
    prisma.openHistory.findMany({
      take: 14,
      orderBy: { createdAt: "desc" },
      include: {
        case: true,
        user: true,
      },
    }),
    prisma.inventoryItem.count({
      where: {
        status: "IN_INVENTORY",
        ...(user ? { userId: user.id } : {}),
      },
    }),
  ]);

  const safeUser = user
    ? {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        balance: user.balance,
        level: user.level,
        xp: user.xp,
        inventoryCount,
      }
    : {
        id: "guest",
        username: "Viperr",
        avatar: "volt-viper",
        balance: 1000.0,
        level: 15,
        xp: 5250,
        inventoryCount: 0,
      };

  const liveDrops: LiveDropItem[] = recentDrops.map((d) => ({
    id: d.id,
    skinName: d.skinName,
    weapon: d.weapon,
    rarity: d.rarity,
    imageUrl: d.imageUrl,
    wear: d.wear,
    isStatTrak: d.isStatTrak,
    price: d.price,
    caseName: d.case.name,
    username: d.user.username,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={safeUser} />
      <LiveDropRadar initialDrops={liveDrops} />

      <main className="flex-1">
        <EarnClient initialBalance={safeUser.balance} />
      </main>
    </div>
  );
}
