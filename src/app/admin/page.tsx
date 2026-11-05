import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAllPromocodes } from "@/lib/promocodes";
import Navbar from "@/components/Navbar";
import LiveDropRadar, { LiveDropItem } from "@/components/LiveDropRadar";
import AdminClient from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();

  const [
    allUsers,
    allSkins,
    allCasesRaw,
    categories,
    recentDrops,
    inventoryCount,
    promocodes,
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
    }),
    prisma.skin.findMany({
      orderBy: { basePrice: "desc" },
    }),
    prisma.case.findMany({
      orderBy: { price: "asc" },
      include: {
        category: true,
        _count: {
          select: { items: true },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
    }),
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
    getAllPromocodes(),
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
        inventoryCount,
      }
    : {
        id: "guest",
        username: "Viperr",
        avatar: "volt-viper",
        balance: 1000.0,
        level: 15,
        xp: 5250,
        totalOpened: 0,
        totalUpgraded: 0,
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

  const allCases = allCasesRaw.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    subtitle: c.subtitle,
    price: c.price,
    oldPrice: c.oldPrice,
    badge: c.badge,
    imageUrl: c.imageUrl,
    categoryName: c.category.name,
    itemsCount: c._count.items,
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={safeUser} />
      <LiveDropRadar initialDrops={liveDrops} />

      <main className="flex-1">
        <AdminClient
          currentUser={safeUser}
          allUsers={allUsers}
          allSkins={allSkins}
          allCases={allCases}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          initialPromocodes={promocodes}
        />
      </main>
    </div>
  );
}
