"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Check,
  Coins,
  Eye,
  Flame,
  RotateCw,
  Sparkles,
  Tag,
  X,
  ZoomIn,
} from "lucide-react";
import { getRarityTheme, useFormatPrice } from "@/lib/rarity";
import {
  calculateSkinExactPrice,
  CS2_WEAR_TIERS,
  getWearInfo,
  parseCaseAndNameTag,
  STATTRAK_MULTIPLIER,
} from "@/lib/wear";
import { renameInventoryItemAction } from "@/app/actions/case";
import { soundEngine } from "@/lib/sound";

export interface InspectableSkinItem {
  id: string;
  wear: string;
  floatValue: number;
  isStatTrak: boolean;
  price: number;
  obtainedFrom?: string;
  caseName?: string | null;
  skin: {
    id?: string;
    name: string;
    weapon: string;
    skinName: string;
    rarity: string;
    basePrice?: number;
    imageUrl: string;
  };
}

interface SkinInspectorModalProps {
  item: InspectableSkinItem;
  onClose: () => void;
  onSell?: (id: string) => void;
  onRenamed?: (id: string, newCaseName: string) => void;
}

export default function SkinInspectorModal({
  item,
  onClose,
  onSell,
  onRenamed,
}: SkinInspectorModalProps) {
  const { fp } = useFormatPrice();
  const theme = getRarityTheme(item.skin.rarity);
  const wearInfo = getWearInfo(item.wear);
  const { originSource, nameTag: initialNameTag } = parseCaseAndNameTag(
    item.caseName
  );

  // Estimate basePrice if not explicitly passed on skin object
  const estimatedBasePrice =
    item.skin.basePrice ||
    Number(
      (
        item.price /
        (wearInfo.priceMultiplier *
          (item.isStatTrak ? STATTRAK_MULTIPLIER : 1))
      ).toFixed(2)
    );

  const priceBreakdown = calculateSkinExactPrice({
    basePrice: estimatedBasePrice,
    wear: item.wear,
    floatValue: item.floatValue,
    isStatTrak: item.isStatTrak,
  });

  // 3D / 360 Interactive Stage State
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({
    rx: 0,
    ry: 0,
  });
  const [angle360, setAngle360] = useState<number>(0);
  const [autoSpin, setAutoSpin] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.15);

  // Name Tag State
  const [nameTagInput, setNameTagInput] = useState<string>(
    initialNameTag || ""
  );
  const [savedTag, setSavedTag] = useState<string | null>(initialNameTag);
  const [tagSavedToast, setTagSavedToast] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Pattern seed derived deterministically from item ID & float
  const patternSeed =
    (Math.round(item.floatValue * 1000000) +
      item.id.charCodeAt(item.id.length - 1) * 17) %
      999 +
    1;

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Number((-y * 28).toFixed(2)),
      ry: Number((x * 36).toFixed(2)),
    });
  };

  const handleSaveNameTag = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await renameInventoryItemAction(item.id, nameTagInput);
      if (res.ok && typeof res.newCaseName === "string") {
        setSavedTag(nameTagInput.trim() || null);
        setTagSavedToast(true);
        soundEngine.playCashout();
        if (onRenamed) {
          onRenamed(item.id, res.newCaseName);
        }
        setTimeout(() => setTagSavedToast(false), 2500);
      }
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-zinc-800 bg-[#0E0E13] p-6 shadow-2xl lg:p-8"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 z-20 rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition hover:border-zinc-600 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid gap-6 lg:grid-cols-12">
          {/* LEFT 7 COLS: 360° / 3D HOLOGRAPHIC INSPECTION CHAMBER */}
          <div className="flex flex-col justify-between rounded-2xl border border-zinc-800/90 bg-[#08080B] p-6 lg:col-span-7">
            {/* Top Chamber Readout */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  style={{
                    backgroundColor: `${theme.color}22`,
                    color: theme.color,
                    borderColor: `${theme.color}55`,
                  }}
                  className="rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-black uppercase"
                >
                  {theme.label}
                </span>

                {item.isStatTrak && (
                  <span className="rounded-md border border-orange-500/40 bg-orange-500/15 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-orange-400">
                    StatTrak™ (+35%)
                  </span>
                )}

                <span
                  style={{
                    color: wearInfo.color,
                    borderColor: `${wearInfo.color}40`,
                  }}
                  className="rounded-md border bg-zinc-900 px-2.5 py-0.5 font-mono text-[10px] font-bold"
                >
                  {wearInfo.code} • {wearInfo.nameRu}
                </span>
              </div>

              <span className="font-mono text-xs text-zinc-500">
                Pattern Seed: <strong className="text-white">#{patternSeed}</strong>
              </span>
            </div>

            {/* Interactive 3D / 360° Stage */}
            <div
              onMouseMove={handleStageMouseMove}
              onMouseLeave={() => setTilt({ rx: 0, ry: 0 })}
              style={{
                perspective: "1100px",
                background: `radial-gradient(circle at ${
                  50 + tilt.ry
                }% ${50 - tilt.rx}%, ${theme.color}35 0%, transparent 68%)`,
              }}
              className="relative my-4 flex h-[300px] cursor-grab select-none items-center justify-center overflow-hidden rounded-2xl border border-zinc-800/60 bg-[#0B0B0F] active:cursor-grabbing sm:h-[340px]"
            >
              {/* Subtle Tactical Grid Rings */}
              <div className="pointer-events-none absolute h-64 w-64 rounded-full border border-zinc-800/60" />
              <div className="pointer-events-none absolute h-80 w-80 rounded-full border border-dashed border-zinc-800/40" />

              <div
                style={{
                  transform: `rotateX(${tilt.rx}deg) rotateY(${
                    tilt.ry + angle360
                  }deg) scale(${zoom})`,
                  transition: autoSpin
                    ? "transform 80ms linear"
                    : "transform 140ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                className="relative z-10 flex flex-col items-center"
              >
                <img
                  src={item.skin.imageUrl}
                  alt={item.skin.name}
                  className={`h-52 w-80 object-contain drop-shadow-[0_28px_36px_rgba(0,0,0,0.95)] ${
                    autoSpin ? "animate-pulse" : ""
                  }`}
                />
              </div>

              {/* Metallic CS2 Name Tag Plate if attached */}
              {savedTag && (
                <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-amber-400/50 bg-zinc-950/95 px-3.5 py-1 shadow-lg">
                  <Tag className="h-3 w-3 text-[#D4FF00]" />
                  <span className="font-mono text-xs font-black tracking-wide text-[#D4FF00]">
                    «{savedTag}»
                  </span>
                </div>
              )}

              <div className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] text-zinc-500">
                Двигай мышкой для 3D-осмотра
              </div>
            </div>

            {/* 360° Rotation & Zoom Controls */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-800 bg-[#111116] p-3.5 sm:grid-cols-2">
              <div>
                <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <RotateCw className="h-3 w-3 text-[#D4FF00]" />
                    Поворот 360°:
                  </span>
                  <span className="font-bold text-white">{angle360}°</span>
                </div>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={angle360}
                  onChange={(e) => setAngle360(Number(e.target.value))}
                  className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-[#D4FF00]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between font-mono text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="h-3 w-3 text-[#D4FF00]" />
                    Приближение HD:
                  </span>
                  <span className="font-bold text-white">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.85}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-[#D4FF00]"
                />
              </div>
            </div>

            {/* CS2 WEAR FLOAT SPECTRUM BAR (0.00 - 1.00) */}
            <div className="mt-4 rounded-xl border border-zinc-800 bg-[#111116] p-4">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="font-bold uppercase text-zinc-400">
                  Шкала износа (Float Value):
                </span>
                <div className="flex items-center gap-2">
                  {priceBreakdown.lowFloatBonusMult > 1 && (
                    <span className="rounded bg-[#D4FF00]/20 px-2 py-0.5 text-[10px] font-black text-[#D4FF00]">
                      РЕДКИЙ FLOAT +{Math.round((priceBreakdown.lowFloatBonusMult - 1) * 100)}%
                    </span>
                  )}
                  <span className="font-black text-[#D4FF00]">
                    {item.floatValue.toFixed(6)}
                  </span>
                </div>
              </div>

              {/* 5-segment CS2 float bar */}
              <div className="relative mt-3 h-3 w-full overflow-visible rounded-full bg-zinc-900 flex">
                <div
                  style={{ width: "7%", backgroundColor: "#10B981" }}
                  className="h-full rounded-l-full"
                  title="FN: 0.00 - 0.07"
                />
                <div
                  style={{ width: "8%", backgroundColor: "#38BDF8" }}
                  className="h-full"
                  title="MW: 0.07 - 0.15"
                />
                <div
                  style={{ width: "23%", backgroundColor: "#FACC15" }}
                  className="h-full"
                  title="FT: 0.15 - 0.38"
                />
                <div
                  style={{ width: "7%", backgroundColor: "#FB923C" }}
                  className="h-full"
                  title="WW: 0.38 - 0.45"
                />
                <div
                  style={{ width: "55%", backgroundColor: "#F43F5E" }}
                  className="h-full rounded-r-full"
                  title="BS: 0.45 - 1.00"
                />

                {/* Exact Pin */}
                <div
                  style={{
                    left: `${Math.min(99, Math.max(1, item.floatValue * 100))}%`,
                  }}
                  className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_#D4FF00] ring-2 ring-[#D4FF00]"
                />
              </div>

              <div className="mt-1.5 flex justify-between font-mono text-[9px] text-zinc-500">
                <span>0.00 FN</span>
                <span>0.07 MW</span>
                <span>0.15 FT</span>
                <span>0.38 WW</span>
                <span>0.45 BS</span>
                <span>1.00</span>
              </div>
            </div>
          </div>

          {/* RIGHT 5 COLS: WEAR PRICING TABLE, NAME TAG & ACTIONS */}
          <div className="flex flex-col justify-between space-y-4 lg:col-span-5">
            <div className="space-y-4">
              {/* Weapon Title & Price */}
              <div className="rounded-2xl border border-zinc-800 bg-[#111116] p-5">
                <div className="font-mono text-xs font-bold uppercase text-zinc-400">
                  {item.skin.weapon} • Источник: {originSource}
                </div>
                <h2 className="mt-0.5 font-display text-2xl font-black uppercase text-white sm:text-3xl">
                  {item.skin.skinName}
                </h2>

                <div className="mt-4 flex items-baseline justify-between border-t border-zinc-800 pt-3">
                  <span className="font-mono text-xs uppercase text-zinc-400">
                    Точная стоимость твоего экземпляра:
                  </span>
                  <span className="font-mono text-2xl font-black text-[#D4FF00]">
                    {fp(item.price)}
                  </span>
                </div>
              </div>

              {/* Price Table by Wear Quality (FN -> BS) */}
              <div className="rounded-2xl border border-zinc-800 bg-[#111116] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-xs font-black uppercase text-white">
                    Цены по качеству производства:
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">
                    {item.isStatTrak ? "С учётом StatTrak™" : "Обычная версия"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {CS2_WEAR_TIERS.map((tier) => {
                    const isCurrent = tier.code === item.wear;
                    const tierPrice = calculateSkinExactPrice({
                      basePrice: estimatedBasePrice,
                      wear: tier.code,
                      floatValue: isCurrent ? item.floatValue : tier.minFloat + 0.02,
                      isStatTrak: item.isStatTrak,
                    }).finalPrice;

                    return (
                      <div
                        key={tier.code}
                        className={`flex items-center justify-between rounded-xl border px-3.5 py-2 font-mono text-xs ${
                          isCurrent
                            ? "border-[#D4FF00] bg-[#D4FF00]/15 text-white"
                            : "border-zinc-800/80 bg-[#09090B] text-zinc-400"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            style={{ color: tier.color }}
                            className="w-7 font-black"
                          >
                            {tier.code}
                          </span>
                          <span className="text-[11px]">{tier.nameRu}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-zinc-500">
                            ×{tier.priceMultiplier}
                          </span>
                          <span
                            className={`font-black ${
                              isCurrent ? "text-[#D4FF00]" : "text-zinc-200"
                            }`}
                          >
                            {fp(tierPrice)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Name Tag Workshop */}
              <form
                onSubmit={handleSaveNameTag}
                className="rounded-2xl border border-zinc-800 bg-[#111116] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs font-black uppercase text-[#D4FF00]">
                    <Tag className="h-3.5 w-3.5" />
                    <span>Именной ярлык (Name Tag)</span>
                  </span>
                  {tagSavedToast && (
                    <span className="font-mono text-[10px] font-bold text-emerald-400">
                      Сохранено!
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex gap-2">
                  <input
                    type="text"
                    maxLength={24}
                    value={nameTagInput}
                    onChange={(e) => setNameTagInput(e.target.value)}
                    placeholder="Напр.: «VIPERR DRAGON»"
                    className="w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2 font-mono text-xs font-bold text-white placeholder-zinc-600 focus:border-[#D4FF00] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-[#D4FF00] px-4 py-2 font-mono text-xs font-black uppercase text-zinc-950 transition hover:bg-[#e3ff4d]"
                  >
                    Нанести
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {onSell && (
                <button
                  type="button"
                  onClick={() => {
                    onSell(item.id);
                    onClose();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 py-3.5 font-mono text-xs font-black uppercase text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
                >
                  <Coins className="h-4 w-4 text-[#D4FF00]" />
                  <span>Продать за {fp(item.price)}</span>
                </button>
              )}

              <Link
                href={`/upgrader?item=${item.id}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#D4FF00] py-3.5 font-mono text-xs font-black uppercase text-zinc-950 transition hover:bg-[#e2ff33]"
              >
                <Flame className="h-4 w-4" />
                <span>Закинуть в Апгрейдер</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
