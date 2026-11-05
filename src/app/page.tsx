import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import LiveDropRadar, { LiveDropItem } from "@/components/LiveDropRadar";
import HomeShowcase, { CategoryWithCases } from "@/components/HomeShowcase";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  const [categoriesRaw, recentDrops, totalSkinsCount, inventoryItems] =
    await Promise.all([
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
      prisma.skin.count(),
      prisma.inventoryItem.findMany({
        where: {
          status: "IN_INVENTORY",
          ...(user ? { userId: user.id } : {}),
        },
        orderBy: { price: "desc" },
        include: {
          skin: true,
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
        inventoryCount: inventoryItems.length,
      }
    : {
        id: "guest",
        username: "Azure_Operative",
        avatar: "/avatars/operative.svg",
        balance: 750.0,
        level: 14,
        xp: 4820,
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
    <div className="min-h-screen flex flex-col">
      <Navbar user={safeUser} />
      <LiveDropRadar initialDrops={liveDrops} />

      <main className="flex-1">
        <HomeShowcase
          categories={categories}
          inventoryPreview={inventoryItems}
          totalSkinsCount={totalSkinsCount}
        />
      </main>

      <footer className="mt-20 border-t border-zinc-800/80 bg-[#09090B] py-8">
        <div className="mx-auto flex max-w-[1600px] flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:text-left lg:px-8">
          <div>
            <div className="font-display text-base font-black tracking-tight text-white">
              AZURE<span className="text-[#D4FF00]">CASER</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Симулятор открытия кейсов, контрактов и апгрейдов CS2.
            </p>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs text-zinc-500">
            <span>PROVABLY FAIR</span>
            <span>•</span>
            <span>CS2 DATABASE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
