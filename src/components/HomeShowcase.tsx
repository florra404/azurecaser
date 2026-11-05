"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Compass,
  Crown,
  Crosshair,
  Flame,
  Gamepad2,
  Gift,
  Layers,
  Search,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Swords,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import CaseVaultCard, { CaseCardData } from "./CaseVaultCard";
import { getRarityTheme, useFormatPrice } from "@/lib/rarity";
import { sellInventoryItems } from "@/app/actions/case";
import { claimDailyStreakBonusAction } from "@/app/actions/retention";
import { useAppStore } from "@/lib/store";
import { soundEngine } from "@/lib/sound";

export interface CategoryWithCases {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  icon: string;
  accentColor: string;
  cases: CaseCardData[];
}

export interface StarterInventoryItem {
  id: string;
  wear: string;
  floatValue: number;
  isStatTrak: boolean;
  price: number;
  caseName: string | null;
  skin: {
    name: string;
    weapon: string;
    skinName: string;
    rarity: string;
    imageUrl: string;
  };
}

interface HomeShowcaseProps {
  categories: CategoryWithCases[];
  inventoryPreview: StarterInventoryItem[];
  totalSkinsCount: number;
}

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Flame,
  Snowflake,
  Zap,
  Swords,
  Crown,
  Crosshair,
  Sparkles,
};

