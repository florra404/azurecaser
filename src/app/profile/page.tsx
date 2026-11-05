import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import LiveDropRadar, { LiveDropItem } from "@/components/LiveDropRadar";
import ProfileClient from "@/components/ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const [inventoryItems, caseHistoryRaw, upgradeHistory, recentDrops] =
    await Promise.all([
      prisma.inventoryItem.findMany({
        where: {
          status: "IN_INVENTORY",
          ...(user ? { userId: user.id } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { skin: true },
      }),
      prisma.openHistory.findMany({
        where: user ? { userId: user.id } : undefined,
        take: 36,
        orderBy: { createdAt: "desc" },
        include: { case: true },
      }),
      prisma.upgradeHistory.findMany({
        where: user ? { userId: user.id } : undefined,
        take: 36,
        orderBy: { createdAt: "desc" },
      }),
      prisma.openHistory.findMany({
        take: 14,
        orderBy: { createdAt: "desc" },
        include: { case: true, user: true },
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
        totalOpened: user.totalOpened,
        totalUpgraded: user.totalUpgraded,
        totalProfit: user.totalProfit,
        inventoryCount: inventoryItems.length,
      }
    : {
        id: "guest",
        username: "Viperr",
        avatar: "/avatars/operative.svg",
        balance: 1000.0,
        level: 15,
        xp: 5250,
        totalOpened: 0,
        totalUpgraded: 0,
        totalProfit: 0,
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

  const caseHistory = caseHistoryRaw.map((h) => ({
    id: h.id,
    skinName: h.skinName,
    weapon: h.weapon,
    rarity: h.rarity,
    imageUrl: h.imageUrl,
    wear: h.wear,
    floatValue: h.floatValue,
    isStatTrak: h.isStatTrak,
    price: h.price,
    caseName: h.case.name,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={safeUser} />
      <LiveDropRadar initialDrops={liveDrops} />
      <main className="flex-1">
        <ProfileClient
          user={safeUser}
          initialInventory={inventoryItems}
          caseHistory={caseHistory}
          upgradeHistory={upgradeHistory}
        />
      </main>
    </div>
  );
}
