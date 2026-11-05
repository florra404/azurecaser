"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Check,
  Coins,
  Flame,
  PackageCheck,
  Search,
  Trash2,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { getRarityTheme, useFormatPrice } from "@/lib/rarity";
import { performUpgradeAction } from "@/app/actions/upgrader";
import { sellInventoryItems } from "@/app/actions/case";
import { useAppStore } from "@/lib/store";
import { soundEngine } from "@/lib/sound";

export interface UpgraderInventoryItem {
  id: string;
  skinId: string;
  wear: string;
  floatValue: number;
  isStatTrak: boolean;
  price: number;
  isNewUpgrade?: boolean;
  skin: {
    id: string;
    name: string;
    weapon: string;
    skinName: string;
    rarity: string;
    basePrice: number;
    imageUrl: string;
  };
}

export interface UpgraderTargetSkin {
  id: string;
  name: string;
  weapon: string;
  skinName: string;
  rarity: string;
  basePrice: number;
  imageUrl: string;
}

export interface UpgradeHistoryEntry {
  id: string;
  sourceValue: number;
  targetSkinName: string;
  targetWeapon: string;
  targetRarity: string;
  targetImageUrl: string;
  targetPrice: number;
  chance: number;
  rollValue: number;
  isSuccess: boolean;
}

interface UpgraderClientProps {
  initialInventory: UpgraderInventoryItem[];
  allSkins: UpgraderTargetSkin[];
  initialHistory: UpgradeHistoryEntry[];
  initialBalance: number;
  preselectedItemId?: string;
}

const MULTIPLIER_BUTTONS = [1.5, 2, 3, 5, 10, 20];

function easeOutCubicQuint(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 4.5);
}

