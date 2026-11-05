"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  Coins,
  Compass,
  Crown,
  Flame,
  Gift,
  Lock,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react";
import { MISSIONS_CATALOG, WHEEL_SECTORS } from "@/lib/retention-catalog";
import {
  claimDailyStreakBonusAction,
  claimMissionRewardAction,
  spinFortuneWheelAction,
} from "@/app/actions/retention";
import { useFormatPrice } from "@/lib/rarity";
import { useAppStore } from "@/lib/store";
import { soundEngine } from "@/lib/sound";
import { getLevelInfo, resolveAvatarUrl } from "@/lib/levels";

export interface MissionsPlayerStats {
  userId: string;
  username: string;
  balance: number;
  level: number;
  xp: number;
  casesOpened: number;
  upgraderWins: number;
  contractsDone: number;
  inventoryCount: number;
  hasRareDrop: boolean;
  claimedMissions: string[];
  streakDay: number;
  lastStreakClaimAt: number;
  lastWheelSpinAt: number;
  wheelSpinsCount: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar: string;
  level: number;
  xp: number;
  casesOpened: number;
  totalProfit: number;
  balance: number;
}

export default function MissionsClient({
  initialStats,
  leaderboard,
}: {
  initialStats: MissionsPlayerStats;
  leaderboard: LeaderboardEntry[];
}) {
  const router = useRouter();
  const { fp } = useFormatPrice();
  const { setBalance, setInventoryCount } = useAppStore();

  const [claimedMissions, setClaimedMissions] = useState<string[]>(
    initialStats.claimedMissions
  );
  const [streakDay, setStreakDay] = useState<number>(initialStats.streakDay);
  const [lastWheelAt, setLastWheelAt] = useState<number>(
    initialStats.lastWheelSpinAt
  );
  const [wheelCooldownSec, setWheelCooldownSec] = useState<number>(0);
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [wheelSpinning, setWheelSpinning] = useState<boolean>(false);
  const [wheelResultText, setWheelResultText] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [missionFilter, setMissionFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const updateTimer = () => {
      const diff = 90 * 1000 - (Date.now() - lastWheelAt);
      setWheelCooldownSec(diff > 0 ? Math.ceil(diff / 1000) : 0);
    };
    updateTimer();
    const id = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(id);
  }, [lastWheelAt]);

  const getMissionProgress = (missionId: string): number => {
    switch (missionId) {
      case "open_3_cases":
      case "open_15_cases":
      case "open_50_cases":
      case "open_150_cases":
        return initialStats.casesOpened;
      case "inv_5_skins":
      case "inv_20_skins":
        return initialStats.inventoryCount;
      case "upg_1_win":
      case "upg_5_wins":
        return initialStats.upgraderWins;
      case "contract_1":
        return initialStats.contractsDone;
      case "reach_lvl_10":
      case "reach_lvl_30":
        return initialStats.level;
      case "pull_gold_or_covert":
        return initialStats.hasRareDrop ? 1 : 0;
      default:
        return 0;
    }
  };

  const handleSpinWheel = (paid: boolean) => {
    if (wheelSpinning || isPending) return;
    setWheelResultText(null);
    setBannerMsg(null);

    startTransition(async () => {
      const res = await spinFortuneWheelAction(paid);
      if (!res.ok || typeof res.sectorIndex !== "number") {
        setBannerMsg(res.error || "Ошибка вращения колеса");
        return;
      }

      setWheelSpinning(true);
      soundEngine.playStartSpin();

      // 8 sectors = 45deg each. Spin 6 full turns + target sector angle
      const sectorAngle = res.sectorIndex * 45;
      const targetAngle =
        wheelRotation + 360 * 6 + (360 - sectorAngle) - (wheelRotation % 360);
      setWheelRotation(targetAngle);

      window.setTimeout(() => {
        setWheelSpinning(false);
        if (typeof res.newBalance === "number") {
          setBalance(res.newBalance);
        }
        if (typeof res.newInventoryCount === "number") {
          setInventoryCount(res.newInventoryCount);
        }
        if (typeof res.lastWheelSpinAt === "number") {
          setLastWheelAt(res.lastWheelSpinAt);
        }

        soundEngine.playWin(true);
        const msg = res.droppedSkinName
          ? `ВЫПАЛ СКИН В ИНВЕНТАРЬ: ${res.droppedSkinName}!`
          : `ВЫИГРЫШ КОЛЕСА ФОРТУНЫ: ${res.sectorLabel}!`;
        setWheelResultText(msg);
        setBannerMsg(msg);
        router.refresh();
      }, 4600);
    });
  };

  const handleClaimMission = (missionId: string) => {
    if (isPending) return;
    startTransition(async () => {
      const res = await claimMissionRewardAction(missionId);
      if (!res.ok) {
        setBannerMsg(res.error || "Ошибка получения награды");
        return;
      }
      setClaimedMissions((prev) => [...prev, missionId]);
      if (typeof res.newBalance === "number") {
        setBalance(res.newBalance);
      }
      soundEngine.playCashout();
      setBannerMsg(
        `Контракт выполнен! Начислено +${fp(res.rewardUsd || 0)} и +${
          res.rewardXp
        } XP!`
      );
      router.refresh();
    });
  };

  const handleClaimStreak = () => {
    if (isPending) return;
    startTransition(async () => {
      const res = await claimDailyStreakBonusAction();
      if (!res.ok) {
        setBannerMsg(res.error || "Стрик ещё перезаряжается");
        return;
      }
      if (typeof res.newBalance === "number") {
        setBalance(res.newBalance);
      }
      if (typeof res.nextStreakDay === "number") {
        setStreakDay(res.nextStreakDay);
      }
      soundEngine.playWin(true);
      setBannerMsg(
        `Бонус Дня #${res.claimedDay} получен: +${fp(
          res.rewardUsd || 0
        )} и +${res.rewardXp} XP!`
      );
      router.refresh();
    });
  };

  const filteredMissions = MISSIONS_CATALOG.filter(
    (m) => missionFilter === "ALL" || m.category === missionFilter
  );

  const STREAK_DAYS = [
    { day: 1, usd: 0.22, xp: 85 },
    { day: 2, usd: 0.38, xp: 170 },
    { day: 3, usd: 0.55, xp: 255 },
    { day: 4, usd: 0.85, xp: 340 },
    { day: 5, usd: 1.25, xp: 425 },
    { day: 6, usd: 1.9, xp: 510 },
    { day: 7, usd: 3.5, xp: 600 },
  ];

  return (
    <div className="mx-auto max-w-[1640px] px-4 py-8 lg:px-8">
      {/* Top Banner */}
      <div className="bg-carbon-pattern relative overflow-hidden rounded-3xl border border-[#D4FF00]/40 bg-[#111115] p-6 shadow-[0_0_50px_rgba(212,255,0,0.08)] lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#D4FF00] px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-zinc-950">
              <Trophy className="h-3.5 w-3.5" />
              <span>ЦЕНТР УДЕРЖАНИЯ • КОНТРАКТЫ НАЁМНИКА • КОЛЕСО ФОРТУНЫ</span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
              БОЕВОЙ ПРОПУСК, МИССИИ И{" "}
              <span className="text-[#D4FF00]">КОЛЕСО УДАЧИ</span>
            </h1>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
              Выполняй задания по открытию кейсов и апгрейдам, забирай ежедневный
              стрик-бонус, крути Колесо Фортуны каждые 90 секунд и соревнуйся в
              Зале Славы!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/earn"
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-xs font-black uppercase text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
            >
              Хардкор Фарм →
            </Link>
            <Link
              href="/cases"
              className="rounded-xl bg-[#D4FF00] px-5 py-3 font-mono text-xs font-black uppercase text-zinc-950 transition hover:bg-[#e3ff4d]"
            >
              Открывать кейсы →
            </Link>
          </div>
        </div>
      </div>

      {/* Notification Banner */}
      {bannerMsg && (
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#D4FF00]/50 bg-[#D4FF00]/15 px-5 py-3.5 text-xs font-black text-[#D4FF00]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{bannerMsg}</span>
          </div>
          <button
            onClick={() => setBannerMsg(null)}
            className="font-mono text-xs text-zinc-300 hover:text-white"
          >
            ОК
          </button>
        </div>
      )}

      {/* =====================================================================
          ROW 1: 7-DAY STREAK + TACTICAL WHEEL OF FORTUNE
      ===================================================================== */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* Left: 7-Day Activity Streak & Quick Stats */}
        <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-black uppercase text-[#D4FF00]">
                <Flame className="h-4 w-4" />
                <span>СТРИК АКТИВНОСТИ (7 ЭТАПОВ)</span>
              </div>
              <span className="rounded-md bg-[#D4FF00]/15 px-2.5 py-1 font-mono text-[10px] font-black text-[#D4FF00]">
                ТЕКУЩИЙ ЭТАП: ДЕНЬ #{streakDay}
              </span>
            </div>

            <h3 className="mt-2 font-display text-2xl font-black uppercase text-white">
              Забирай нарастающий бонус за активность
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Каждый этап увеличивает денежную выплату и даёт буст опыта XP для
              ранга Global Elite.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
              {STREAK_DAYS.map((sd) => {
                const isCurrent = sd.day === streakDay;
                const isPassed = sd.day < streakDay;
                return (
                  <div
                    key={sd.day}
                    className={`flex flex-col items-center justify-between rounded-2xl border p-3 text-center transition ${
                      isCurrent
                        ? "border-[#D4FF00] bg-[#191E0D] shadow-[0_0_25px_rgba(212,255,0,0.18)]"
                        : isPassed
                        ? "border-emerald-500/40 bg-emerald-500/10 opacity-75"
                        : "border-zinc-800 bg-[#09090B]"
                    }`}
                  >
                    <span className="font-mono text-[10px] font-black uppercase text-zinc-400">
                      ДЕНЬ {sd.day}
                    </span>
                    <div className="my-2 font-mono text-sm font-black text-[#D4FF00]">
                      +{fp(sd.usd)}
                    </div>
                    <span className="font-mono text-[9px] font-bold text-cyan-400">
                      +{sd.xp} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-4 gap-2.5">
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
                <div className="font-mono text-[9px] uppercase text-zinc-500">
                  ОТКРЫТО КЕЙСОВ
                </div>
                <div className="mt-0.5 font-mono text-lg font-black text-white">
                  {initialStats.casesOpened}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
                <div className="font-mono text-[9px] uppercase text-zinc-500">
                  АПГРЕЙДОВ
                </div>
                <div className="mt-0.5 font-mono text-lg font-black text-[#D4FF00]">
                  {initialStats.upgraderWins}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
                <div className="font-mono text-[9px] uppercase text-zinc-500">
                  КОНТРАКТОВ
                </div>
                <div className="mt-0.5 font-mono text-lg font-black text-cyan-400">
                  {initialStats.contractsDone}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
                <div className="font-mono text-[9px] uppercase text-zinc-500">
                  МИССИЙ СДАНО
                </div>
                <div className="mt-0.5 font-mono text-lg font-black text-emerald-400">
                  {claimedMissions.length}/{MISSIONS_CATALOG.length}
                </div>
              </div>
            </div>

            <button
              disabled={isPending}
              onClick={handleClaimStreak}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4FF00] py-4 font-display text-sm font-black uppercase tracking-wider text-zinc-950 shadow-[0_0_28px_rgba(212,255,0,0.25)] transition hover:bg-[#e3ff4d] disabled:opacity-50"
            >
              <Gift className="h-4 w-4" />
              <span>ЗАБРАТЬ БОНУС ДНЯ #{streakDay}</span>
            </button>
          </div>
        </div>

        {/* Right: Tactical Wheel of Fortune */}
        <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 font-mono text-xs font-black uppercase text-[#D4FF00]">
                <Compass className="h-4 w-4" />
                <span>ТАКТИЧЕСКОЕ КОЛЕСО ФОРТУНЫ CS2</span>
              </div>
              <h3 className="mt-1 font-display text-2xl font-black uppercase text-white">
                Бесплатный прокрут каждые 90 секунд
              </h3>
            </div>
            <span className="rounded-lg border border-zinc-700 bg-[#09090B] px-3 py-1.5 font-mono text-xs font-black text-[#D4FF00]">
              {wheelCooldownSec > 0
                ? `Перезарядка: ${wheelCooldownSec}с`
                : "БЕСПЛАТНО ДОСТУПНО!"}
            </span>
          </div>

          <div className="my-5 grid items-center gap-6 sm:grid-cols-12">
            {/* Rotating Wheel Visual */}
            <div className="relative mx-auto flex h-56 w-56 items-center justify-center sm:col-span-6">
              {/* Top Pointer */}
              <div className="absolute -top-3 left-1/2 z-30 -translate-x-1/2">
                <div className="h-5 w-4 rounded-b bg-[#D4FF00] shadow-[0_0_15px_#D4FF00]" />
              </div>

              <div
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: wheelSpinning
                    ? "transform 4.5s cubic-bezier(0.14, 0.96, 0.22, 1)"
                    : "none",
                  background:
                    "conic-gradient(#38BDF8 0deg 45deg, #A855F7 45deg 90deg, #10B981 90deg 135deg, #EC4899 135deg 180deg, #F59E0B 180deg 225deg, #06B6D4 225deg 270deg, #EF4444 270deg 315deg, #D4FF00 315deg 360deg)",
                }}
                className="relative flex h-52 w-52 items-center justify-center rounded-full border-4 border-zinc-800 p-2 shadow-[0_0_40px_rgba(0,0,0,0.9)]"
              >
                <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-2 border-zinc-700 bg-[#09090B] text-center">
                  <Sparkles className="h-5 w-5 text-[#D4FF00]" />
                  <span className="mt-1 font-display text-xs font-black uppercase text-white">
                    WHEEL
                  </span>
                  <span className="font-mono text-[9px] text-zinc-400">
                    8 СЕКТОРОВ
                  </span>
                </div>
              </div>
            </div>

            {/* Sectors Legend */}
            <div className="grid grid-cols-2 gap-2 sm:col-span-6">
              {WHEEL_SECTORS.map((sec) => (
                <div
                  key={sec.index}
                  className="flex items-center gap-2 rounded-xl border border-zinc-800/90 bg-[#09090B] px-3 py-2"
                >
                  <span
                    style={{ backgroundColor: sec.color }}
                    className="h-3 w-3 shrink-0 rounded-full"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-mono text-xs font-black text-white">
                      {sec.label}
                    </div>
                    <div className="truncate text-[10px] text-zinc-500">
                      {sec.sub}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {wheelResultText && (
            <div className="mb-3 rounded-xl border border-[#D4FF00]/50 bg-[#D4FF00]/15 px-4 py-2 text-center font-mono text-xs font-black text-[#D4FF00]">
              {wheelResultText}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <button
              disabled={wheelSpinning || wheelCooldownSec > 0 || isPending}
              onClick={() => handleSpinWheel(false)}
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#D4FF00] py-4 font-display text-xs font-black uppercase tracking-wider text-zinc-950 shadow-[0_0_25px_rgba(212,255,0,0.25)] transition hover:bg-[#e3ff4d] disabled:opacity-40"
            >
              <Zap className="h-4 w-4" />
              <span>
                {wheelSpinning
                  ? "КРУТИТСЯ..."
                  : wheelCooldownSec > 0
                  ? `БЕСПЛАТНО ЧЕРЕЗ ${wheelCooldownSec}С`
                  : "КРУТИТЬ БЕСПЛАТНО"}
              </span>
            </button>

            <button
              disabled={wheelSpinning || isPending}
              onClick={() => handleSpinWheel(true)}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#D4FF00]/50 bg-[#D4FF00]/10 py-4 font-mono text-xs font-black uppercase text-[#D4FF00] transition hover:bg-[#D4FF00] hover:text-zinc-950 disabled:opacity-40"
            >
              <Coins className="h-4 w-4" />
              <span>ДОП. ПРОКРУТ ЗА {fp(0.35)}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          ROW 2: 12 MERCENARY MISSIONS / CONTRACTS
      ===================================================================== */}
      <div className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <h2 className="font-display text-2xl font-black uppercase text-white">
              БОЕВЫЕ КОНТРАКТЫ И ЗАДАНИЯ ({MISSIONS_CATALOG.length})
            </h2>
            <p className="text-xs text-zinc-400">
              Прогресс считается автоматически по твоим открытиям кейсов,
              апгрейдам и уровню.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "ALL", label: "Все миссии" },
              { id: "GRIND", label: "Стартовый Гринд" },
              { id: "CASES", label: "Открытие кейсов" },
              { id: "UPGRADER", label: "Апгрейдер" },
              { id: "ELITE", label: "Элитные" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMissionFilter(tab.id)}
                className={`rounded-xl px-3.5 py-2 font-mono text-xs font-black uppercase transition ${
                  missionFilter === tab.id
                    ? "bg-[#D4FF00] text-zinc-950"
                    : "border border-zinc-800 bg-[#111115] text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMissions.map((m) => {
            const currentVal = getMissionProgress(m.id);
            const pct = Math.min(100, Math.round((currentVal / m.target) * 100));
            const isCompleted = currentVal >= m.target;
            const isClaimed = claimedMissions.includes(m.id);

            return (
              <div
                key={m.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition ${
                  isClaimed
                    ? "border-emerald-500/30 bg-[#0D1310] opacity-80"
                    : isCompleted
                    ? "border-[#D4FF00] bg-[#14180D] shadow-[0_0_25px_rgba(212,255,0,0.12)]"
                    : "border-zinc-800 bg-[#111115]"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] font-black uppercase text-[#D4FF00]">
                      {m.category}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-xs font-black">
                      <span className="text-emerald-400">
                        +{fp(m.rewardUsd)}
                      </span>
                      <span className="text-cyan-400">+{m.rewardXp} XP</span>
                    </div>
                  </div>

                  <h3 className="mt-3 font-display text-lg font-black uppercase text-white">
                    {m.title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-400">{m.desc}</p>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="text-zinc-400">Прогресс:</span>
                      <span className="font-black text-white">
                        {Math.min(currentVal, m.target)} / {m.target} ({pct}%)
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isClaimed
                            ? "bg-emerald-400"
                            : "bg-[#D4FF00]"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  {isClaimed ? (
                    <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 font-mono text-xs font-black uppercase text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Награда получена</span>
                    </div>
                  ) : isCompleted ? (
                    <button
                      disabled={isPending}
                      onClick={() => handleClaimMission(m.id)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#D4FF00] py-2.5 font-mono text-xs font-black uppercase text-zinc-950 shadow-[0_0_20px_rgba(212,255,0,0.3)] transition hover:bg-[#e3ff4d]"
                    >
                      <Gift className="h-4 w-4" />
                      <span>
                        Забрать +{fp(m.rewardUsd)} и +{m.rewardXp} XP
                      </span>
                    </button>
                  ) : (
                    <div className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-[#09090B] py-2.5 font-mono text-xs font-bold uppercase text-zinc-500">
                      <Lock className="h-3.5 w-3.5" />
                      <span>В процессе выполнения</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =====================================================================
          ROW 3: SERVER HALL OF FAME / LEADERBOARD
      ===================================================================== */}
      <div className="mt-12 rounded-3xl border border-zinc-800 bg-[#111115] p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-[#D4FF00]" />
            <div>
              <h2 className="font-display text-2xl font-black uppercase text-white">
                ЗАЛ СЛАВЫ • РЕЙТИНГ ИГРОКОВ СЕРВЕРА
              </h2>
              <p className="text-xs text-zinc-400">
                Живой топ аккаунтов по уровню престижа, открытым кейсам и
                капиталу
              </p>
            </div>
          </div>
          <Award className="h-6 w-6 text-[#D4FF00]" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {leaderboard.map((u, idx) => {
            const lvl = getLevelInfo(u.xp);
            return (
              <div
                key={u.id}
                className={`flex items-center justify-between rounded-2xl border p-4 ${
                  idx === 0
                    ? "border-[#D4FF00] bg-[#161A0E]"
                    : "border-zinc-800 bg-[#09090B]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-black ${
                      idx === 0
                        ? "bg-[#D4FF00] text-zinc-950"
                        : idx === 1
                        ? "bg-zinc-300 text-zinc-950"
                        : idx === 2
                        ? "bg-amber-600 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    #{idx + 1}
                  </div>
                  <img
                    src={resolveAvatarUrl(u.avatar)}
                    alt={u.username}
                    className="h-11 w-11 rounded-xl border border-zinc-700 object-cover"
                  />
                  <div>
                    <div className="font-display text-base font-black text-white">
                      {u.username}
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-400">
                      <span
                        style={{ color: lvl.rank.color }}
                        className="font-black"
                      >
                        LVL {lvl.level} ({lvl.rank.ruTitle})
                      </span>
                      <span>•</span>
                      <span>{u.casesOpened} кейсов</span>
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs font-black text-[#D4FF00]">
                    {fp(u.balance)}
                  </div>
                  <div className="text-[10px] text-zinc-500">Баланс</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