export default function HomeShowcase({
  categories,
  inventoryPreview,
  totalSkinsCount,
}: HomeShowcaseProps) {
  const router = useRouter();
  const [heroTab, setHeroTab] = useState<"olympus" | "grind" | "knife">(
    "olympus"
  );
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priceFilter, setPriceFilter] = useState<string>("all");
  const [items, setItems] = useState<StarterInventoryItem[]>(inventoryPreview);
  const [streakBanner, setStreakBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { setBalance } = useAppStore();
  const { fp } = useFormatPrice();

  const allCasesFlat = useMemo(
    () => categories.flatMap((c) => c.cases),
    [categories]
  );
  const totalCasesCount = allCasesFlat.length;

  // Pick spotlight cases for the interactive 3-mode Hero Switcher
  const olympusCase =
    allCasesFlat.find((c) => c.slug === "olympus-souvenir-dlore-kato") ||
    allCasesFlat[allCasesFlat.length - 1];
  const grindCase =
    allCasesFlat.find((c) => c.slug === "rusty-scrap-box") || allCasesFlat[0];
  const knifeCase =
    allCasesFlat.find((c) => c.slug === "emerald-butterfly") ||
    allCasesFlat[Math.floor(allCasesFlat.length / 2)];

  const activeHeroCase =
    heroTab === "olympus"
      ? olympusCase
      : heroTab === "grind"
      ? grindCase
      : knifeCase;

  const olympusCategory = categories.find(
    (c) => c.slug === "billionaire-olympus"
  );

  const handleQuickSell = (id: string) => {
    startTransition(async () => {
      const res = await sellInventoryItems([id]);
      if (res.ok && typeof res.newBalance === "number") {
        setBalance(res.newBalance);
        setItems((prev) => prev.filter((item) => item.id !== id));
        soundEngine.playCashout();
      }
    });
  };

  const handleQuickStreakClaim = () => {
    startTransition(async () => {
      const res = await claimDailyStreakBonusAction();
      if (!res.ok) {
        setStreakBanner(res.error || "Стрик перезаряжается");
        return;
      }
      if (typeof res.newBalance === "number") {
        setBalance(res.newBalance);
      }
      soundEngine.playWin(true);
      setStreakBanner(
        `Стрик-бонус Дня #${res.claimedDay} зачислен: +${fp(
          res.rewardUsd || 0
        )} и +${res.rewardXp} XP!`
      );
      router.refresh();
    });
  };

  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => activeCategory === "all" || cat.slug === activeCategory)
      .map((cat) => {
        const matchingCases = cat.cases.filter((cs) => {
          const q = searchQuery.trim().toLowerCase();
          const matchesQuery =
            !q ||
            cs.name.toLowerCase().includes(q) ||
            cs.subtitle.toLowerCase().includes(q) ||
            cs.items.some((item) => item.name.toLowerCase().includes(q));

          let matchesPrice = true;
          if (priceFilter === "grind") matchesPrice = cs.price <= 1.0;
          if (priceFilter === "budget")
            matchesPrice = cs.price > 1.0 && cs.price <= 15;
          if (priceFilter === "mid")
            matchesPrice = cs.price > 15 && cs.price <= 120;
          if (priceFilter === "high")
            matchesPrice = cs.price > 120 && cs.price <= 1500;
          if (priceFilter === "olympus") matchesPrice = cs.price > 1500;

          return matchesQuery && matchesPrice;
        });

        return {
          ...cat,
          cases: matchingCases,
        };
      })
      .filter((cat) => cat.cases.length > 0);
  }, [categories, activeCategory, searchQuery, priceFilter]);

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-6 lg:px-8">
      {/* =====================================================================
          1. CYBER COMMAND CENTER BENTO HERO (COMPLETELY REDESIGNED)
      ===================================================================== */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Flagship Interactive Case Terminal (7 cols) */}
        <div className="bg-carbon-pattern relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-800 bg-[#101015] p-6 shadow-2xl lg:col-span-7 lg:p-8">
          <div
            style={{
              background: `radial-gradient(circle at 75% 40%, ${
                activeHeroCase?.accentColor || "#D4FF00"
              }28 0%, transparent 65%)`,
            }}
            className="pointer-events-none absolute inset-0"
          />

          {/* Top Mode Switcher Pills */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-zinc-800 bg-[#09090C]/90 p-1">
              <button
                onClick={() => setHeroTab("olympus")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[10px] font-black uppercase transition ${
                  heroTab === "olympus"
                    ? "bg-[#D4FF00] text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Crown className="h-3.5 w-3.5" />
                <span>Олимп $250,000</span>
              </button>
              <button
                onClick={() => setHeroTab("grind")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[10px] font-black uppercase transition ${
                  heroTab === "grind"
                    ? "bg-rose-500 text-white"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Flame className="h-3.5 w-3.5" />
                <span>Хардкор с $0.18</span>
              </button>
              <button
                onClick={() => setHeroTab("knife")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[10px] font-black uppercase transition ${
                  heroTab === "knife"
                    ? "bg-emerald-400 text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Swords className="h-3.5 w-3.5" />
                <span>Ножевой Сейф</span>
              </button>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-zinc-400">
              <span className="rounded-md border border-zinc-800 bg-[#09090C] px-2.5 py-1 text-[#D4FF00]">
                {totalSkinsCount} СКИНОВ В БАЗЕ
              </span>
              <span className="rounded-md border border-zinc-800 bg-[#09090C] px-2.5 py-1 text-white">
                {totalCasesCount} КЕЙСА
              </span>
            </div>
          </div>

          {/* Center Hero Content */}
          {activeHeroCase && (
            <div className="relative z-10 my-6 grid items-center gap-6 sm:grid-cols-12">
              <div className="sm:col-span-7">
                <div className="inline-flex items-center gap-1.5 rounded-md border border-[#D4FF00]/40 bg-[#D4FF00]/10 px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider text-[#D4FF00]">
                  <Sparkles className="h-3 w-3" />
                  <span>
                    {heroTab === "olympus"
                      ? "МИРОВОЙ ЭКСКЛЮЗИВ • ОЛИМП МИЛЛИАРДЕРОВ"
                      : heroTab === "grind"
                      ? "ХАРДКОР ГРИНД СИМУЛЯТОР • СТАРТ С НУЛЯ"
                      : "100% НОЖЕВОЙ И ПЕРЧАТОЧНЫЙ ТИР"}
                  </span>
                </div>

                <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-5xl lg:leading-[1.02]">
                  {activeHeroCase.name}
                </h1>
                <p className="mt-2 text-xs text-zinc-400 sm:text-sm">
                  {activeHeroCase.subtitle}. Открывай до 5 кейсов одновременно
                  на 120 FPS без лагов, проверяй 360° Float и выполняй боевые
                  контракты!
                </p>

                {/* Top 3 skins inside the featured hero case */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[...activeHeroCase.items]
                    .sort((a, b) => b.basePrice - a.basePrice)
                    .slice(0, 3)
                    .map((sk) => {
                      const th = getRarityTheme(sk.rarity);
                      return (
                        <div
                          key={sk.id}
                          style={{ borderColor: `${th.color}55` }}
                          className="rounded-xl border bg-[#09090C]/90 p-2.5"
                        >
                          <div className="truncate font-mono text-[9px] text-zinc-400">
                            {sk.weapon}
                          </div>
                          <div className="truncate text-xs font-black text-white">
                            {sk.skinName}
                          </div>
                          <div className="mt-1 font-mono text-xs font-black text-[#D4FF00]">
                            {fp(sk.basePrice)}
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/case/${activeHeroCase.slug}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#D4FF00] px-7 py-4 font-display text-xs font-black uppercase tracking-wider text-zinc-950 shadow-[0_0_30px_rgba(212,255,0,0.3)] transition hover:scale-[1.02] hover:bg-[#e2ff44]"
                  >
                    <span>
                      Открыть за {fp(activeHeroCase.price)}
                    </span>
                    <ArrowRight className="h-4 w-4 stroke-[2.5]" />
                  </Link>
                  <Link
                    href="/earn"
                    className="inline-flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900/90 px-5 py-4 font-mono text-xs font-black uppercase text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
                  >
                    <Gamepad2 className="h-4 w-4 text-[#D4FF00]" />
                    <span>Фармить в мини-играх</span>
                  </Link>
                </div>
              </div>

              <div className="relative flex items-center justify-center sm:col-span-5">
                <div className="pointer-events-none absolute h-48 w-48 rounded-full border border-dashed border-[#D4FF00]/30" />
                <img
                  src={activeHeroCase.imageUrl}
                  alt={activeHeroCase.name}
                  className="animate-weapon-hover relative z-10 h-52 w-72 object-contain drop-shadow-[0_26px_34px_rgba(0,0,0,0.95)]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Retention Hub + Ecosystem Teleporters (5 cols) */}
        <div className="grid gap-4 lg:col-span-5">
          {/* Card A: Daily Wheel of Fortune & Mercenary Missions Hub */}
          <div className="bg-carbon-pattern relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[#D4FF00]/40 bg-[#12140D] p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded bg-[#D4FF00] px-2 py-0.5 font-mono text-[9px] font-black uppercase text-zinc-950">
                  <Compass className="h-3 w-3" />
                  <span>ГИГАНТСКАЯ ОБНОВА • УДЕРЖАНИЕ</span>
                </div>
                <h2 className="mt-2 font-display text-2xl font-black uppercase text-white">
                  КОЛЕСО ФОРТУНЫ И 12 МИССИЙ
                </h2>
                <p className="mt-1 text-xs text-zinc-300">
                  Крути бесплатное Колесо каждые 90 секунд, забирай скины прямо в
                  инвентарь и выполняй контракты наёмника!
                </p>
              </div>
              <Trophy className="h-10 w-10 shrink-0 text-[#D4FF00]" />
            </div>

            {streakBanner && (
              <div className="mt-3 rounded-xl border border-[#D4FF00]/50 bg-[#09090B] px-3.5 py-2 font-mono text-[11px] font-bold text-[#D4FF00]">
                {streakBanner}
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <Link
                href="/missions"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#D4FF00] py-3 font-mono text-xs font-black uppercase text-zinc-950 shadow-[0_0_20px_rgba(212,255,0,0.25)] transition hover:bg-[#e3ff4d]"
              >
                <Compass className="h-4 w-4" />
                <span>Колесо и Миссии →</span>
              </Link>
              <button
                type="button"
                disabled={isPending}
                onClick={handleQuickStreakClaim}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-[#D4FF00]/50 bg-[#09090B] py-3 font-mono text-xs font-black uppercase text-[#D4FF00] transition hover:bg-[#D4FF00] hover:text-zinc-950"
              >
                <Gift className="h-4 w-4" />
                <span>Забрать Стрик Дня</span>
              </button>
            </div>
          </div>

          {/* Card B: 3 Quick Mode Teleporters (Grind / Upgrader / Contracts) */}
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/earn"
              className="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#101015] p-4 transition hover:border-rose-500/60"
            >
              <Gamepad2 className="h-6 w-6 text-rose-400 transition-transform group-hover:scale-110" />
              <div className="mt-3">
                <div className="font-mono text-[9px] font-bold uppercase text-rose-400">
                  С НУЛЯ ОТ $0.02
                </div>
                <div className="font-display text-sm font-black uppercase text-white">
                  Хардкор Гринд
                </div>
              </div>
            </Link>

            <Link
              href="/upgrader"
              className="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#101015] p-4 transition hover:border-[#D4FF00]/60"
            >
              <Flame className="h-6 w-6 text-[#D4FF00] transition-transform group-hover:scale-110" />
              <div className="mt-3">
                <div className="font-mono text-[9px] font-bold uppercase text-[#D4FF00]">
                  МНОЖИТЕЛИ ДО x20
                </div>
                <div className="font-display text-sm font-black uppercase text-white">
                  Апгрейдер PRO
                </div>
              </div>
            </Link>

            <Link
              href="/contracts"
              className="group flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#101015] p-4 transition hover:border-cyan-400/60"
            >
              <Layers className="h-6 w-6 text-cyan-400 transition-transform group-hover:scale-110" />
              <div className="mt-3">
                <div className="font-mono text-[9px] font-bold uppercase text-cyan-400">
                  КРАФТ ДО 10 СКИНОВ
                </div>
                <div className="font-display text-sm font-black uppercase text-white">
                  Контракты CS2
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. BILLIONAIRE OLYMPUS GRAIL STRIP ($24,500 – $250,000 SKINS)
      ===================================================================== */}
      {olympusCategory && olympusCategory.cases.length > 0 && (
        <div className="mt-7 rounded-3xl border border-amber-400/30 bg-gradient-to-r from-[#17130A] via-[#111115] to-[#17130A] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-zinc-950">
                <Crown className="h-4 w-4" />
              </span>
              <div>
                <h2 className="font-display text-lg font-black uppercase tracking-wide text-white">
                  ОЛИМП МИЛЛИАРДЕРОВ • СКИНЫ ДО {fp(250000)}
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Экстремальные коллекционные сейфы с #387 Blue Gem, #661 ST™ 4x
                  Titan Holo и Souvenir Dragon Lore Kato 14
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveCategory("billionaire-olympus")}
              className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-1.5 font-mono text-xs font-black uppercase text-amber-300 transition hover:bg-amber-400 hover:text-zinc-950"
            >
              Показать все {olympusCategory.cases.length} сейфов →
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {olympusCategory.cases.map((oc) => (
              <Link
                key={oc.id}
                href={`/case/${oc.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-zinc-800/90 bg-[#0B0B0F] p-3 transition hover:-translate-y-1 hover:border-amber-400"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-amber-400/15 px-1.5 py-0.5 font-mono text-[8px] font-black text-amber-300">
                    {oc.badge || "VIP"}
                  </span>
                  <span className="font-mono text-[10px] font-black text-white">
                    {fp(oc.price)}
                  </span>
                </div>
                <div className="my-2 flex h-16 items-center justify-center">
                  <img
                    src={oc.imageUrl}
                    alt={oc.name}
                    decoding="async"
                    className="h-14 w-24 object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
                <div className="truncate font-display text-xs font-black uppercase text-white group-hover:text-amber-300">
                  {oc.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          3. STICKY TACTICAL FILTER & SEARCH BAR
      ===================================================================== */}
      <div className="sticky top-[65px] z-30 mt-7 flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-[#0D0D12]/95 p-3 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-black uppercase tracking-wider transition ${
              activeCategory === "all"
                ? "bg-[#D4FF00] text-zinc-950"
                : "text-zinc-400 hover:bg-zinc-800/70 hover:text-white"
            }`}
          >
            Все ({totalCasesCount})
          </button>

          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] || Snowflake;
            const isSelected = activeCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.slug)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
                  isSelected
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 ${
                    isSelected ? "text-[#D4FF00]" : "text-zinc-500"
                  }`}
                />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Search & Price Tiers */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Найти кейс или скин..."
              className="w-full rounded-xl border border-zinc-800 bg-[#09090B] py-2 pl-9 pr-8 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00] focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-zinc-800 bg-[#09090B] p-1">
            {[
              { id: "all", label: "Все цены" },
              { id: "grind", label: `Гринд до ${fp(1)}` },
              { id: "budget", label: `${fp(1)}–${fp(15)}` },
              { id: "mid", label: `${fp(15)}–${fp(120)}` },
              { id: "high", label: `${fp(120)}–${fp(1500)}` },
              { id: "olympus", label: `${fp(1500)}+` },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPriceFilter(p.id)}
                className={`whitespace-nowrap rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold transition ${
                  priceFilter === p.id
                    ? "bg-[#D4FF00] text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          4. CATEGORIZED CASE SECTIONS
      ===================================================================== */}
      <div className="mt-9 space-y-12">
        {filteredCategories.map((category) => (
          <section key={category.id} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-zinc-800/80 bg-[#101015] px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span
                  style={{ backgroundColor: category.accentColor }}
                  className="h-5 w-1.5 rounded-full"
                />
                <div>
                  <h2 className="font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">
                    {category.name}
                  </h2>
                  <p className="text-xs text-zinc-400">{category.subtitle}</p>
                </div>
              </div>
              <span className="rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-1 font-mono text-xs font-black text-[#D4FF00]">
                {category.cases.length} кейсов
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {category.cases.map((caseItem) => (
                <CaseVaultCard key={caseItem.id} caseData={caseItem} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* =====================================================================
          5. ACTIVE INVENTORY PREVIEW DOCK
      ===================================================================== */}
      {items.length > 0 && (
        <section
          id="inventory"
          className="mt-16 rounded-3xl border border-zinc-800 bg-[#111115] p-6"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-xl font-black uppercase text-white">
                Твой оперативный склад ({items.length})
              </h3>
              <p className="text-xs text-zinc-400">
                Быстрая продажа дропа или отправка напрямую в Апгрейдер PRO
              </p>
            </div>

            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-xl bg-[#D4FF00] px-4 py-2.5 font-mono text-xs font-black uppercase text-zinc-950"
            >
              <span>Открыть 360° Инвентарь →</span>
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.slice(0, 12).map((item) => {
              const theme = getRarityTheme(item.skin.rarity);
              return (
                <div
                  key={item.id}
                  style={{
                    background: `linear-gradient(180deg, #131319 0%, ${theme.bgGlow} 165%)`,
                  }}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800/90 p-3.5 transition hover:border-zinc-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-zinc-300">
                      {item.wear}
                    </span>
                    <span className="font-mono text-xs font-black text-[#D4FF00]">
                      {fp(item.price)}
                    </span>
                  </div>

                  <div className="my-3 flex h-24 items-center justify-center">
                    <img
                      src={item.skin.imageUrl}
                      alt={item.skin.name}
                      decoding="async"
                      className="h-20 w-32 object-contain"
                    />
                  </div>

                  <div>
                    <div className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                      {item.skin.weapon}
                    </div>
                    <div className="truncate text-xs font-black text-white">
                      {item.skin.skinName}
                    </div>

                    <button
                      disabled={isPending}
                      onClick={() => handleQuickSell(item.id)}
                      className="mt-2.5 w-full rounded-lg bg-zinc-800 py-1.5 font-mono text-[10px] font-bold uppercase text-zinc-200 transition hover:bg-[#D4FF00] hover:text-zinc-950"
                    >
                      Продать за {fp(item.price)}
                    </button>
                  </div>

                  <div
                    style={{ backgroundColor: theme.color }}
                    className="absolute bottom-0 left-0 right-0 h-[3px]"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
