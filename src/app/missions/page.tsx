import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import LiveDropRadar, { LiveDropItem } from "@/components/LiveDropRadar";
import MissionsClient, {
  LeaderboardEntry,
  MissionsPlayerStats,
} from "@/components/MissionsClient";
import { getUserRetentionRecordAction } from "@/app/actions/retention";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const user = await getCurrentUser();

  const [recentDrops, inventoryItems, topUsers, contractItemsCount] =
    await Promise.all([
      prisma.openHistory.findMany({
        take: 14,
        orderBy: { createdAt: "desc" },
        include: { case: true, user: true },
      }),
      prisma.inventoryItem.findMany({
        where: {
          status: "IN_INVENTORY",
          ...(user ? { userId: user.id } : {}),
        },
        include: { skin: true },
      }),
      prisma.user.findMany({
        take: 9,
        orderBy: [{ xp: "desc" }, { totalOpened: "desc" }],
      }),
      prisma.inventoryItem.count({
        where: {
          obtainedFrom: "CONTRACT",
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
        inventoryCount: inventoryItems.length,
      }
    : {
        id: "guest",
        username: "Viperr",
        avatar: "/avatars/operative.svg",
        balance: 0,
        level: 1,
        xp: 0,
        inventoryCount: 0,
      };

  const retentionRecord = await getUserRetentionRecordAction(safeUser.id);
  const hasRareDrop = inventoryItems.some(
    (it) => it.skin.rarity === "GOLD" || it.skin.rarity === "COVERT"
  );

  const playerStats: MissionsPlayerStats = {
    userId: safeUser.id,
    username: safeUser.username,
    balance: safeUser.balance,
    level: safeUser.level,
    xp: safeUser.xp,
    casesOpened: user?.totalOpened || 0,
    upgraderWins: user?.totalUpgraded || 0,
    contractsDone: contractItemsCount,
    inventoryCount: inventoryItems.length,
    hasRareDrop,
    claimedMissions: retentionRecord.claimedMissions,
    streakDay: retentionRecord.streakDay,
    lastStreakClaimAt: retentionRecord.lastStreakClaimAt,
    lastWheelSpinAt: retentionRecord.lastWheelSpinAt,
    wheelSpinsCount: retentionRecord.wheelSpinsCount,
  };

  const leaderboard: LeaderboardEntry[] = topUsers.map((u) => ({
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    level: u.level,
    xp: u.xp,
    casesOpened: u.totalOpened,
    totalProfit: u.totalProfit,
    balance: u.balance,
  }));

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
        <MissionsClient
          initialStats={playerStats}
          leaderboard={leaderboard}
        />
      </main>
    </div>
  );
}
