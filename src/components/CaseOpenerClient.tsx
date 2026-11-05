"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Coins,
  Flame,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { CaseCardData, CaseSkinPreview } from "./CaseVaultCard";
import { getRarityTheme, useFormatPrice } from "@/lib/rarity";
import {
  openCaseBatch,
  sellInventoryItems,
  WonDropResult,
} from "@/app/actions/case";
import { useAppStore } from "@/lib/store";
import { soundEngine } from "@/lib/sound";

interface CaseOpenerClientProps {
  caseData: CaseCardData;
  categoryName: string;
  initialBalance: number;
}

interface ReelState {
  items: CaseSkinPreview[];
  winner: WonDropResult;
  winIndex: number;
  landingOffsetPx: number;
  exactCenterOffsetPx: number;
  durationMs: number;
  activeCardIndex: number;
  isLocked: boolean;
}

const CARD_WIDTH = 196;
const CARD_GAP = 12;
const STEP_PX = CARD_WIDTH + CARD_GAP;
const TRACK_PADDING_LEFT = 24;

// Multi-stage suspense easing: fast launch, long mid-run, nail-biting slow crawl at the end
function customSuspenseEasing(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 4.6);
}

export default function CaseOpenerClient({
  caseData,
  categoryName,
  initialBalance,
}: CaseOpenerClientProps) {
  const { balance: storeBalance, setBalance } = useAppStore();
  const { fp } = useFormatPrice();
  const currentBalance =
    storeBalance !== null ? storeBalance : initialBalance;

  const [openCount, setOpenCount] = useState<number>(1);
  const [fastMode, setFastMode] = useState<boolean>(false);
  const [phase, setPhase] = useState<"idle" | "spinning" | "locked" | "won">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reels, setReels] = useState<ReelState[]>([]);
  const [wonDrops, setWonDrops] = useState<WonDropResult[]>([]);
  const [soldIds, setSoldIds] = useState<Record<string, boolean>>({});
  const [sellingBusy, setSellingBusy] = useState<boolean>(false);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scannerDotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const scannerWeaponRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const scannerSkinRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const scannerPriceRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);
  const finishTimeoutRef = useRef<number | null>(null);

  const totalCost = Number((caseData.price * openCount).toFixed(2));
  const sortedContents = [...caseData.items].sort(
    (a, b) => b.basePrice - a.basePrice
  );

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (finishTimeoutRef.current) window.clearTimeout(finishTimeoutRef.current);
    };
  }, []);

  const pickWeightedPreview = (): CaseSkinPreview => {
    const total = caseData.items.reduce((s, i) => s + i.dropChance, 0);
    let r = Math.random() * total;
    for (const item of caseData.items) {
      if (r < item.dropChance) return item;
      r -= item.dropChance;
    }
    return caseData.items[0];
  };

  const pickNearMissBait = (): CaseSkinPreview => {
    const topPool = sortedContents.slice(0, Math.min(3, sortedContents.length));
    return topPool[Math.floor(Math.random() * topPool.length)];
  };

  const handleOpenCase = async () => {
    if (phase === "spinning" || phase === "locked") return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (finishTimeoutRef.current) window.clearTimeout(finishTimeoutRef.current);

    setErrorMsg(null);

    if (currentBalance < totalCost) {
      setErrorMsg(
        `Недостаточно средств (нужно ${fp(totalCost)}). Пополни баланс сверху.`
      );
      return;
    }

    soundEngine.playStartSpin();

    const res = await openCaseBatch(caseData.id, openCount);
    if (!res.ok || !res.drops) {
      setErrorMsg(res.error || "Ошибка при открытии кейса");
      return;
    }

    if (typeof res.newBalance === "number") {
      setBalance(res.newBalance);
    }

    // Measure inner drum viewport width
    const stageWidth = stageRef.current
      ? stageRef.current.clientWidth - 64
      : 1160;
    const centerPoint = stageWidth / 2;

    // 6.8 seconds normal spin, 2.5 seconds fast spin
    const baseDuration = fastMode ? 2500 : 6800;
    const staggerMs = fastMode ? 180 : 380;

    // Fewer cards per strip when opening multiple cases at once to eliminate DOM bloat
    const tapeLength = openCount > 1 ? 56 : 72;
    const winIdx = openCount > 1 ? 48 : 64;

    const builtReels: ReelState[] = res.drops.map((drop, rIdx) => {
      const tape: CaseSkinPreview[] = [];
      const baitSlot = Math.random() > 0.45 ? winIdx - 1 : winIdx + 1;

      for (let i = 0; i < tapeLength; i++) {
        if (i === winIdx) {
          tape.push({
            id: drop.skinId,
            name: drop.name,
            weapon: drop.weapon,
            skinName: drop.skinName,
            rarity: drop.rarity,
            basePrice: drop.price,
            imageUrl: drop.imageUrl,
            dropChance: drop.dropChance,
          });
        } else if (i === baitSlot) {
          tape.push(pickNearMissBait());
        } else {
          tape.push(pickWeightedPreview());
        }
      }

      // Land near the edge of the winning card first, then snap to exact center
      const edgeDirection = Math.random() > 0.5 ? 1 : -1;
      const edgeOffset =
        edgeDirection * (CARD_WIDTH * (0.22 + Math.random() * 0.14));
      const exactCenter =
        TRACK_PADDING_LEFT +
        winIdx * STEP_PX +
        CARD_WIDTH / 2 -
        centerPoint;
      const landingOffset = exactCenter + edgeOffset;

      return {
        items: tape,
        winner: drop,
        winIndex: winIdx,
        landingOffsetPx: landingOffset,
        exactCenterOffsetPx: exactCenter,
        durationMs: baseDuration + rIdx * staggerMs,
        activeCardIndex: 2,
        isLocked: false,
      };
    });

    setSoldIds({});
    setWonDrops(res.drops);
    setReels(builtReels);
    setPhase("spinning");

    // Track state in mutable arrays for 120fps RAF loop without React re-renders during spin
    const lastCardIndices = builtReels.map(() => 2);
    const lockedFlags = builtReels.map(() => false);
    let lastSoundTime = 0;

    // Wait 1 frame so the DOM tracks are mounted before starting RAF loop
    requestAnimationFrame(() => {
      const startTime = performance.now();

      const stepFrame = (now: number) => {
        const elapsed = Math.max(0, now - startTime);

        let allDone = true;
        let lockChanged = false;

        for (let i = 0; i < builtReels.length; i++) {
          const reel = builtReels[i];
          const t = Math.min(elapsed / reel.durationMs, 1);

          if (t < 1) {
            allDone = false;
          }

          const eased = customSuspenseEasing(t);
          const currentPx = eased * reel.landingOffsetPx;

          // Directly move the DOM track for 120fps butter-smooth scrolling
          const trackEl = trackRefs.current[i];
          if (trackEl && !lockedFlags[i]) {
            trackEl.style.transition = "none";
            trackEl.style.transform = `translate3d(-${currentPx.toFixed(1)}px, 0, 0)`;
          }

          // Calculate which card is currently under the center crosshair
          const centerOnTape = currentPx + centerPoint - TRACK_PADDING_LEFT;
          const cardIdx = Math.min(
            reel.items.length - 1,
            Math.max(0, Math.floor(centerOnTape / STEP_PX))
          );

          if (cardIdx !== lastCardIndices[i]) {
            const prevIdx = lastCardIndices[i];
            lastCardIndices[i] = cardIdx;

            // O(1) direct DOM update for the 2 cards & scanner readout (zero React re-renders!)
            if (trackEl) {
              const prevCard = trackEl.children[prevIdx] as HTMLElement | undefined;
              const nextCard = trackEl.children[cardIdx] as HTMLElement | undefined;
              if (prevCard) {
                prevCard.style.transform = "scale3d(0.92, 0.92, 1)";
                prevCard.style.opacity = "0.72";
                prevCard.style.borderColor = "rgba(39, 39, 42, 0.85)";
              }
              if (nextCard) {
                const nextItem = reel.items[cardIdx];
                const nextTheme = getRarityTheme(nextItem.rarity);
                nextCard.style.transform = "scale3d(1.05, 1.05, 1)";
                nextCard.style.opacity = "1";
                nextCard.style.borderColor = nextTheme.color;

                const dotEl = scannerDotRefs.current[i];
                const weaponEl = scannerWeaponRefs.current[i];
                const skinEl = scannerSkinRefs.current[i];
                const priceEl = scannerPriceRefs.current[i];
                if (dotEl) dotEl.style.backgroundColor = nextTheme.color;
                if (weaponEl) weaponEl.textContent = nextItem.weapon;
                if (skinEl) skinEl.textContent = nextItem.skinName;
                if (priceEl) priceEl.textContent = fp(nextItem.basePrice);
              }
            }

            // Throttle sound ticks so 5 reels don't overload WebAudio
            if ((i === 0 || t > 0.78) && now - lastSoundTime > 38) {
              lastSoundTime = now;
              soundEngine.playTick(1 - t);
            }
          }

          // When this individual reel finishes, snap it to exact center of the winning card
          if (t >= 1 && !lockedFlags[i]) {
            lockedFlags[i] = true;
            lastCardIndices[i] = reel.winIndex;
            lockChanged = true;
            soundEngine.playLockIn(i);

            if (trackEl) {
              trackEl.style.transition =
                "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)";
              trackEl.style.transform = `translate3d(-${reel.exactCenterOffsetPx.toFixed(
                1
              )}px, 0, 0)`;
            }
          }
        }

        // Only update React state when a reel locks in (at most 5 times total per batch)
        if (lockChanged) {
          setReels((prev) =>
            prev.map((r, idx) => ({
              ...r,
              activeCardIndex: lastCardIndices[idx],
              isLocked: lockedFlags[idx],
            }))
          );
        }

        if (!allDone) {
          rafRef.current = requestAnimationFrame(stepFrame);
        } else {
          setPhase("locked");
          finishTimeoutRef.current = window.setTimeout(() => {
            const hasRare = res.drops!.some(
              (d) => d.rarity === "GOLD" || d.rarity === "COVERT"
            );
            soundEngine.playWin(hasRare);
            setPhase("won");
          }, 950);
        }
      };

      rafRef.current = requestAnimationFrame(stepFrame);
    });
  };

  const handleSellSingle = async (drop: WonDropResult) => {
    if (soldIds[drop.inventoryItemId] || sellingBusy) return;
    setSellingBusy(true);
    const res = await sellInventoryItems([drop.inventoryItemId]);
    if (res.ok && typeof res.newBalance === "number") {
      setBalance(res.newBalance);
      setSoldIds((prev) => ({ ...prev, [drop.inventoryItemId]: true }));
      soundEngine.playCashout();
    }
    setSellingBusy(false);
  };

  const handleSellAllWon = async () => {
    const unsold = wonDrops
      .filter((d) => !soldIds[d.inventoryItemId])
      .map((d) => d.inventoryItemId);
    if (unsold.length === 0 || sellingBusy) return;

    setSellingBusy(true);
    const res = await sellInventoryItems(unsold);
    if (res.ok && typeof res.newBalance === "number") {
      setBalance(res.newBalance);
      const nextMap: Record<string, boolean> = { ...soldIds };
      unsold.forEach((id) => {
        nextMap[id] = true;
      });
      setSoldIds(nextMap);
      soundEngine.playCashout();
    }
    setSellingBusy(false);
  };

  const unsoldTotalValue = wonDrops
    .filter((d) => !soldIds[d.inventoryItemId])
    .reduce((acc, d) => acc + d.price, 0);

  return (
    <div className="mx-auto max-w-[1540px] px-4 py-7 lg:px-8">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/90 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition hover:border-zinc-600 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 text-[#D4FF00]" />
          <span>Все кейсы</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-900 px-2.5 py-1 font-mono text-xs font-bold text-zinc-400">
            {categoryName}
          </span>
          <span className="rounded bg-[#D4FF00]/15 px-2.5 py-1 font-mono text-xs font-black text-[#D4FF00]">
            {fp(caseData.price)} / ОТКРЫТИЕ
          </span>
        </div>
      </div>

      {/* MAIN OPENING CHAMBER */}
      <div
        ref={stageRef}
        className="bg-carbon-pattern relative mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-[#111115] p-5 shadow-2xl lg:p-8"
      >
        {/* Header inside chamber */}
        <div className="relative z-10 flex flex-col items-center justify-between gap-4 border-b border-zinc-800/80 pb-5 sm:flex-row">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-display text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
                {caseData.name}
              </h1>
              {caseData.badge && (
                <span className="rounded bg-[#D4FF00] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-zinc-950">
                  {caseData.badge}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-zinc-400">{caseData.subtitle}</p>
          </div>
        </div>

        {/* 1. IDLE STATE */}
        {phase === "idle" && (
          <div className="relative z-10 my-10 flex flex-col items-center justify-center">
            <div className="relative flex h-56 w-80 items-center justify-center">
              <div
                style={{
                  background: `radial-gradient(circle at center, ${caseData.accentColor}35 0%, transparent 70%)`,
                }}
                className="pointer-events-none absolute inset-0 rounded-full blur-2xl"
              />
              <div className="pointer-events-none absolute h-44 w-44 rounded-full border border-zinc-800" />
              <div className="pointer-events-none absolute h-56 w-56 rounded-full border border-dashed border-zinc-800/60" />

              <img
                src={caseData.imageUrl}
                alt={caseData.name}
                className="animate-weapon-hover relative z-10 h-48 w-64 object-contain drop-shadow-[0_26px_34px_rgba(0,0,0,0.95)]"
              />
            </div>
          </div>
        )}

        {/* 2. SPINNING & MAGNETIC LOCK-IN STATE */}
        {(phase === "spinning" || phase === "locked") && (
          <div className="relative z-10 my-6 space-y-5">
            {reels.map((reel, rIdx) => {
              const activeItem =
                reel.items[reel.activeCardIndex] || reel.items[0];
              const activeTheme = getRarityTheme(activeItem.rarity);

              return (
                <div key={rIdx} className="space-y-0">
                  {/* Live Optical Scanner Readout above each reel (driven by DOM refs at 120fps) */}
                  <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-zinc-800 bg-[#09090B] px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span
                        ref={(el) => {
                          scannerDotRefs.current[rIdx] = el;
                        }}
                        style={{ backgroundColor: activeTheme.color }}
                        className="h-3 w-3 rounded-sm"
                      />
                      <span
                        ref={(el) => {
                          scannerWeaponRefs.current[rIdx] = el;
                        }}
                        className="font-mono text-xs font-bold uppercase text-zinc-400"
                      >
                        {activeItem.weapon}
                      </span>
                      <span
                        ref={(el) => {
                          scannerSkinRefs.current[rIdx] = el;
                        }}
                        className="text-xs font-black text-white"
                      >
                        {activeItem.skinName}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        ref={(el) => {
                          scannerPriceRefs.current[rIdx] = el;
                        }}
                        className="font-mono text-xs font-black text-[#D4FF00]"
                      >
                        {fp(activeItem.basePrice)}
                      </span>
                      {reel.isLocked && (
                        <span className="rounded bg-[#D4FF00] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-zinc-950">
                          LOCKED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Drum Viewport */}
                  <div
                    className={`relative h-[200px] w-full overflow-hidden rounded-b-xl border bg-[#070709] transition-colors duration-300 ${
                      reel.isLocked
                        ? "border-[#D4FF00] shadow-[0_0_32px_rgba(212,255,0,0.14)]"
                        : "border-zinc-800"
                    }`}
                  >
                    {/* Deep Side Vignettes */}
                    <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-36 bg-gradient-to-r from-[#070709] via-[#070709]/85 to-transparent" />
                    <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-36 bg-gradient-to-l from-[#070709] via-[#070709]/85 to-transparent" />

                    {/* Center Optical Magnifier Frame & Laser Crosshair */}
                    <div className="pointer-events-none absolute inset-y-2 left-1/2 z-30 flex w-[208px] -translate-x-1/2 flex-col justify-between rounded-xl border-2 border-[#D4FF00]">
                      <div className="mx-auto -mt-1.5 h-3 w-6 rounded-b bg-[#D4FF00]" />
                      <div className="mx-auto h-full w-[1px] bg-[#D4FF00]/40" />
                      <div className="mx-auto -mb-1.5 h-3 w-6 rounded-t bg-[#D4FF00]" />
                    </div>

                    {/* Moving Drum Track driven directly by trackRefs at 120fps */}
                    <div
                      ref={(el) => {
                        trackRefs.current[rIdx] = el;
                      }}
                      className="flex h-full items-center gap-[12px] px-6 transform-gpu will-change-transform"
                    >
                      {reel.items.map((item, idx) => {
                        const theme = getRarityTheme(item.rarity);
                        const isCenterCard = idx === reel.activeCardIndex;
                        const isDimmed = reel.isLocked && idx !== reel.winIndex;

                        return (
                          <div
                            key={idx}
                            style={{
                              width: `${CARD_WIDTH}px`,
                              borderColor: isCenterCard
                                ? theme.color
                                : "rgba(39, 39, 42, 0.85)",
                              background: `linear-gradient(180deg, #111116 0%, ${theme.bgGlow} 165%)`,
                              transform: isCenterCard
                                ? "scale3d(1.05, 1.05, 1)"
                                : "scale3d(0.92, 0.92, 1)",
                              opacity: isDimmed
                                ? 0.18
                                : isCenterCard
                                ? 1
                                : 0.72,
                            }}
                            className="relative flex h-[172px] shrink-0 flex-col justify-between overflow-hidden rounded-xl border p-3.5 transform-gpu"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                                {item.weapon}
                              </span>
                              <span className="font-mono text-[11px] font-black text-white">
                                {fp(item.basePrice)}
                              </span>
                            </div>

                            <div className="my-1 flex h-24 items-center justify-center">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                decoding="async"
                                className="h-20 w-36 object-contain"
                              />
                            </div>

                            <div className="truncate text-xs font-black text-white">
                              {item.skinName}
                            </div>

                            <div
                              style={{ backgroundColor: theme.color }}
                              className="absolute bottom-0 left-0 right-0 h-[4px]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. WON SHOWCASE STATE */}
        {phase === "won" && (
          <div className="relative z-10 my-8">
            <div className="mb-5 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-lg border border-[#D4FF00]/40 bg-[#D4FF00]/10 px-4 py-1.5 font-mono text-xs font-black uppercase text-[#D4FF00]">
                <Sparkles className="h-4 w-4" />
                <span>
                  ВЫПАЛО НА СУММУ{" "}
                  {fp(wonDrops.reduce((s, d) => s + d.price, 0))}
                </span>
              </div>
            </div>

            <div
              className={`mx-auto grid gap-4 ${
                wonDrops.length === 1
                  ? "max-w-sm grid-cols-1"
                  : wonDrops.length === 2
                  ? "max-w-2xl grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
              }`}
            >
              {wonDrops.map((drop) => {
                const theme = getRarityTheme(drop.rarity);
                const isSold = !!soldIds[drop.inventoryItemId];

                return (
                  <div
                    key={drop.inventoryItemId}
                    style={{
                      borderColor: theme.color,
                      background: `radial-gradient(circle at 50% 60%, ${theme.bgGlow} 0%, #121218 78%)`,
                    }}
                    className="relative flex flex-col justify-between overflow-hidden rounded-2xl border-2 p-5 shadow-2xl"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {drop.isStatTrak && (
                          <span className="rounded bg-orange-500/20 px-1.5 py-0.5 font-mono text-[10px] font-black text-orange-400">
                            ST™
                          </span>
                        )}
                        <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-200">
                          {drop.wear}
                        </span>
                      </div>
                      <span className="font-mono text-base font-black text-[#D4FF00]">
                        {fp(drop.price)}
                      </span>
                    </div>

                    <div className="my-5 flex h-36 items-center justify-center">
                      <img
                        src={drop.imageUrl}
                        alt={drop.name}
                        className="animate-weapon-hover h-32 w-48 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.95)]"
                      />
                    </div>

                    <div>
                      <div className="font-mono text-xs font-bold uppercase text-zinc-400">
                        {drop.weapon}
                      </div>
                      <div className="truncate font-display text-lg font-black text-white">
                        {drop.skinName}
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-zinc-400">
                        Float: {drop.floatValue.toFixed(6)}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          disabled={isSold || sellingBusy}
                          onClick={() => handleSellSingle(drop)}
                          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 font-mono text-xs font-black uppercase transition ${
                            isSold
                              ? "bg-zinc-800 text-zinc-400"
                              : "bg-[#D4FF00] text-zinc-950 hover:bg-[#e2ff44]"
                          }`}
                        >
                          {isSold ? (
                            <>
                              <Check className="h-4 w-4" />
                              <span>Продано</span>
                            </>
                          ) : (
                            <>
                              <Coins className="h-4 w-4" />
                              <span>{fp(drop.price)}</span>
                            </>
                          )}
                        </button>

                        {!isSold && (
                          <Link
                            href={`/upgrader?item=${drop.inventoryItemId}`}
                            className="flex items-center justify-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 font-mono text-xs font-black uppercase text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
                          >
                            <Flame className="h-3.5 w-3.5 text-[#D4FF00]" />
                            <span>Апгрейд</span>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="relative z-10 mx-auto mb-4 max-w-md rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-center text-xs font-bold text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* CONTROLS BAR */}
        <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-zinc-800/80 pt-6">
          {/* Multiplier 1x..5x */}
          <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-[#09090B] p-1">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                disabled={phase === "spinning" || phase === "locked"}
                onClick={() => setOpenCount(num)}
                className={`h-11 w-12 rounded-lg font-mono text-xs font-black transition ${
                  openCount === num
                    ? "bg-[#D4FF00] text-zinc-950"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                x{num}
              </button>
            ))}
          </div>

          {/* Open Button */}
          <button
            disabled={phase === "spinning" || phase === "locked"}
            onClick={handleOpenCase}
            className="flex h-13 items-center gap-2.5 rounded-xl bg-[#D4FF00] px-9 py-3.5 text-xs font-black uppercase tracking-wider text-zinc-950 shadow-[0_0_30px_rgba(212,255,0,0.25)] transition hover:bg-[#e2ff44] disabled:opacity-50"
          >
            {phase === "won" ? (
              <>
                <RotateCcw className="h-4 w-4 stroke-[2.5]" />
                <span>Крутить ещё • {fp(totalCost)}</span>
              </>
            ) : (
              <>
                <Flame className="h-4 w-4 stroke-[2.5]" />
                <span>
                  {phase === "spinning" || phase === "locked"
                    ? "Идёт прокрутка..."
                    : `Открыть за ${fp(totalCost)}`}
                </span>
              </>
            )}
          </button>

          {/* Sell All Won */}
          {phase === "won" && unsoldTotalValue > 0 && wonDrops.length > 1 && (
            <button
              disabled={sellingBusy}
              onClick={handleSellAllWon}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 px-5 py-3.5 font-mono text-xs font-black uppercase text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
            >
              <Coins className="h-4 w-4" />
              <span>Продать всё ({fp(unsoldTotalValue)})</span>
            </button>
          )}

          {/* Fast Spin Toggle */}
          <button
            disabled={phase === "spinning" || phase === "locked"}
            onClick={() => setFastMode(!fastMode)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3.5 text-xs font-black uppercase tracking-wider transition ${
              fastMode
                ? "border-[#D4FF00] bg-[#D4FF00]/15 text-[#D4FF00]"
                : "border-zinc-800 bg-[#09090B] text-zinc-400 hover:text-white"
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Быстро</span>
          </button>
        </div>
      </div>

      {/* CASE CONTENTS GRID */}
      <div className="mt-12">
        <div className="mb-5 flex items-baseline justify-between border-b border-zinc-800/80 pb-3">
          <h2 className="font-display text-lg font-black uppercase tracking-wide text-white">
            Состав кейса ({sortedContents.length} скинов)
          </h2>
          <span className="font-mono text-xs text-zinc-500">
            Отсортировано по стоимости
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {sortedContents.map((skin) => {
            const theme = getRarityTheme(skin.rarity);
            return (
              <div
                key={skin.id}
                style={{
                  background: `linear-gradient(180deg, #121217 0%, ${theme.bgGlow} 160%)`,
                }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800/90 p-4 transition hover:-translate-y-1 hover:border-zinc-600"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-zinc-900/90 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-300">
                    {skin.dropChance.toFixed(2)}%
                  </span>
                  <span className="font-mono text-xs font-black text-white">
                    {fp(skin.basePrice)}
                  </span>
                </div>

                <div className="my-4 flex h-28 items-center justify-center">
                  <img
                    src={skin.imageUrl}
                    alt={skin.name}
                    className="h-24 w-36 object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,0.9)] transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                <div>
                  <div className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                    {skin.weapon}
                  </div>
                  <div className="truncate text-sm font-black text-white">
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
  );
}
