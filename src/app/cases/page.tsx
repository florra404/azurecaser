import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import LiveDropRadar, { LiveDropItem } from "@/components/LiveDropRadar";
import CasesCatalogClient from "@/components/CasesCatalogClient";
import { CategoryWithCases } from "@/components/HomeShowcase";

export const dynamic = "force-dynamic";

export default async function CasesPage() {
  const user = await getCurrentUser();
  const [categoriesRaw, recentDrops, inventoryCount] = await Promise.all([
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        cases: {
          orderBy: { sortOrder: "asc" },
          include: {
            items: {
              include: {
                skin: true,
              },
            },
          },
        },
      },
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

  const categories: CategoryWithCases[] = categoriesRaw.map((cat) => ({
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    subtitle: cat.subtitle,
    icon: cat.icon,
    accentColor: cat.accentColor,
    cases: cat.cases.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      subtitle: c.subtitle,
      price: c.price,
      oldPrice: c.oldPrice,
      imageUrl: c.imageUrl,
      accentColor: c.accentColor,
      badge: c.badge,
      openCount: c.openCount,
      items: c.items.map((ci) => ({
        id: ci.id,
        name: ci.skin.name,
        weapon: ci.skin.weapon,
        skinName: ci.skin.skinName,
        rarity: ci.skin.rarity,
        basePrice: ci.skin.basePrice,
        imageUrl: ci.skin.imageUrl,
        dropChance: ci.dropChance,
      })),
    })),
  }));

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={safeUser} />
      <LiveDropRadar initialDrops={liveDrops} />
      <main className="flex-1">
        <CasesCatalogClient categories={categories} />
      </main>
    </div>
  );
}
