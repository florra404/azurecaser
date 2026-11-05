import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import LiveDropRadar, { LiveDropItem } from "@/components/LiveDropRadar";
import CaseOpenerClient from "@/components/CaseOpenerClient";
import { CaseCardData } from "@/components/CaseVaultCard";

export const dynamic = "force-dynamic";

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();

  const [caseRecord, recentDrops, inventoryCount] = await Promise.all([
    prisma.case.findUnique({
      where: { slug },
      include: {
        category: true,
        items: {
          include: {
            skin: true,
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

  if (!caseRecord) {
    notFound();
  }

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

  const caseData: CaseCardData = {
    id: caseRecord.id,
    slug: caseRecord.slug,
    name: caseRecord.name,
    subtitle: caseRecord.subtitle,
    price: caseRecord.price,
    oldPrice: caseRecord.oldPrice,
    imageUrl: caseRecord.imageUrl,
    accentColor: caseRecord.accentColor,
    badge: caseRecord.badge,
    openCount: caseRecord.openCount,
    items: caseRecord.items.map((ci) => ({
      id: ci.id,
      name: ci.skin.name,
      weapon: ci.skin.weapon,
      skinName: ci.skin.skinName,
      rarity: ci.skin.rarity,
      basePrice: ci.skin.basePrice,
      imageUrl: ci.skin.imageUrl,
      dropChance: ci.dropChance,
    })),
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={safeUser} />
      <LiveDropRadar initialDrops={liveDrops} />

      <main className="flex-1">
        <CaseOpenerClient
          caseData={caseData}
          categoryName={caseRecord.category.name}
          initialBalance={safeUser.balance}
        />
      </main>
    </div>
  );
}
