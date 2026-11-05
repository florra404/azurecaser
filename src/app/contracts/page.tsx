import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import LiveDropRadar, { LiveDropItem } from "@/components/LiveDropRadar";
import ContractsClient from "@/components/ContractsClient";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const user = await getCurrentUser();
  const [inventoryItems, recentDrops] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: {
        status: "IN_INVENTORY",
        ...(user ? { userId: user.id } : {}),
      },
      orderBy: { price: "desc" },
      include: { skin: true },
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
        inventoryCount: inventoryItems.length,
      }
    : {
        id: "guest",
        username: "Viperr",
        avatar: "/avatars/operative.svg",
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
        <ContractsClient initialInventory={inventoryItems} />
      </main>
    </div>
  );
}