export default function UpgraderClient({
  initialInventory,
  allSkins,
  initialHistory,
  initialBalance,
  preselectedItemId,
}: UpgraderClientProps) {
  const { balance: storeBalance, setBalance, setInventoryCount } =
    useAppStore();
  const { fp, cfg } = useFormatPrice();

  const currentBalance =
    storeBalance !== null ? storeBalance : initialBalance;

  const [inventory, setInventory] =
    useState<UpgraderInventoryItem[]>(initialInventory);
  const [history, setHistory] =
    useState<UpgradeHistoryEntry[]>(initialHistory);

  const [betMode, setBetMode] = useState<"skins" | "balance">(
    preselectedItemId || initialInventory.length > 0 ? "skins" : "balance"
  );
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(() => {
    if (
      preselectedItemId &&
      initialInventory.some((i) => i.id === preselectedItemId)
    ) {
      return [preselectedItemId];
    }
    return initialInventory.length > 0 ? [initialInventory[0].id] : [];
  });
  const [balanceBetUsd, setBalanceBetUsd] = useState<number>(15);
  const [customBetInput, setCustomBetInput] = useState<string>("");

  const [desiredMultiplier, setDesiredMultiplier] = useState<number>(2);
  const [customTargetPriceInput, setCustomTargetPriceInput] =
    useState<string>("");
  const [filterByDesiredMult, setFilterByDesiredMult] = useState<boolean>(true);

  const [targetSkinId, setTargetSkinId] = useState<string>("");
  const [invertSector, setInvertSector] = useState<boolean>(false);
  const [fastMode, setFastMode] = useState<boolean>(false);

  const [phase, setPhase] = useState<"idle" | "spinning" | "won" | "lost">(
    "idle"
  );
  const [lastResult, setLastResult] = useState<{
    rollValue: number;
    isSuccess: boolean;
    wonItem?: UpgraderInventoryItem;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [targetSearch, setTargetSearch] = useState<string>("");
  const [rarityFilter, setRarityFilter] = useState<string>("all");

  // Direct DOM refs for 144Hz zero-jitter rotation
  const needleLayerRef = useRef<HTMLDivElement | null>(null);
  const liveRollTextRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const currentAngleRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const selectedItems = useMemo(
    () => inventory.filter((i) => selectedItemIds.includes(i.id)),
    [inventory, selectedItemIds]
  );

  const sourceValue = useMemo(() => {
    if (betMode === "skins") {
      return Number(
        selectedItems.reduce((sum, item) => sum + item.price, 0).toFixed(2)
      );
    }
    return Number(balanceBetUsd.toFixed(2));
  }, [betMode, selectedItems, balanceBetUsd]);

  const pickClosestSkinToPrice = (
    desiredUsd: number,
    minStakeUsd: number
  ): UpgraderTargetSkin | null => {
    const valid = allSkins.filter((s) => s.basePrice >= minStakeUsd * 1.06);
    if (valid.length === 0) return null;
    return valid.reduce((prev, curr) =>
      Math.abs(curr.basePrice - desiredUsd) <
      Math.abs(prev.basePrice - desiredUsd)
        ? curr
        : prev
    );
  };

  useEffect(() => {
    if (phase === "spinning") return;
    const effectiveStake = sourceValue > 0 ? sourceValue : 10;
    const currentTarget = allSkins.find((s) => s.id === targetSkinId);

    if (!currentTarget || currentTarget.basePrice <= effectiveStake * 1.06) {
      const best = pickClosestSkinToPrice(
        effectiveStake * desiredMultiplier,
        effectiveStake
      );
      if (best) {
        setTargetSkinId(best.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceValue, allSkins]);

  const targetSkin = useMemo(
    () => allSkins.find((s) => s.id === targetSkinId) || null,
    [allSkins, targetSkinId]
  );

  const { chance, multiplier } = useMemo(() => {
    if (
      !targetSkin ||
      sourceValue <= 0 ||
      targetSkin.basePrice <= sourceValue * 1.05
    ) {
      return { chance: 0, multiplier: 0 };
    }
    const rawChance = (sourceValue / targetSkin.basePrice) * 96;
    const clampedChance = Number(
      Math.min(Math.max(rawChance, 1.0), 80.0).toFixed(2)
    );
    const mult = Number((targetSkin.basePrice / sourceValue).toFixed(2));
    return { chance: clampedChance, multiplier: mult };
  }, [targetSkin, sourceValue]);

  const ensureActiveStake = (): number => {
    if (sourceValue > 0) return sourceValue;
    if (inventory.length > 0) {
      setBetMode("skins");
      setSelectedItemIds([inventory[0].id]);
      return inventory[0].price;
    }
    setBetMode("balance");
    setBalanceBetUsd(15);
    return 15;
  };

  const handleSelectMultiplier = (mult: number) => {
    if (phase === "spinning") return;
    const stake = ensureActiveStake();
    setDesiredMultiplier(mult);
    setCustomTargetPriceInput("");
    setFilterByDesiredMult(true);

    const best = pickClosestSkinToPrice(stake * mult, stake);
    if (best) {
      setTargetSkinId(best.id);
    }
    setPhase("idle");
    setLastResult(null);
  };

  // Custom Target Price typed by user (in current display currency, e.g. UAH ₴ or USD $)
  const handleApplyCustomTargetPrice = (rawVal: string) => {
    setCustomTargetPriceInput(rawVal);
    const numeric = parseFloat(rawVal.replace(/[^0-9.]/g, ""));
    if (isNaN(numeric) || numeric <= 0) return;

    const priceInUsd = numeric / cfg.rate;
    const stake = ensureActiveStake();
    const effectiveUsd = Math.max(stake * 1.08, priceInUsd);

    const newMult = Number((effectiveUsd / stake).toFixed(2));
    setDesiredMultiplier(newMult);
    setFilterByDesiredMult(true);

    const best = pickClosestSkinToPrice(effectiveUsd, stake);
    if (best) {
      setTargetSkinId(best.id);
    }
    setPhase("idle");
    setLastResult(null);
  };

  // Custom Balance Bet typed by user (in current currency)
  const handleCustomBetChange = (rawVal: string) => {
    setCustomBetInput(rawVal);
    const numeric = parseFloat(rawVal.replace(/[^0-9.]/g, ""));
    if (isNaN(numeric) || numeric <= 0) return;
    const usdVal = Math.min(currentBalance, Math.max(0.5, numeric / cfg.rate));
    setBalanceBetUsd(Number(usdVal.toFixed(2)));
    const best = pickClosestSkinToPrice(usdVal * desiredMultiplier, usdVal);
    if (best) setTargetSkinId(best.id);
  };

  const toggleSkinSelection = (id: string) => {
    if (phase === "spinning") return;
    setBetMode("skins");
    setPhase("idle");
    setLastResult(null);

    const next = selectedItemIds.includes(id)
      ? selectedItemIds.filter((item) => item !== id)
      : selectedItemIds.length < 6
      ? [...selectedItemIds, id]
      : selectedItemIds;

    setSelectedItemIds(next);

    const nextStake = inventory
      .filter((i) => next.includes(i.id))
      .reduce((s, i) => s + i.price, 0);

    if (nextStake > 0) {
      const best = pickClosestSkinToPrice(
        nextStake * desiredMultiplier,
        nextStake
      );
      if (best) setTargetSkinId(best.id);
    }
  };

  const handleLaunchUpgrade = async () => {
    if (phase === "spinning") return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setErrorMsg(null);

    if (sourceValue <= 0) {
      setErrorMsg("Выбери хотя бы один скин слева или укажи ставку с баланса");
      return;
    }
    if (!targetSkin || chance <= 0) {
      setErrorMsg("Выбери целевой скин справа");
      return;
    }

    soundEngine.playStartSpin();

    const res = await performUpgradeAction({
      mode: betMode,
      sourceItemIds: selectedItemIds,
      balanceBet: balanceBetUsd,
      targetSkinId: targetSkin.id,
      invertSector,
    });

    if (!res.ok || typeof res.targetAngle !== "number") {
      setErrorMsg(res.error || "Ошибка апгрейда");
      return;
    }

    if (typeof res.newBalance === "number") {
      setBalance(res.newBalance);
    }

    setPhase("spinning");
    setLastResult(null);

    const spinDuration = fastMode ? 2200 : 6400;
    const extraTurns = fastMode ? 5 : 8;

    const startDeg = currentAngleRef.current % 360;
    const deltaToTarget = (res.targetAngle - startDeg + 360) % 360;
    const finalDeg = startDeg + extraTurns * 360 + deltaToTarget;

    if (needleLayerRef.current) {
      needleLayerRef.current.style.transition = "none";
      needleLayerRef.current.style.transform = `rotate3d(0, 0, 1, ${startDeg.toFixed(
        2
      )}deg)`;
    }

    let lastTickSlot = Math.floor(startDeg / 15);

    requestAnimationFrame(() => {
      const startTime = performance.now();

      const animateWheel = (now: number) => {
        const elapsed = Math.max(0, now - startTime);
        const t = Math.min(elapsed / spinDuration, 1);
        const eased = easeOutCubicQuint(t);

        const deg = startDeg + (finalDeg - startDeg) * eased;
        currentAngleRef.current = deg;

        if (needleLayerRef.current) {
          needleLayerRef.current.style.transform = `rotate3d(0, 0, 1, ${deg.toFixed(
            2
          )}deg)`;
        }

        const normDeg = ((deg % 360) + 360) % 360;
        const pct = (normDeg / 360) * 100;
        if (liveRollTextRef.current) {
          liveRollTextRef.current.textContent = `${pct.toFixed(2)}%`;
        }

        const tickSlot = Math.floor(deg / 15);
        if (tickSlot !== lastTickSlot) {
          lastTickSlot = tickSlot;
          soundEngine.playTick(1 - t);
        }

        if (t < 1) {
          rafRef.current = requestAnimationFrame(animateWheel);
        } else {
          currentAngleRef.current = res.targetAngle!;
          if (needleLayerRef.current) {
            needleLayerRef.current.style.transform = `rotate3d(0, 0, 1, ${res.targetAngle!.toFixed(
              2
            )}deg)`;
          }

          if (typeof res.newInventoryCount === "number") {
            setInventoryCount(res.newInventoryCount);
          }

          let createdWonItem: UpgraderInventoryItem | undefined = undefined;
          if (res.isSuccess && res.wonItem) {
            createdWonItem = {
              id: res.wonItem.inventoryItemId,
              skinId: res.wonItem.skinId,
              wear: res.wonItem.wear,
              floatValue: res.wonItem.floatValue,
              isStatTrak: res.wonItem.isStatTrak,
              price: res.wonItem.price,
              isNewUpgrade: true,
              skin: {
                id: res.wonItem.skinId,
                name: res.wonItem.name,
                weapon: res.wonItem.weapon,
                skinName: res.wonItem.skinName,
                rarity: res.wonItem.rarity,
                basePrice: res.wonItem.price,
                imageUrl: res.wonItem.imageUrl,
              },
            };
          }

          setInventory((prev) => {
            const remaining =
              betMode === "skins"
                ? prev.filter((item) => !selectedItemIds.includes(item.id))
                : prev;
            if (createdWonItem) {
              return [createdWonItem, ...remaining];
            }
            return remaining;
          });

          setLastResult({
            rollValue: res.rollValue!,
            isSuccess: !!res.isSuccess,
            wonItem: createdWonItem,
          });

          if (res.isSuccess && createdWonItem) {
            soundEngine.playWin(true);
            setPhase("won");
            if (betMode === "skins") {
              setSelectedItemIds([]);
            }
          } else {
            soundEngine.playUpgradeFail();
            setPhase("lost");
            if (betMode === "skins") {
              setSelectedItemIds([]);
            }
          }

          setHistory((prev) => [
            {
              id: `upg-${Date.now()}`,
              sourceValue,
              targetSkinName: targetSkin.name,
              targetWeapon: targetSkin.weapon,
              targetRarity: targetSkin.rarity,
              targetImageUrl: targetSkin.imageUrl,
              targetPrice: targetSkin.basePrice,
              chance,
              rollValue: res.rollValue!,
              isSuccess: !!res.isSuccess,
            },
            ...prev.slice(0, 11),
          ]);
        }
      };

      rafRef.current = requestAnimationFrame(animateWheel);
    });
  };

  const handleSellWonUpgrade = async () => {
    if (!lastResult?.wonItem) return;
    const wonId = lastResult.wonItem.id;
    const res = await sellInventoryItems([wonId]);
    if (res.ok && typeof res.newBalance === "number") {
      setBalance(res.newBalance);
      setInventory((prev) => {
        const next = prev.filter((i) => i.id !== wonId);
        setInventoryCount(next.length);
        return next;
      });
      setSelectedItemIds((prev) => prev.filter((id) => id !== wonId));
      setLastResult((prev) => (prev ? { ...prev, wonItem: undefined } : null));
      soundEngine.playCashout();
    }
  };

  const handleUpgradeWonFurther = () => {
    if (!lastResult?.wonItem) return;
    const won = lastResult.wonItem;
    setBetMode("skins");
    setSelectedItemIds([won.id]);
    const nextTarget = pickClosestSkinToPrice(won.price * 2, won.price);
    if (nextTarget) {
      setTargetSkinId(nextTarget.id);
    }
    setPhase("idle");
    setLastResult(null);
  };

  const filteredTargetSkins = useMemo(() => {
    const effectiveStake = sourceValue > 0 ? sourceValue : 10;
    const minValidPrice = effectiveStake * 1.06;
    const idealTargetPrice = effectiveStake * desiredMultiplier;

    const valid = allSkins.filter((s) => {
      if (s.basePrice < minValidPrice) return false;
      if (rarityFilter !== "all" && s.rarity !== rarityFilter) return false;
      const q = targetSearch.trim().toLowerCase();
      if (q && !s.name.toLowerCase().includes(q)) return false;

      if (filterByDesiredMult && !q) {
        const lowBound = idealTargetPrice * 0.55;
        const highBound = idealTargetPrice * 1.85;
        return s.basePrice >= lowBound && s.basePrice <= highBound;
      }
      return true;
    });

    const listToSort =
      valid.length >= 4
        ? valid
        : allSkins.filter((s) => {
            if (s.basePrice < minValidPrice) return false;
            if (rarityFilter !== "all" && s.rarity !== rarityFilter)
              return false;
            const q = targetSearch.trim().toLowerCase();
            if (q && !s.name.toLowerCase().includes(q)) return false;
            return true;
          });

    return [...listToSort].sort((a, b) => {
      if (filterByDesiredMult) {
        return (
          Math.abs(a.basePrice - idealTargetPrice) -
          Math.abs(b.basePrice - idealTargetPrice)
        );
      }
      return a.basePrice - b.basePrice;
    });
  }, [
    allSkins,
    sourceValue,
    desiredMultiplier,
    filterByDesiredMult,
    rarityFilter,
    targetSearch,
  ]);

  // 380x380 Concentric Wheel Math
  const wheelSize = 380;
  const center = wheelSize / 2;
  const radius = 158;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (chance / 100) * circumference;
  const sectorRotationDeg = invertSector
    ? -90 + ((100 - chance) / 100) * 360
    : -90;

  const targetTheme = targetSkin
    ? getRarityTheme(targetSkin.rarity)
    : getRarityTheme("MIL_SPEC");

  return (
    <div className="mx-auto max-w-[1640px] px-4 py-6 lg:px-8">
      {/* MAIN 3-COLUMN UPGRADER ARENA */}
      <div className="bg-carbon-pattern relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#111115] p-5 shadow-2xl lg:p-8">
        <div className="grid items-stretch gap-6 lg:grid-cols-12">
          {/* LEFT PEDESTAL: YOUR STAKE (col-span-4) */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-800/90 bg-[#0B0B0F] p-5 lg:col-span-4">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#14141A] p-1">
                  <button
                    disabled={phase === "spinning"}
                    onClick={() => setBetMode("skins")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase transition ${
                      betMode === "skins"
                        ? "bg-[#D4FF00] text-zinc-950"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Скины ({selectedItems.length})
                  </button>
                  <button
                    disabled={phase === "spinning"}
                    onClick={() => setBetMode("balance")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase transition ${
                      betMode === "balance"
                        ? "bg-[#D4FF00] text-zinc-950"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    С баланса
                  </button>
                </div>

                {betMode === "skins" && selectedItems.length > 0 && (
                  <button
                    disabled={phase === "spinning"}
                    onClick={() => setSelectedItemIds([])}
                    className="flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Сброс</span>
                  </button>
                )}
              </div>

              {betMode === "skins" ? (
                <div className="my-6 flex min-h-[250px] flex-col justify-center">
                  {selectedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-10 text-center">
                      <Flame className="h-9 w-9 text-zinc-600" />
                      <p className="mt-2.5 text-sm font-bold text-zinc-300">
                        Выбери скин из инвентаря снизу
                      </p>
                      <button
                        onClick={() => {
                          setBetMode("balance");
                          setBalanceBetUsd(15);
                        }}
                        className="mt-4 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-black uppercase text-[#D4FF00] transition hover:bg-zinc-700"
                      >
                        Или поставить с баланса ({fp(15)})
                      </button>
                    </div>
                  ) : selectedItems.length === 1 ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="relative flex h-40 w-60 items-center justify-center">
                        <div className="pointer-events-none absolute inset-0 rounded-full bg-[#D4FF00]/10 blur-2xl" />
                        <img
                          src={selectedItems[0].skin.imageUrl}
                          alt={selectedItems[0].skin.name}
                          className="animate-weapon-hover relative z-10 h-36 w-56 object-contain drop-shadow-[0_20px_26px_rgba(0,0,0,0.95)]"
                        />
                      </div>
                      <div className="mt-2 font-mono text-xs font-bold uppercase text-zinc-400">
                        {selectedItems[0].skin.weapon} • {selectedItems[0].wear}
                      </div>
                      <div className="font-display text-lg font-black text-white">
                        {selectedItems[0].skin.skinName}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {selectedItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => toggleSkinSelection(item.id)}
                          className="cursor-pointer rounded-xl border border-zinc-800 bg-[#14141A] p-2 text-center transition hover:border-rose-500/50"
                        >
                          <img
                            src={item.skin.imageUrl}
                            alt={item.skin.name}
                            className="mx-auto h-14 w-20 object-contain"
                          />
                          <div className="mt-1 truncate text-[10px] font-bold text-white">
                            {item.skin.skinName}
                          </div>
                          <div className="font-mono text-[10px] font-black text-[#D4FF00]">
                            {fp(item.price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="my-6 flex min-h-[250px] flex-col justify-center space-y-4">
                  <div className="rounded-2xl border border-zinc-800 bg-[#14141A] p-4 text-center">
                    <Wallet className="mx-auto h-6 w-6 text-[#D4FF00]" />
                    <div className="mt-1 text-xs text-zinc-400">
                      Ставка с баланса
                    </div>
                    <div className="mt-0.5 font-mono text-3xl font-black text-[#D4FF00]">
                      {fp(balanceBetUsd)}
                    </div>
                  </div>

                  {/* Direct input for custom bet */}
                  <div>
                    <label className="mb-1.5 block font-mono text-[10px] font-bold uppercase text-zinc-400">
                      Вписать свою ставку ({cfg.symbol}):
                    </label>
                    <input
                      type="number"
                      min={1}
                      disabled={phase === "spinning"}
                      value={customBetInput}
                      onChange={(e) => handleCustomBetChange(e.target.value)}
                      placeholder={`Например: ${Math.round(25 * cfg.rate)}`}
                      className="w-full rounded-xl border border-zinc-800 bg-[#14141A] px-3.5 py-2.5 font-mono text-xs font-bold text-white placeholder-zinc-600 focus:border-[#D4FF00] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[5, 15, 50, 150].map((val) => (
                      <button
                        key={val}
                        disabled={phase === "spinning"}
                        onClick={() => {
                          const safeVal = Math.min(
                            val,
                            Math.max(1, currentBalance)
                          );
                          setBalanceBetUsd(safeVal);
                          setCustomBetInput(
                            String(Math.round(safeVal * cfg.rate))
                          );
                          const best = pickClosestSkinToPrice(
                            safeVal * desiredMultiplier,
                            safeVal
                          );
                          if (best) setTargetSkinId(best.id);
                        }}
                        className="rounded-xl border border-zinc-800 bg-zinc-900 py-2 font-mono text-xs font-bold text-zinc-300 hover:border-[#D4FF00] hover:text-white"
                      >
                        {fp(val)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#14141A] px-4 py-3">
              <span className="text-xs font-bold uppercase text-zinc-400">
                Твоя ставка:
              </span>
              <span className="font-mono text-lg font-black text-[#D4FF00]">
                {fp(sourceValue)}
              </span>
            </div>
          </div>

          {/* CENTER CONCENTRIC 380x380 REACTOR WHEEL (col-span-4) */}
          <div className="flex flex-col items-center justify-between lg:col-span-4">
            {/* Top Sector Pill */}
            <div className="mb-2 flex w-full max-w-[380px] items-center justify-between rounded-xl border border-zinc-800 bg-[#0B0B0F] px-4 py-2 font-mono text-xs">
              <span className="text-zinc-400">
                Победа:{" "}
                <strong className="text-white">
                  {!invertSector
                    ? `0.00% – ${chance.toFixed(2)}%`
                    : `${(100 - chance).toFixed(2)}% – 100.00%`}
                </strong>
              </span>
              <span className="rounded bg-[#D4FF00] px-2.5 py-0.5 font-black text-zinc-950">
                x{multiplier.toFixed(2)}
              </span>
            </div>

            {/* CONCENTRIC WHEEL BOX — ALL LAYERS ABSOLUTE SO THEY NEVER COLLIDE! */}
            <div className="relative my-2 h-[330px] w-[330px] shrink-0 sm:h-[380px] sm:w-[380px]">
              {/* Layer 1: Static SVG Circle & Winning Arc */}
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${wheelSize} ${wheelSize}`}
              >
                {/* Outer Degree Ticks */}
                <circle
                  cx={center}
                  cy={center}
                  r={182}
                  fill="none"
                  stroke="#27272A"
                  strokeWidth="2"
                  strokeDasharray="3 7"
                />

                {/* Base Dark Sector Track */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="#18181D"
                  strokeWidth="22"
                />

                {/* Winning Sector Arc */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={
                    phase === "lost"
                      ? "#EF4444"
                      : phase === "won"
                      ? "#10B981"
                      : "#D4FF00"
                  }
                  strokeWidth="22"
                  strokeDasharray={`${arcLength} ${circumference}`}
                  transform={`rotate(${sectorRotationDeg} ${center} ${center})`}
                  className="transition-[stroke-dasharray,transform,stroke] duration-300"
                />
              </svg>

              {/* Layer 2: GPU-Accelerated Rotating Needle Layer (exact same 380x380 viewBox) */}
              <div
                ref={needleLayerRef}
                style={{ transform: "rotate3d(0, 0, 1, 0deg)" }}
                className="pointer-events-none absolute inset-0 z-20 will-change-transform"
              >
                <svg
                  className="h-full w-full"
                  viewBox={`0 0 ${wheelSize} ${wheelSize}`}
                >
                  {/* Laser Beam from outside center hub to outer ring */}
                  <line
                    x1={center}
                    y1={center - 104}
                    x2={center}
                    y2={20}
                    stroke="#FFFFFF"
                    strokeWidth="3.5"
                  />
                  {/* Glowing Outer Arrowhead */}
                  <polygon
                    points={`${center},6 ${center - 10},28 ${center + 10},28`}
                    fill="#D4FF00"
                    stroke="#09090B"
                    strokeWidth="2"
                  />
                  <circle cx={center} cy={32} r="5" fill="#FFFFFF" />
                </svg>
              </div>

              {/* Layer 3: Dead-Center Hub */}
              <div className=" absolute inset-0 z-30 flex items-center justify-center">
                <div className="flex h-52 w-52 flex-col items-center justify-center rounded-full border-2 border-zinc-800 bg-[#09090B] p-4 text-center shadow-[0_0_45px_rgba(0,0,0,0.95)]">
                  {phase === "idle" && (
                    <>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        ШАНС АПГРЕЙДА
                      </span>
                      <span className="mt-1 font-mono text-4xl font-black text-white sm:text-5xl">
                        {chance.toFixed(1)}%
                      </span>
                      <span className="mt-2 rounded-md bg-zinc-900 px-3 py-1 font-mono text-xs font-bold text-[#D4FF00]">
                        Цель: {targetSkin ? fp(targetSkin.basePrice) : "—"}
                      </span>
                    </>
                  )}

                  {phase === "spinning" && (
                    <>
                      <span className="font-mono text-[10px] font-black uppercase tracking-widest text-[#D4FF00]">
                        КРУТИМ...
                      </span>
                      <span
                        ref={liveRollTextRef}
                        className="mt-1 font-mono text-4xl font-black text-white"
                      >
                        0.00%
                      </span>
                      <span className="mt-1.5 font-mono text-xs text-zinc-400">
                        Шанс: {chance.toFixed(2)}%
                      </span>
                    </>
                  )}

                  {phase === "won" && lastResult && (
                    <>
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-emerald-300">
                        <PackageCheck className="h-3.5 w-3.5" />
                        <span>В ИНВЕНТАРЕ!</span>
                      </span>
                      <span className="mt-1 font-mono text-2xl font-black text-[#D4FF00]">
                        {lastResult.rollValue.toFixed(2)}%
                      </span>

                      {lastResult.wonItem ? (
                        <div className="mt-2 flex w-full flex-col gap-1.5 px-2">
                          <button
                            onClick={handleUpgradeWonFurther}
                            className="w-full rounded-lg bg-[#D4FF00] py-1.5 font-mono text-[10px] font-black uppercase text-zinc-950 transition hover:bg-[#e3ff4d]"
                          >
                            Апгрейд дальше →
                          </button>
                          <button
                            onClick={handleSellWonUpgrade}
                            className="w-full rounded-lg bg-zinc-800 py-1.5 font-mono text-[10px] font-bold text-white transition hover:bg-zinc-700"
                          >
                            Продать {fp(lastResult.wonItem.price)}
                          </button>
                        </div>
                      ) : (
                        <span className="mt-2 font-mono text-xs text-emerald-400">
                          Продано ✓
                        </span>
                      )}
                    </>
                  )}

                  {phase === "lost" && lastResult && (
                    <>
                      <span className="rounded bg-rose-500/20 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-rose-400">
                        НЕ ЗАШЛО
                      </span>
                      <span className="mt-1.5 font-mono text-3xl font-black text-rose-400">
                        {lastResult.rollValue.toFixed(2)}%
                      </span>
                      <span className="mt-1 font-mono text-xs text-zinc-500">
                        Нужно{" "}
                        {!invertSector
                          ? `≤ ${chance.toFixed(2)}%`
                          : `≥ ${(100 - chance).toFixed(2)}%`}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-2 w-full max-w-[380px] rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-center text-xs font-bold text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Action Buttons Below Wheel */}
            <div className="mt-2 flex w-full max-w-[380px] items-center gap-2">
              <button
                disabled={phase === "spinning"}
                onClick={() => setInvertSector(!invertSector)}
                title="Поменять сторону сектора"
                className={`flex h-12 items-center justify-center rounded-xl border px-3.5 text-xs font-black uppercase transition ${
                  invertSector
                    ? "border-[#D4FF00] bg-[#D4FF00]/15 text-[#D4FF00]"
                    : "border-zinc-800 bg-[#0B0B0F] text-zinc-400 hover:text-white"
                }`}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>

              <button
                disabled={phase === "spinning" || chance <= 0}
                onClick={handleLaunchUpgrade}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#D4FF00] text-xs font-black uppercase tracking-wider text-zinc-950 shadow-[0_0_25px_rgba(212,255,0,0.3)] transition hover:bg-[#e2ff44] disabled:opacity-40"
              >
                <Flame className="h-4 w-4 stroke-[2.5]" />
                <span>
                  {phase === "spinning"
                    ? "Крутим..."
                    : `Апгрейд (${chance.toFixed(1)}%)`}
                </span>
              </button>

              <button
                disabled={phase === "spinning"}
                onClick={() => setFastMode(!fastMode)}
                title="Быстрый режим"
                className={`flex h-12 items-center justify-center rounded-xl border px-3.5 transition ${
                  fastMode
                    ? "border-[#D4FF00] bg-[#D4FF00]/15 text-[#D4FF00]"
                    : "border-zinc-800 bg-[#0B0B0F] text-zinc-400 hover:text-white"
                }`}
              >
                <Zap className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* RIGHT PEDESTAL: TARGET SKIN + MULTIPLIER BUTTONS + CUSTOM PRICE INPUT (col-span-4) */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-800/90 bg-[#0B0B0F] p-5 lg:col-span-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
              <span className="font-display text-sm font-black uppercase tracking-wide text-white">
                Желаемый скин
              </span>
              {targetSkin && (
                <span
                  style={{
                    backgroundColor: targetTheme.badgeBg,
                    color: targetTheme.text,
                  }}
                  className="rounded px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase"
                >
                  {targetTheme.ruLabel}
                </span>
              )}
            </div>

            <div className="my-4 flex min-h-[180px] flex-col items-center justify-center text-center">
              {targetSkin ? (
                <>
                  <div className="relative flex h-36 w-56 items-center justify-center">
                    <div
                      style={{
                        background: `radial-gradient(circle at center, ${targetTheme.bgGlow} 0%, transparent 70%)`,
                      }}
                      className="pointer-events-none absolute inset-0 rounded-full blur-2xl"
                    />
                    <img
                      src={targetSkin.imageUrl}
                      alt={targetSkin.name}
                      className="animate-weapon-hover relative z-10 h-32 w-52 object-contain drop-shadow-[0_20px_26px_rgba(0,0,0,0.95)]"
                    />
                  </div>
                  <div className="mt-2 font-mono text-xs font-bold uppercase text-zinc-400">
                    {targetSkin.weapon}
                  </div>
                  <div className="font-display text-lg font-black text-white">
                    {targetSkin.skinName}
                  </div>
                </>
              ) : (
                <p className="text-xs text-zinc-500">
                  Выбери скин из списка ниже
                </p>
              )}
            </div>

            {/* MULTIPLIER BUTTONS (1.5x, 2x, 3x, 5x, 10x, 20x) + CUSTOM PRICE INPUT */}
            <div className="mb-3 space-y-2.5 rounded-xl border border-zinc-800 bg-[#14141A] p-3">
              <div className="grid grid-cols-6 gap-1.5">
                {MULTIPLIER_BUTTONS.map((m) => {
                  const isActive =
                    Math.abs(desiredMultiplier - m) < 0.15 &&
                    filterByDesiredMult &&
                    !customTargetPriceInput;
                  return (
                    <button
                      key={m}
                      disabled={phase === "spinning"}
                      onClick={() => handleSelectMultiplier(m)}
                      className={`rounded-lg py-2 font-mono text-xs font-black transition ${
                        isActive
                          ? "bg-[#D4FF00] text-zinc-950 shadow"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      {m}x
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  disabled={phase === "spinning"}
                  value={customTargetPriceInput}
                  onChange={(e) => handleApplyCustomTargetPrice(e.target.value)}
                  placeholder={`Вписать свою цену цели (${cfg.symbol})...`}
                  className="w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2 font-mono text-xs font-bold text-white placeholder-zinc-500 focus:border-[#D4FF00] focus:outline-none"
                />
                {customTargetPriceInput && (
                  <button
                    onClick={() => {
                      setCustomTargetPriceInput("");
                      handleSelectMultiplier(2);
                    }}
                    className="rounded-lg bg-zinc-800 p-2 text-zinc-400 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-[#14141A] px-4 py-3">
              <span className="text-xs font-bold uppercase text-zinc-400">
                Цена цели:
              </span>
              <span className="font-mono text-lg font-black text-white">
                {targetSkin ? fp(targetSkin.basePrice) : fp(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM DUAL BROWSERS: LEFT INVENTORY + RIGHT TARGET SKINS */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        {/* Left: User Inventory */}
        <div className="rounded-2xl border border-zinc-800 bg-[#111115] p-5 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3.5">
            <div>
              <h2 className="font-display text-base font-black uppercase text-white">
                Твой инвентарь ({inventory.length})
              </h2>
              <p className="text-[11px] text-zinc-500">
                Выигранные скины сразу зачисляются сюда
              </p>
            </div>
            <Link
              href="/profile"
              className="font-mono text-xs font-bold text-[#D4FF00] hover:underline"
            >
              Весь инвентарь →
            </Link>
          </div>

          {inventory.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              В инвентаре пусто. Используй ставку «С баланса» выше или открой
              кейс!
            </div>
          ) : (
            <div className="mt-4 grid max-h-[520px] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3">
              {inventory.map((item) => {
                const theme = getRarityTheme(item.skin.rarity);
                const isSelected =
                  betMode === "skins" && selectedItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSkinSelection(item.id)}
                    style={{
                      background: `linear-gradient(180deg, #14141A 0%, ${theme.bgGlow} 160%)`,
                    }}
                    className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border p-3 transition ${
                      isSelected
                        ? "border-[#D4FF00] ring-1 ring-[#D4FF00]"
                        : item.isNewUpgrade
                        ? "border-emerald-400/70"
                        : "border-zinc-800 hover:border-zinc-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {item.isNewUpgrade ? (
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-emerald-300">
                          UPGRADED ✓
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-bold text-zinc-400">
                          {item.wear}
                        </span>
                      )}
                      <span className="font-mono text-xs font-black text-white">
                        {fp(item.price)}
                      </span>
                    </div>

                    <div className="my-2 flex h-20 items-center justify-center">
                      <img
                        src={item.skin.imageUrl}
                        alt={item.skin.name}
                        className="h-16 w-28 object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.85)]"
                      />
                    </div>

                    <div>
                      <div className="truncate text-[10px] text-zinc-400">
                        {item.skin.weapon}
                      </div>
                      <div className="truncate text-xs font-extrabold text-white">
                        {item.skin.skinName}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#D4FF00] text-zinc-950">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    )}

                    <div
                      style={{ backgroundColor: theme.color }}
                      className="absolute bottom-0 left-0 right-0 h-[3px]"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Target Skins Catalog */}
        <div className="rounded-2xl border border-zinc-800 bg-[#111115] p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
            <div>
              <h2 className="font-display text-base font-black uppercase text-white">
                {filterByDesiredMult
                  ? `Скины под ~${desiredMultiplier}x (${filteredTargetSkins.length})`
                  : `Все доступные скины (${filteredTargetSkins.length})`}
              </h2>
              <p className="text-[11px] text-zinc-500">
                На каждой карточке показан твой шанс и множитель
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFilterByDesiredMult(!filterByDesiredMult)}
                className={`rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-black uppercase transition ${
                  filterByDesiredMult
                    ? "border-[#D4FF00] bg-[#D4FF00]/15 text-[#D4FF00]"
                    : "border-zinc-800 bg-[#09090B] text-zinc-400 hover:text-white"
                }`}
              >
                {filterByDesiredMult ? `Под ${desiredMultiplier}x` : "Все скины"}
              </button>

              <div className="relative w-44">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  placeholder="Поиск скина..."
                  className="w-full rounded-lg border border-zinc-800 bg-[#09090B] py-1.5 pl-8 pr-6 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00] focus:outline-none"
                />
                {targetSearch && (
                  <button
                    onClick={() => setTargetSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-[#09090B] p-0.5">
                {[
                  { id: "all", label: "Все" },
                  { id: "COVERT", label: "Тайное" },
                  { id: "GOLD", label: "Ножи" },
                ].map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setRarityFilter(r.id)}
                    className={`rounded px-2 py-1 text-[10px] font-bold uppercase transition ${
                      rarityFilter === r.id
                        ? "bg-zinc-800 text-[#D4FF00]"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid max-h-[520px] grid-cols-2 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
            {filteredTargetSkins.slice(0, 80).map((skin) => {
              const theme = getRarityTheme(skin.rarity);
              const isSelected = skin.id === targetSkinId;
              const effectiveStake = sourceValue > 0 ? sourceValue : 10;
              const itemChance = Math.min(
                80,
                Math.max(1, (effectiveStake / skin.basePrice) * 96)
              );
              const itemMult = skin.basePrice / effectiveStake;

              return (
                <div
                  key={skin.id}
                  onClick={() => {
                    if (phase === "spinning") return;
                    setTargetSkinId(skin.id);
                    setPhase("idle");
                    setLastResult(null);
                  }}
                  style={{
                    background: `linear-gradient(180deg, #14141A 0%, ${theme.bgGlow} 160%)`,
                  }}
                  className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border p-3 transition ${
                    isSelected
                      ? "border-[#D4FF00] ring-1 ring-[#D4FF00]"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-black text-[#D4FF00]">
                      {itemChance.toFixed(1)}% • {itemMult.toFixed(1)}x
                    </span>
                    <span className="font-mono text-xs font-black text-white">
                      {fp(skin.basePrice)}
                    </span>
                  </div>

                  <div className="my-2 flex h-20 items-center justify-center">
                    <img
                      src={skin.imageUrl}
                      alt={skin.name}
                      className="h-16 w-28 object-contain drop-shadow-[0_8px_12px_rgba(0,0,0,0.85)] transition-transform group-hover:scale-105"
                    />
                  </div>

                  <div>
                    <div className="truncate text-[10px] text-zinc-400">
                      {skin.weapon}
                    </div>
                    <div className="truncate text-xs font-extrabold text-white">
                      {skin.skinName}
                    </div>
                  </div>

                  <div
                    style={{ backgroundColor: theme.color }}
                    className="absolute bottom-0 left-0 right-0 h-[3px]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
