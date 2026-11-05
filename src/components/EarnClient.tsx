"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bomb,
  Check,
  Coins,
  Crosshair,
  Flame,
  Hammer,
  Play,
  Scissors,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { useFormatPrice } from "@/lib/rarity";
import { useAppStore } from "@/lib/store";
import { soundEngine } from "@/lib/sound";
import {
  cashoutMiniGameWinAction,
  claimEarnedMoneyAction,
  placeMiniGameBetAction,
} from "@/app/actions/games";

interface AimTarget {
  id: number;
  x: number; // % 10..88
  y: number; // % 14..84
  type: "normal" | "gold" | "drone";
  rewardUsd: number;
  size: number;
}

export default function EarnClient({
  initialBalance,
}: {
  initialBalance: number;
}) {
  const router = useRouter();
  const { balance: storeBalance, setBalance } = useAppStore();
  const { fp } = useFormatPrice();

  const currentBalance =
    storeBalance !== null ? storeBalance : initialBalance;

  const [activeGame, setActiveGame] = useState<
    "aim" | "clicker" | "mines" | "defuse"
  >("aim");
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // =========================================================================
  // GAME 1: CYBER AIM TRAINER (HARDCORE SKILL GRIND)
  // =========================================================================
  const [aimRunning, setAimRunning] = useState(false);
  const [aimTimeLeft, setAimTimeLeft] = useState(20);
  const [aimBankUsd, setAimBankUsd] = useState(0);
  const [aimHits, setAimHits] = useState(0);
  const [aimMisses, setAimMisses] = useState(0);
  const [aimStreak, setAimStreak] = useState(0);
  const [aimTargets, setAimTargets] = useState<AimTarget[]>([]);
  const nextTargetIdRef = useRef(1);

  const spawnRandomAimTarget = (): AimTarget => {
    const r = Math.random();
    const type: AimTarget["type"] =
      r > 0.9 ? "drone" : r > 0.68 ? "gold" : "normal";
    // Hardcore grind rewards: $0.04 normal, $0.10 gold, $0.24 drone
    const rewardUsd = type === "drone" ? 0.24 : type === "gold" ? 0.1 : 0.04;
    const size = type === "drone" ? 42 : type === "gold" ? 46 : 52;

    return {
      id: nextTargetIdRef.current++,
      x: Math.floor(10 + Math.random() * 78),
      y: Math.floor(14 + Math.random() * 70),
      type,
      rewardUsd,
      size,
    };
  };

  const startAimSession = () => {
    setAimRunning(true);
    setAimTimeLeft(20);
    setAimHits(0);
    setAimMisses(0);
    setAimStreak(0);
    setAimTargets([
      spawnRandomAimTarget(),
      spawnRandomAimTarget(),
      spawnRandomAimTarget(),
    ]);
    soundEngine.playStartSpin();
  };

  useEffect(() => {
    if (!aimRunning) return;
    const timer = window.setInterval(() => {
      setAimTimeLeft((prev) => {
        if (prev <= 1) {
          setAimRunning(false);
          soundEngine.playWin(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [aimRunning]);

  const handleHitTarget = (target: AimTarget, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStreak = aimStreak + 1;
    const streakMult = Math.min(2.0, 1 + Math.floor(nextStreak / 6) * 0.2);
    const earned = Number((target.rewardUsd * streakMult).toFixed(2));

    soundEngine.playLockIn(0);
    setAimHits((h) => h + 1);
    setAimStreak(nextStreak);
    setAimBankUsd((b) => Number((b + earned).toFixed(2)));

    setAimTargets((prev) => [
      ...prev.filter((t) => t.id !== target.id),
      spawnRandomAimTarget(),
    ]);
  };

  const handleMissArena = () => {
    if (!aimRunning) return;
    setAimStreak(0);
    setAimMisses((m) => m + 1);
    setAimBankUsd((b) => Number(Math.max(0, b - 0.02).toFixed(2)));
  };

  const handleClaimAimBank = () => {
    if (aimBankUsd < 0.05 || isPending) return;
    const amountToClaim = aimBankUsd;
    setAimRunning(false);

    startTransition(async () => {
      const res = await claimEarnedMoneyAction({
        amountUsd: amountToClaim,
        sourceName: "Кибер-Тир CS2",
        xpEarned: Math.max(10, aimHits * 3),
      });
      if (res.ok && typeof res.newBalance === "number") {
        setBalance(res.newBalance);
        setAimBankUsd(0);
        setAimHits(0);
        setAimStreak(0);
        soundEngine.playCashout();
        setBannerMsg(
          `Заработано в Кибер-Тире и зачислено на баланс: +${fp(
            amountToClaim
          )}!`
        );
        router.refresh();
      }
    });
  };

  // =========================================================================
  // GAME 2: HARDCORE ARMORY CLICKER & PASSIVE INCOME VAULT
  // =========================================================================
  const [vaultUsd, setVaultUsd] = useState<number>(0);
  const [clickPowerUsd, setClickPowerUsd] = useState<number>(0.02);
  const [passivePerSecUsd, setPassivePerSecUsd] = useState<number>(0);
  const [totalClicks, setTotalClicks] = useState<number>(0);
  const [upgLevels, setUpgLevels] = useState<Record<string, number>>({});
  const [clickPulse, setClickPulse] = useState(false);

  // Load saved grind state from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("azurecaser_hardcore_grind_v2");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.vaultUsd === "number") setVaultUsd(parsed.vaultUsd);
        if (typeof parsed.clickPowerUsd === "number")
          setClickPowerUsd(parsed.clickPowerUsd);
        if (typeof parsed.passivePerSecUsd === "number")
          setPassivePerSecUsd(parsed.passivePerSecUsd);
        if (typeof parsed.totalClicks === "number")
          setTotalClicks(parsed.totalClicks);
        if (parsed.upgLevels) setUpgLevels(parsed.upgLevels);
      }
    } catch {}
  }, []);

  // Save grind state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "azurecaser_hardcore_grind_v2",
        JSON.stringify({
          vaultUsd,
          clickPowerUsd,
          passivePerSecUsd,
          totalClicks,
          upgLevels,
        })
      );
    } catch {}
  }, [vaultUsd, clickPowerUsd, passivePerSecUsd, totalClicks, upgLevels]);

  // Passive income ticker every 1 second (capped at $15 vault buffer so you can't AFK millions)
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (passivePerSecUsd > 0) {
        setVaultUsd((v) =>
          v >= 25 ? v : Number(Math.min(25, v + passivePerSecUsd).toFixed(2))
        );
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [passivePerSecUsd]);

  const handleForgeClick = () => {
    const isCrit = Math.random() < 0.1;
    const gain = Number((clickPowerUsd * (isCrit ? 2.5 : 1)).toFixed(2));
    setVaultUsd((v) => Number((v + gain).toFixed(2)));
    setTotalClicks((c) => c + 1);
    setClickPulse(true);
    soundEngine.playTick(isCrit ? 0.9 : 0.4);
    setTimeout(() => setClickPulse(false), 110);
  };

  const handleWithdrawVault = () => {
    if (vaultUsd < 0.2 || isPending) return;
    const amountToClaim = vaultUsd;
    startTransition(async () => {
      const res = await claimEarnedMoneyAction({
        amountUsd: amountToClaim,
        sourceName: "Оружейный Цех",
        xpEarned: Math.max(10, Math.floor(amountToClaim * 8)),
      });
      if (res.ok && typeof res.newBalance === "number") {
        setBalance(res.newBalance);
        setVaultUsd(0);
        soundEngine.playCashout();
        setBannerMsg(
          `Выведено из сейфа Оружейного Цеха на твой счёт: +${fp(
            amountToClaim
          )}!`
        );
        router.refresh();
      }
    });
  };

  const handleResetGrindProgress = () => {
    setVaultUsd(0);
    setClickPowerUsd(0.02);
    setPassivePerSecUsd(0);
    setTotalClicks(0);
    setUpgLevels({});
    localStorage.removeItem("azurecaser_hardcore_grind_v2");
    setBannerMsg("Прогресс Оружейного Цеха сброшен до стартового ($0.02 / клик).");
  };

  const buyWorkshopUpgrade = (
    id: string,
    baseCostUsd: number,
    addClick: number,
    addPassive: number
  ) => {
    const lvl = upgLevels[id] || 0;
    const actualCost = Number((baseCostUsd * Math.pow(1.65, lvl)).toFixed(2));
    if (vaultUsd >= actualCost) {
      setVaultUsd((v) => Number((v - actualCost).toFixed(2)));
      setClickPowerUsd((c) => Number((c + addClick).toFixed(2)));
      setPassivePerSecUsd((p) => Number((p + addPassive).toFixed(2)));
      setUpgLevels((prev) => ({ ...prev, [id]: lvl + 1 }));
      soundEngine.playCashout();
    }
  };

  // =========================================================================
  // GAME 3: TACTICAL C4 MINES (5x5 MULTIPLIER)
  // =========================================================================
  const [minesBetUsd, setMinesBetUsd] = useState<number>(0.5);
  const [minesCount, setMinesCount] = useState<number>(3);
  const [minesPhase, setMinesPhase] = useState<
    "idle" | "playing" | "won" | "boom"
  >("idle");
  const [bombPositions, setBombPositions] = useState<number[]>([]);
  const [revealedCells, setRevealedCells] = useState<number[]>([]);

  const calculateMinesMultiplier = (opened: number, bombs: number): number => {
    if (opened <= 0) return 1.0;
    let mult = 0.94;
    for (let i = 0; i < opened; i++) {
      mult *= (25 - i) / (25 - bombs - i);
    }
    return Number(Math.max(1.04, mult).toFixed(2));
  };

  const currentMinesMult =
    minesPhase === "playing" || minesPhase === "won"
      ? calculateMinesMultiplier(revealedCells.length, minesCount)
      : 1.0;
  const nextTileMult = calculateMinesMultiplier(
    revealedCells.length + 1,
    minesCount
  );
  const currentMinesWinUsd = Number(
    (minesBetUsd * currentMinesMult).toFixed(2)
  );

  const handleStartMines = () => {
    if (minesPhase === "playing" || isPending) return;
    setBannerMsg(null);

    startTransition(async () => {
      const res = await placeMiniGameBetAction(minesBetUsd);
      if (!res.ok) {
        setBannerMsg(res.error || "Недостаточно средств");
        return;
      }
      if (typeof res.newBalance === "number") {
        setBalance(res.newBalance);
      }

      // Generate random bomb positions (0..24)
      const bombs: number[] = [];
      while (bombs.length < minesCount) {
        const idx = Math.floor(Math.random() * 25);
        if (!bombs.includes(idx)) bombs.push(idx);
      }

      setBombPositions(bombs);
      setRevealedCells([]);
      setMinesPhase("playing");
      soundEngine.playStartSpin();
    });
  };

  const handleClickMineCell = (idx: number) => {
    if (minesPhase !== "playing" || revealedCells.includes(idx)) return;

    if (bombPositions.includes(idx)) {
      // Hit a C4 bomb!
      setRevealedCells((prev) => [...prev, idx]);
      setMinesPhase("boom");
      soundEngine.playUpgradeFail();
      return;
    }

    const nextRevealed = [...revealedCells, idx];
    setRevealedCells(nextRevealed);
    soundEngine.playLockIn(0);

    // If all safe cells opened, auto cashout!
    if (nextRevealed.length >= 25 - minesCount) {
      const maxMult = calculateMinesMultiplier(nextRevealed.length, minesCount);
      const maxWin = Number((minesBetUsd * maxMult).toFixed(2));
      handleCashoutMines(maxWin);
    }
  };

  const handleCashoutMines = (overrideWinUsd?: number) => {
    if (minesPhase !== "playing" || revealedCells.length === 0 || isPending) {
      return;
    }
    const winAmount = overrideWinUsd ?? currentMinesWinUsd;
    setMinesPhase("won");

    startTransition(async () => {
      const res = await cashoutMiniGameWinAction({
        winUsd: winAmount,
        betUsd: minesBetUsd,
      });
      if (res.ok && typeof res.newBalance === "number") {
        setBalance(res.newBalance);
        soundEngine.playWin(true);
        setBannerMsg(
          `Ты забрал выигрыш в Сапёре C4: +${fp(
            winAmount
          )} (x${currentMinesMult})!`
        );
        router.refresh();
      }
    });
  };

  // =========================================================================
  // GAME 4: C4 WIRE DEFUSE (HARDCORE 1-IN-4 WIRE CUTTER WITH COOLDOWN)
  // =========================================================================
  const [wireStakeUsd, setWireStakeUsd] = useState<number>(0); // 0 = Free Defuse for $0.45 reward
  const [wireCooldownSec, setWireCooldownSec] = useState<number>(0);
  const [wireResult, setWireResult] = useState<{
    chosenWire: number;
    winningWires: number[];
    wonUsd: number;
    isSuccess: boolean;
  } | null>(null);

  useEffect(() => {
    if (wireCooldownSec <= 0) return;
    const t = window.setInterval(() => {
      setWireCooldownSec((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [wireCooldownSec]);

  const WIRES = [
    { id: 0, name: "КРАСНЫЙ ПРОВОД", color: "#F43F5E" },
    { id: 1, name: "КИСЛОТНЫЙ ВОЛЬТ", color: "#D4FF00" },
    { id: 2, name: "СИНИЙ КРИО", color: "#38BDF8" },
    { id: 3, name: "ЗОЛОТАЯ ФАЗА", color: "#FACC15" },
  ];

  const handleCutWire = (wireId: number) => {
    if (isPending || (wireStakeUsd === 0 && wireCooldownSec > 0)) return;
    setBannerMsg(null);

    startTransition(async () => {
      if (wireStakeUsd > 0) {
        const betRes = await placeMiniGameBetAction(wireStakeUsd);
        if (!betRes.ok) {
          setBannerMsg(betRes.error || "Недостаточно средств");
          return;
        }
        if (typeof betRes.newBalance === "number") {
          setBalance(betRes.newBalance);
        }
      } else {
        setWireCooldownSec(10);
      }

      // Hardcore: only 1 out of 4 wires is safe (25% chance)
      const safeWire = Math.floor(Math.random() * 4);
      const safeWires = [safeWire];

      const isSuccess = safeWires.includes(wireId);
      const rewardUsd =
        wireStakeUsd > 0
          ? Number((wireStakeUsd * 3.25).toFixed(2))
          : 0.45; // Free hardcore defuse gives $0.45 (~18.5 ₴)

      if (isSuccess) {
        const claimRes = await claimEarnedMoneyAction({
          amountUsd: rewardUsd,
          sourceName: "Разминирование C4",
          xpEarned: 25,
        });
        if (claimRes.ok && typeof claimRes.newBalance === "number") {
          setBalance(claimRes.newBalance);
        }
        soundEngine.playWin(true);
        setBannerMsg(
          `Бомба C4 успешно обезврежена (шанс 25%)! Твоя награда: +${fp(
            rewardUsd
          )} зачислена на баланс!`
        );
      } else {
        soundEngine.playUpgradeFail();
      }

      setWireResult({
        chosenWire: wireId,
        winningWires: safeWires,
        wonUsd: isSuccess ? rewardUsd : 0,
        isSuccess,
      });
    });
  };

  return (
    <div className="mx-auto max-w-[1640px] px-4 py-8 lg:px-8">
      {/* Header Banner */}
      <div className="bg-carbon-pattern flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-zinc-800 bg-[#111115] p-6 lg:p-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-rose-400">
            <Flame className="h-3.5 w-3.5" />
            <span>ХАРДКОР ГРИНД СИМУЛЯТОР • КАЖДАЯ КОПЕЙКА ДОБЫВАЕТСЯ ПОТОМ</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
            ПОДПОЛЬНЫЙ ФАРМ И ПРОКАЧКА С НУЛЯ
          </h1>
          <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
            Никакой лёгкой халявы: начинай с {fp(0.02)} за клик и мишеней по{" "}
            {fp(0.04)}, прокачивай станки в Оружейном Цехе и открывай первые
            бомж-кейсы!
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-[#09090B] px-5 py-3.5">
          <div>
            <div className="font-mono text-[10px] uppercase text-zinc-500">
              ДОСТУПНЫЙ БАЛАНС
            </div>
            <div className="font-mono text-2xl font-black text-[#D4FF00]">
              {fp(currentBalance)}
            </div>
          </div>
          <Link
            href="/cases"
            className="rounded-xl bg-[#D4FF00] px-4 py-2.5 font-mono text-xs font-black uppercase text-zinc-950 transition hover:bg-[#e3ff4d]"
          >
            В кейсы →
          </Link>
        </div>
      </div>

      {/* Reward Notification Banner */}
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

      {/* Game Selector Tabs */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {[
          {
            id: "aim",
            title: "1. Кибер-Тир CS2",
            sub: "Реакция • Штраф за промах",
            badge: `${fp(0.04)}–${fp(0.24)} / ЦЕЛЬ`,
            icon: Crosshair,
          },
          {
            id: "clicker",
            title: "2. Оружейный Цех",
            sub: "Хардкор Кликер + Апгрейды",
            badge: `СЕЙФ: ${fp(vaultUsd)}`,
            icon: Hammer,
          },
          {
            id: "mines",
            title: "3. Сапёр C4 (5×5)",
            sub: "Ставки от $0.25 до $50",
            badge: "РИСК НА СВОЙ БАЛАНС",
            icon: Bomb,
          },
          {
            id: "defuse",
            title: "4. Провода C4",
            sub: "1 из 4 проводов (шанс 25%)",
            badge: wireCooldownSec > 0 ? `КД ${wireCooldownSec}С` : `+${fp(0.45)} ИЛИ x3.25`,
            icon: Scissors,
          },
        ].map((g) => {
          const Icon = g.icon;
          const active = activeGame === g.id;
          return (
            <button
              key={g.id}
              onClick={() =>
                setActiveGame(g.id as "aim" | "clicker" | "mines" | "defuse")
              }
              className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-[#D4FF00] bg-[#15180E] shadow-[0_0_25px_rgba(212,255,0,0.12)]"
                  : "border-zinc-800 bg-[#111115] hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon
                  className={`h-5 w-5 ${
                    active ? "text-[#D4FF00]" : "text-zinc-400"
                  }`}
                />
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[9px] font-black uppercase ${
                    active
                      ? "bg-[#D4FF00] text-zinc-950"
                      : "bg-zinc-800 text-[#D4FF00]"
                  }`}
                >
                  {g.badge}
                </span>
              </div>
              <div className="mt-3">
                <div className="font-display text-base font-black uppercase text-white">
                  {g.title}
                </div>
                <div className="text-[11px] text-zinc-400">{g.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          GAME 1: CYBER AIM TRAINER (HARDCORE)
      ===================================================================== */}
      {activeGame === "aim" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Left Arena */}
          <div className="rounded-3xl border border-zinc-800 bg-[#0B0B0F] p-5 lg:col-span-8">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-zinc-900 px-3 py-1.5 font-mono text-xs font-black text-white">
                  Таймер: <strong className="text-[#D4FF00]">{aimTimeLeft}с</strong>
                </span>
                <span className="rounded-lg bg-zinc-900 px-3 py-1.5 font-mono text-xs font-bold text-zinc-300">
                  Попаданий: <strong className="text-white">{aimHits}</strong>
                </span>
                <span className="rounded-lg bg-rose-500/15 px-3 py-1.5 font-mono text-xs font-bold text-rose-300">
                  Промахов: <strong>{aimMisses}</strong>
                </span>
                <span className="rounded-lg bg-[#D4FF00]/15 px-3 py-1.5 font-mono text-xs font-black text-[#D4FF00]">
                  Стрик: x{Math.min(2.0, 1 + Math.floor(aimStreak / 6) * 0.2).toFixed(2)}
                </span>
              </div>

              <button
                onClick={startAimSession}
                className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2 font-mono text-xs font-black uppercase text-[#D4FF00] transition hover:bg-[#D4FF00] hover:text-zinc-950"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{aimRunning ? "Перезапустить" : "Начать раунд (20с)"}</span>
              </button>
            </div>

            {/* Interactive Shooting Canvas */}
            <div
              onClick={handleMissArena}
              className="relative h-[400px] w-full cursor-crosshair select-none overflow-hidden rounded-2xl border border-zinc-800 bg-[radial-gradient(circle_at_center,#14181F_0%,#07070A_100%)]"
            >
              {/* Crosshair Grid Lines */}
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-[1px] bg-zinc-800/60" />
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-[1px] bg-zinc-800/60" />

              {!aimRunning ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <Crosshair className="h-12 w-12 text-[#D4FF00]" />
                  <h3 className="mt-3 font-display text-2xl font-black uppercase text-white">
                    ХАРДКОР-ТИР: ТОЧНОСТЬ РЕШАЕТ ВСЁ
                  </h3>
                  <p className="mt-1 max-w-md text-xs text-zinc-400">
                    Сбивай мишени за 20 секунд. За каждое попадание начисляется{" "}
                    {fp(0.04)}–{fp(0.24)}. Промах мимо цели сбрасывает стрик и
                    штрафует банк раунда на −{fp(0.02)}!
                  </p>
                  <button
                    onClick={startAimSession}
                    className="mt-5 rounded-2xl bg-[#D4FF00] px-8 py-4 font-display text-sm font-black uppercase tracking-wider text-zinc-950 shadow-[0_0_30px_rgba(212,255,0,0.3)] transition hover:scale-105"
                  >
                    ЗАПУСТИТЬ ТИР (20 СЕК)
                  </button>
                </div>
              ) : (
                aimTargets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseDown={(e) => handleHitTarget(t, e)}
                    style={{
                      left: `${t.x}%`,
                      top: `${t.y}%`,
                      width: `${t.size}px`,
                      height: `${t.size}px`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center rounded-full border-2 font-mono text-[9px] font-black shadow-xl transition-transform active:scale-75 ${
                      t.type === "drone"
                        ? "border-cyan-400 bg-cyan-500/25 text-cyan-300 shadow-[0_0_25px_rgba(0,240,255,0.4)]"
                        : t.type === "gold"
                        ? "border-[#D4FF00] bg-[#D4FF00]/30 text-[#D4FF00] shadow-[0_0_25px_rgba(212,255,0,0.45)]"
                        : "border-rose-500 bg-rose-500/25 text-white shadow-[0_0_20px_rgba(244,63,94,0.35)]"
                    }`}
                  >
                    <span>+{fp(t.rewardUsd)}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Cashout & Stats Panel */}
          <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-4">
            <div>
              <div className="font-mono text-xs font-black uppercase text-[#D4FF00]">
                НАКОПЛЕННЫЙ БАНК ТИРА
              </div>
              <div className="mt-2 rounded-2xl border border-[#D4FF00]/40 bg-[#09090B] p-5">
                <div className="font-mono text-[11px] uppercase text-zinc-400">
                  Готово к выводу на баланс (мин. {fp(0.05)}):
                </div>
                <div className="mt-1 font-mono text-4xl font-black text-[#D4FF00]">
                  {fp(aimBankUsd)}
                </div>
              </div>

              <div className="mt-4 space-y-2 text-xs text-zinc-400">
                <div className="flex justify-between rounded-xl bg-[#09090B] px-3.5 py-2.5">
                  <span>Обычная мишень:</span>
                  <strong className="font-mono text-white">+{fp(0.04)}</strong>
                </div>
                <div className="flex justify-between rounded-xl bg-[#09090B] px-3.5 py-2.5">
                  <span>Золотая мишень (Headshot):</span>
                  <strong className="font-mono text-[#D4FF00]">+{fp(0.1)}</strong>
                </div>
                <div className="flex justify-between rounded-xl bg-[#09090B] px-3.5 py-2.5">
                  <span>Скоростной Кибер-Дрон:</span>
                  <strong className="font-mono text-cyan-400">+{fp(0.24)}</strong>
                </div>
                <div className="flex justify-between rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-2 text-rose-300">
                  <span>Штраф за промах:</span>
                  <strong className="font-mono">−{fp(0.02)}</strong>
                </div>
              </div>
            </div>

            <button
              disabled={aimBankUsd < 0.05 || isPending}
              onClick={handleClaimAimBank}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4FF00] py-4 font-display text-base font-black uppercase tracking-wider text-zinc-950 shadow-[0_0_30px_rgba(212,255,0,0.25)] transition hover:bg-[#e3ff4d] disabled:opacity-40"
            >
              <Coins className="h-5 w-5" />
              <span>ЗАБРАТЬ ДЕНЬГИ ({fp(aimBankUsd)})</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          GAME 2: HARDCORE ARMORY CLICKER & PASSIVE VAULT
      ===================================================================== */}
      {activeGame === "clicker" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Left Interactive Forge Button */}
          <div className="flex flex-col items-center justify-between rounded-3xl border border-zinc-800 bg-[#111115] p-6 text-center lg:col-span-5">
            <div>
              <span className="rounded-md bg-[#D4FF00]/15 px-3 py-1 font-mono text-[10px] font-black uppercase text-[#D4FF00]">
                ПОДПОЛЬНЫЙ ЦЕХ • ХАРДКОР ПРОКАЧКА С $0.02
              </span>
              <h3 className="mt-2 font-display text-2xl font-black uppercase text-white">
                Кликай по станку и прокачивай оборудования
              </h3>
            </div>

            <button
              type="button"
              onClick={handleForgeClick}
              className={`my-6 flex h-56 w-56 flex-col items-center justify-center rounded-full border-4 border-[#D4FF00] bg-[radial-gradient(circle_at_center,#283309_0%,#09090B_75%)] shadow-[0_0_50px_rgba(212,255,0,0.25)] transition-transform select-none ${
                clickPulse ? "scale-95" : "hover:scale-105"
              }`}
            >
              <Hammer className="h-12 w-12 text-[#D4FF00]" />
              <span className="mt-2 font-display text-2xl font-black uppercase text-white">
                +{fp(clickPowerUsd)}
              </span>
              <span className="font-mono text-[10px] text-zinc-400">
                за клик (10% крит x2.5)
              </span>
            </button>

            <div className="grid w-full grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
                <div className="font-mono text-[10px] text-zinc-500">
                  ДОХОД ЗА КЛИК
                </div>
                <div className="font-mono text-sm font-black text-white">
                  +{fp(clickPowerUsd)}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
                <div className="font-mono text-[10px] text-zinc-500">
                  ПАССИВНО В СЕК
                </div>
                <div className="font-mono text-sm font-black text-[#D4FF00]">
                  +{fp(passivePerSecUsd)}/с
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-3">
                <div className="font-mono text-[10px] text-zinc-500">
                  ВСЕГО КЛИКОВ
                </div>
                <div className="font-mono text-sm font-black text-white">
                  {totalClicks}
                </div>
              </div>
            </div>
          </div>

          {/* Right Vault Cashout & Workshop Upgrades */}
          <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-7">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4FF00]/40 bg-[#09090B] p-5">
                <div>
                  <div className="font-mono text-xs font-bold uppercase text-zinc-400">
                    В СЕЙФЕ ЦЕХА (ЛИМИТ СЕЙФА {fp(25)}):
                  </div>
                  <div className="mt-1 font-mono text-3xl font-black text-[#D4FF00]">
                    {fp(vaultUsd)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={vaultUsd < 0.2 || isPending}
                    onClick={handleWithdrawVault}
                    className="rounded-xl bg-[#D4FF00] px-5 py-3.5 font-display text-xs font-black uppercase text-zinc-950 shadow-[0_0_25px_rgba(212,255,0,0.25)] transition hover:bg-[#e3ff4d] disabled:opacity-40"
                  >
                    Забрать на баланс (от {fp(0.2)})
                  </button>
                  <button
                    type="button"
                    onClick={handleResetGrindProgress}
                    title="Сбросить прогресс цеха с нуля"
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-3.5 font-mono text-[10px] font-bold uppercase text-rose-300 hover:bg-rose-500/20"
                  >
                    Сброс
                  </button>
                </div>
              </div>

              <div className="mt-5 font-mono text-xs font-black uppercase text-white">
                Дерево прокачки станка (цена растёт с каждым уровнем):
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {[
                  {
                    id: "file",
                    name: "1. Ржавый Напильник",
                    desc: `+${fp(0.02)} к клику`,
                    baseCost: 0.4,
                    addClick: 0.02,
                    addPassive: 0,
                  },
                  {
                    id: "vise",
                    name: "2. Слесарные Тиски",
                    desc: `+${fp(0.03)} к клику • +${fp(0.02)}/сек`,
                    baseCost: 1.8,
                    addClick: 0.03,
                    addPassive: 0.02,
                  },
                  {
                    id: "laser",
                    name: "3. Гравировщик Float",
                    desc: `+${fp(0.08)} к клику • +${fp(0.05)}/сек`,
                    baseCost: 6.5,
                    addClick: 0.08,
                    addPassive: 0.05,
                  },
                  {
                    id: "cnc",
                    name: "4. ЧПУ-Станок Закалки",
                    desc: `+${fp(0.22)} к клику • +${fp(0.15)}/сек`,
                    baseCost: 22.0,
                    addClick: 0.22,
                    addPassive: 0.15,
                  },
                ].map((upg) => {
                  const lvl = upgLevels[upg.id] || 0;
                  const cost = Number(
                    (upg.baseCost * Math.pow(1.65, lvl)).toFixed(2)
                  );
                  return (
                    <div
                      key={upg.id}
                      className="flex flex-col justify-between rounded-xl border border-zinc-800 bg-[#09090B] p-3.5"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white">
                            {upg.name}
                          </span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#D4FF00]">
                            УР. {lvl}
                          </span>
                        </div>
                        <div className="mt-1 font-mono text-[11px] text-zinc-400">
                          {upg.desc}
                        </div>
                      </div>
                      <button
                        disabled={vaultUsd < cost}
                        onClick={() =>
                          buyWorkshopUpgrade(
                            upg.id,
                            upg.baseCost,
                            upg.addClick,
                            upg.addPassive
                          )
                        }
                        className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 font-mono text-xs font-black text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00] disabled:opacity-40"
                      >
                        Улучшить за {fp(cost)}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          GAME 3: TACTICAL C4 MINES (5x5)
      ===================================================================== */}
      {activeGame === "mines" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Left Controls & Cashout Button */}
          <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-5">
            <div className="space-y-4">
              <div>
                <div className="font-mono text-xs font-black uppercase text-[#D4FF00]">
                  САПЁР C4 (ТАКТИЧЕСКОЕ ПОЛЕ 5×5)
                </div>
                <h3 className="mt-1 font-display text-2xl font-black uppercase text-white">
                  Рискни своим балансом и забирай куш вовремя
                </h3>
              </div>

              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Ставка на раунд (макс. {fp(50)}):
                </label>
                <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                  {[0.25, 0.5, 1.5, 5, 15].map((b) => (
                    <button
                      key={b}
                      disabled={minesPhase === "playing"}
                      onClick={() => setMinesBetUsd(b)}
                      className={`rounded-xl border py-2 font-mono text-xs font-black transition ${
                        minesBetUsd === b
                          ? "border-[#D4FF00] bg-[#D4FF00] text-zinc-950"
                          : "border-zinc-800 bg-[#09090B] text-zinc-300"
                      }`}
                    >
                      {fp(b)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Количество бомб C4 на поле:
                </label>
                <div className="mt-1.5 grid grid-cols-5 gap-1.5">
                  {[3, 5, 8, 12, 18].map((cnt) => (
                    <button
                      key={cnt}
                      disabled={minesPhase === "playing"}
                      onClick={() => setMinesCount(cnt)}
                      className={`rounded-xl border py-2 font-mono text-xs font-black transition ${
                        minesCount === cnt
                          ? "border-rose-500 bg-rose-500/20 text-rose-300"
                          : "border-zinc-800 bg-[#09090B] text-zinc-400"
                      }`}
                    >
                      {cnt} 💣
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-[#09090B] p-4">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-zinc-400">Текущий множитель:</span>
                  <span className="text-lg font-black text-[#D4FF00]">
                    x{currentMinesMult}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between font-mono text-xs">
                  <span className="text-zinc-500">Следующая ячейка даст:</span>
                  <span className="font-bold text-emerald-400">
                    x{nextTileMult} ({fp(minesBetUsd * nextTileMult)})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              {minesPhase === "playing" ? (
                <button
                  disabled={revealedCells.length === 0 || isPending}
                  onClick={() => handleCashoutMines()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4FF00] py-4 font-display text-base font-black uppercase text-zinc-950 shadow-[0_0_30px_rgba(212,255,0,0.35)] transition hover:bg-[#e3ff4d] disabled:opacity-40"
                >
                  <Coins className="h-5 w-5" />
                  <span>
                    ЗАБРАТЬ ДЕНЬГИ: {fp(currentMinesWinUsd)} (x
                    {currentMinesMult})
                  </span>
                </button>
              ) : (
                <button
                  disabled={isPending}
                  onClick={handleStartMines}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D4FF00] py-4 font-display text-base font-black uppercase text-zinc-950 transition hover:bg-[#e3ff4d]"
                >
                  <Play className="h-5 w-5" />
                  <span>Начать игру ({fp(minesBetUsd)})</span>
                </button>
              )}
            </div>
          </div>

          {/* Right 5x5 Mines Grid */}
          <div className="flex items-center justify-center rounded-3xl border border-zinc-800 bg-[#0B0B0F] p-6 lg:col-span-7">
            <div className="grid w-full max-w-[420px] grid-cols-5 gap-2.5">
              {Array.from({ length: 25 }, (_, idx) => {
                const isRevealed = revealedCells.includes(idx);
                const isBomb = bombPositions.includes(idx);
                const showAll =
                  minesPhase === "boom" || minesPhase === "won";

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={minesPhase !== "playing" || isRevealed}
                    onClick={() => handleClickMineCell(idx)}
                    className={`flex aspect-square items-center justify-center rounded-2xl border-2 font-mono text-lg font-black transition duration-200 ${
                      isRevealed && isBomb
                        ? "border-rose-500 bg-rose-500/30 text-rose-300 shadow-[0_0_25px_rgba(244,63,94,0.5)]"
                        : isRevealed
                        ? "border-[#D4FF00] bg-[#D4FF00]/20 text-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.25)]"
                        : showAll && isBomb
                        ? "border-rose-500/40 bg-rose-500/10 text-rose-400 opacity-60"
                        : "border-zinc-800 bg-[#14141C] text-zinc-500 hover:border-zinc-600 hover:bg-[#1A1A24]"
                    }`}
                  >
                    {(isRevealed || showAll) && isBomb ? (
                      "💣"
                    ) : isRevealed ? (
                      "💎"
                    ) : (
                      "?"
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          GAME 4: C4 WIRE DEFUSE (HARDCORE 1-IN-4)
      ===================================================================== */}
      {activeGame === "defuse" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <div className="rounded-3xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-5">
            <div className="font-mono text-xs font-black uppercase text-[#D4FF00]">
              ХАРДКОР ДЕФЬЮЗ C4 (ШАНС 25% • 1 ПРОВОД ИЗ 4)
            </div>
            <h3 className="mt-1 font-display text-2xl font-black uppercase text-white">
              Перережь единственный верный провод
            </h3>
            <p className="mt-2 text-xs text-zinc-400">
              Из 4 проводов на бомбе C4 только **1 провод ведёт к успешному
              разминированию (шанс 25%)**. Бесплатный дефьюз перезаряжается 10
              секунд и приносит **+{fp(0.45)}**, а платный умножает ставку на **x3.25**!
            </p>

            <div className="mt-5">
              <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                Режим награды:
              </label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWireStakeUsd(0)}
                  className={`rounded-xl border p-3 text-left font-mono text-xs font-black transition ${
                    wireStakeUsd === 0
                      ? "border-[#D4FF00] bg-[#D4FF00]/15 text-[#D4FF00]"
                      : "border-zinc-800 bg-[#09090B] text-zinc-400"
                  }`}
                >
                  <div>БЕСПЛАТНЫЙ (КД 10С)</div>
                  <div className="mt-0.5 text-[10px] text-white">
                    Награда: +{fp(0.45)}
                  </div>
                </button>

                {[0.5, 1.5, 5].map((stake) => (
                  <button
                    key={stake}
                    type="button"
                    onClick={() => setWireStakeUsd(stake)}
                    className={`rounded-xl border p-3 text-left font-mono text-xs font-black transition ${
                      wireStakeUsd === stake
                        ? "border-[#D4FF00] bg-[#D4FF00]/15 text-[#D4FF00]"
                        : "border-zinc-800 bg-[#09090B] text-zinc-400"
                    }`}
                  >
                    <div>СТАВКА {fp(stake)}</div>
                    <div className="mt-0.5 text-[10px] text-white">
                      Выплата: {fp(stake * 3.25)} (x3.25)
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-[#0B0B0F] p-6 lg:col-span-7">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {WIRES.map((w) => {
                const wasChosen = wireResult?.chosenWire === w.id;
                const wasSafe = wireResult?.winningWires.includes(w.id);

                return (
                  <button
                    key={w.id}
                    disabled={isPending || (wireStakeUsd === 0 && wireCooldownSec > 0)}
                    onClick={() => handleCutWire(w.id)}
                    style={{
                      borderColor: wasChosen
                        ? wireResult?.isSuccess
                          ? "#10B981"
                          : "#F43F5E"
                        : `${w.color}65`,
                    }}
                    className="group flex items-center justify-between rounded-2xl border-2 bg-[#121218] p-5 text-left transition hover:scale-[1.02] disabled:opacity-45"
                  >
                    <div>
                      <div
                        style={{ color: w.color }}
                        className="font-mono text-xs font-black uppercase"
                      >
                        {w.name}
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {wireStakeUsd === 0 && wireCooldownSec > 0
                          ? `Перезарядка кусачек: ${wireCooldownSec}с...`
                          : "Нажми, чтобы перерезать кусачками"}
                      </div>
                      {wireResult && (
                        <div
                          className={`mt-2 font-mono text-[11px] font-black ${
                            wasSafe ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {wasSafe ? "✓ БЕЗОПАСНЫЙ ПРОВОД" : "✕ ДЕТОНАЦИЯ"}
                        </div>
                      )}
                    </div>

                    <Scissors
                      style={{ color: w.color }}
                      className="h-7 w-7 transition-transform group-hover:rotate-45"
                    />
                  </button>
                );
              })}
            </div>

            {wireResult && (
              <div
                className={`mt-5 rounded-2xl border p-4 text-center font-mono text-xs font-black uppercase ${
                  wireResult.isSuccess
                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                    : "border-rose-500/40 bg-rose-500/15 text-rose-300"
                }`}
              >
                {wireResult.isSuccess
                  ? `УСПЕШНЫЙ ДЕФЬЮЗ! НА БАЛАНС НАЧИСЛЕНО +${fp(
                      wireResult.wonUsd
                    )}`
                  : "ПРОВОД ОКАЗАЛСЯ ПОД НАПРЯЖЕНИЕМ! ПОПРОБУЙ СНОВА"}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
