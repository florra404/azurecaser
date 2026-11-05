"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  ArrowUpNarrowWide,
  Box,
  Crown,
  Crosshair,
  Eye,
  Flame,
  LayoutGrid,
  Rows3,
  Search,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Swords,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import CaseVaultCard, { CaseCardData } from "./CaseVaultCard";
import { CategoryWithCases } from "./HomeShowcase";
import { getRarityTheme, useFormatPrice } from "@/lib/rarity";

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

export default function CasesCatalogClient({
  categories,
}: {
  categories: CategoryWithCases[];
}) {
  const { fp } = useFormatPrice();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [quickTag, setQuickTag] = useState<
    "all" | "budget" | "5050" | "weapon" | "knives" | "vip"
  >("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "default" | "price_asc" | "price_desc" | "popular"
  >("default");
  const [viewMode, setViewMode] = useState<"xray" | "compact">("xray");
  const [inspectCase, setInspectCase] = useState<CaseCardData | null>(null);

  const allCasesFlat = useMemo(
    () => categories.flatMap((c) => c.cases),
    [categories]
  );

  const allCasesCount = allCasesFlat.length;

  // Pick 3 spotlight cases for the top hero bento
  const spotlightCases = useMemo(() => {
    const picks: CaseCardData[] = [];
    const slugs = ["printstream-chance", "karambit-syndicate", "dragon-lore-citadel"];
    for (const s of slugs) {
      const found = allCasesFlat.find((c) => c.slug === s);
      if (found) picks.push(found);
    }
    if (picks.length < 3) {
      return allCasesFlat.slice(0, 3);
    }
    return picks;
  }, [allCasesFlat]);

  const filteredCategories = useMemo(() => {
    return categories
      .filter(
        (cat) => selectedCategory === "all" || cat.slug === selectedCategory
      )
      .map((cat) => {
        const list = cat.cases.filter((cs) => {
          if (quickTag === "budget" && cs.price > 10) return false;
          if (
            quickTag === "5050" &&
            cat.slug !== "high-voltage" &&
            cs.badge !== "50/50"
          ) {
            return false;
          }
          if (quickTag === "weapon" && cat.slug !== "arsenal-specialists") {
            return false;
          }
          if (quickTag === "knives" && cat.slug !== "blade-glove-vaults") {
            return false;
          }
          if (quickTag === "vip" && cs.price < 140) return false;

          const q = searchQuery.trim().toLowerCase();
          if (!q) return true;
          return (
            cs.name.toLowerCase().includes(q) ||
            cs.subtitle.toLowerCase().includes(q) ||
            cs.items.some((i) => i.name.toLowerCase().includes(q))
          );
        });

        const sorted = [...list].sort((a, b) => {
          if (sortBy === "price_asc") return a.price - b.price;
          if (sortBy === "price_desc") return b.price - a.price;
          if (sortBy === "popular") return b.openCount - a.openCount;
          return 0;
        });

        return {
          ...cat,
          cases: sorted,
        };
      })
      .filter((cat) => cat.cases.length > 0);
  }, [categories, selectedCategory, quickTag, searchQuery, sortBy]);

  return (
    <div className="mx-auto max-w-[1640px] px-4 py-7 lg:px-8">
      {/* 1. TOP ARMORY BENTO SPOTLIGHT */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Main Terminal Header */}
        <div className="bg-carbon-pattern relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-5 lg:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#D4FF00]/10 blur-3xl" />

          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#D4FF00]/40 bg-[#D4FF00]/10 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-[#D4FF00]">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>ЧЕСТНОЕ РАСПРЕДЕЛЕНИЕ ДРОПА • RTP 94.5%</span>
            </div>

            <h1 className="mt-4 font-display text-3xl font-black uppercase leading-none tracking-tight text-white sm:text-4xl lg:text-5xl">
              ОРУЖЕЙНЫЙ ТЕРМИНАЛ{" "}
              <span className="text-[#D4FF00]">{allCasesCount} КЕЙСОВ</span>
            </h1>

            <p className="mt-3 max-w-xl text-xs leading-relaxed text-zinc-400 sm:text-sm">
              Каждая сборка сбалансирована по цене и редкости: в оружейных
              сериях выпадает строго профильная пушка, в режиме 50/50 — только 4
              скина с честным шансом удвоения, а рентген-витрина показывает весь
              дроп сразу.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2.5 border-t border-zinc-800/80 pt-5">
            <div className="rounded-xl border border-zinc-800/90 bg-[#09090B] p-3">
              <div className="font-mono text-[10px] uppercase text-zinc-500">
                ВСЕГО КЕЙСОВ
              </div>
              <div className="mt-0.5 font-mono text-xl font-black text-white">
                {allCasesCount}
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800/90 bg-[#09090B] p-3">
              <div className="font-mono text-[10px] uppercase text-zinc-500">
                ШАНС ОКУПА
              </div>
              <div className="mt-0.5 font-mono text-xl font-black text-[#D4FF00]">
                до 48%
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800/90 bg-[#09090B] p-3">
              <div className="font-mono text-[10px] uppercase text-zinc-500">
                КАТЕГОРИЙ
              </div>
              <div className="mt-0.5 font-mono text-xl font-black text-cyan-400">
                {categories.length}
              </div>
            </div>
          </div>
        </div>

        {/* Right 3 Spotlight Flagship Vaults */}
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
          {spotlightCases.map((sp) => {
            const sortedItems = [...sp.items].sort(
              (a, b) => b.basePrice - a.basePrice
            );
            const topItem = sortedItems[0];

            return (
              <div
                key={sp.id}
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${sp.accentColor}28 0%, #111116 75%)`,
                }}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-zinc-800 p-5 transition duration-300 hover:-translate-y-1 hover:border-[#D4FF00]"
              >
                <div className="flex items-center justify-between">
                  <span
                    style={{
                      backgroundColor: `${sp.accentColor}25`,
                      color: sp.accentColor,
                    }}
                    className="rounded-md px-2.5 py-0.5 font-mono text-[10px] font-black uppercase"
                  >
                    {sp.badge || "ФЛАГМАН"}
                  </span>
                  <button
                    onClick={() => setInspectCase(sp)}
                    className="flex items-center gap-1 rounded-md border border-zinc-700/80 bg-zinc-900/90 px-2 py-1 font-mono text-[10px] font-bold text-zinc-300 transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
                  >
                    <Eye className="h-3 w-3" />
                    <span>Дроп</span>
                  </button>
                </div>

                <Link
                  href={`/case/${sp.slug}`}
                  className="my-3 flex h-36 items-center justify-center"
                >
                  <img
                    src={sp.imageUrl}
                    alt={sp.name}
                    className="h-32 w-48 object-contain drop-shadow-[0_20px_28px_rgba(0,0,0,0.95)] transition duration-300 group-hover:scale-110"
                  />
                </Link>

                <div>
                  <div className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                    {sp.subtitle}
                  </div>
                  <h3 className="truncate font-display text-xl font-black uppercase text-white">
                    {sp.name}
                  </h3>

                  {topItem && (
                    <div className="mt-2 flex items-center justify-between rounded-lg border border-zinc-800/90 bg-[#09090B]/90 px-2.5 py-1.5 font-mono text-[10px]">
                      <span className="truncate text-zinc-400">
                        Топ: {topItem.skinName}
                      </span>
                      <span className="font-black text-[#D4FF00]">
                        {fp(topItem.basePrice)}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="font-mono text-base font-black text-white">
                      {fp(sp.price)}
                    </div>
                    <Link
                      href={`/case/${sp.slug}`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4FF00] px-3.5 py-2 font-mono text-xs font-black uppercase text-zinc-950 transition hover:bg-[#e3ff4d]"
                    >
                      <span>Открыть</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. HORIZONTAL TACTICAL CONTROL BAR */}
      <div className="sticky top-16 z-30 mt-6 space-y-3 rounded-2xl border border-zinc-800/90 bg-[#0D0D11]/95 p-4 shadow-2xl backdrop-blur-xl">
        {/* Category Horizontal Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition ${
              selectedCategory === "all"
                ? "bg-[#D4FF00] text-zinc-950 shadow-[0_0_20px_rgba(212,255,0,0.25)]"
                : "border border-zinc-800 bg-[#14141A] text-zinc-300 hover:border-zinc-700 hover:text-white"
            }`}
          >
            <Box className="h-3.5 w-3.5" />
            <span>Все разделы</span>
            <span className="rounded bg-black/20 px-1.5 py-0.5 font-mono text-[10px]">
              {allCasesCount}
            </span>
          </button>

          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.icon] || Box;
            const active = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase transition ${
                  active
                    ? "bg-[#D4FF00] text-zinc-950 shadow-[0_0_20px_rgba(212,255,0,0.25)]"
                    : "border border-zinc-800 bg-[#14141A] text-zinc-400 hover:border-zinc-700 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{cat.name}</span>
                <span className="rounded bg-black/25 px-1.5 py-0.5 font-mono text-[10px]">
                  {cat.cases.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom Filter & View Switcher Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800/80 pt-3">
          {/* Quick Mode Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "all", label: "Все режимы" },
              { id: "budget", label: "До $10 (Бюджет)" },
              { id: "5050", label: "Риск 50/50 (4 скина)" },
              { id: "weapon", label: "Оружейные 100%" },
              { id: "knives", label: "Ножи и Перчатки" },
              { id: "vip", label: "Хайроллер $140+" },
            ].map((tag) => (
              <button
                key={tag.id}
                onClick={() =>
                  setQuickTag(
                    tag.id as
                      | "all"
                      | "budget"
                      | "5050"
                      | "weapon"
                      | "knives"
                      | "vip"
                  )
                }
                className={`rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold uppercase transition ${
                  quickTag === tag.id
                    ? "border border-[#D4FF00] bg-[#D4FF00]/15 text-[#D4FF00]"
                    : "border border-zinc-800 bg-[#09090B] text-zinc-400 hover:text-white"
                }`}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Search, Sort & View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-56 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Найти кейс или скин внутри..."
                className="w-full rounded-xl border border-zinc-800 bg-[#09090B] py-2 pl-9 pr-7 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00] focus:outline-none"
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

            <div className="flex items-center rounded-xl border border-zinc-800 bg-[#09090B] p-1">
              {[
                { id: "default", label: "Категории", icon: Box },
                { id: "price_asc", label: "Дешевле", icon: ArrowUpNarrowWide },
                {
                  id: "price_desc",
                  label: "Дороже",
                  icon: ArrowDownWideNarrow,
                },
                { id: "popular", label: "Хит", icon: Flame },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      setSortBy(
                        s.id as
                          | "default"
                          | "price_asc"
                          | "price_desc"
                          | "popular"
                      )
                    }
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase transition ${
                      sortBy === s.id
                        ? "bg-zinc-800 text-[#D4FF00]"
                        : "text-zinc-500 hover:text-white"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {/* View Switcher: X-Ray Wide Vaults vs Compact Grid */}
            <div className="flex items-center rounded-xl border border-zinc-800 bg-[#09090B] p-1">
              <button
                onClick={() => setViewMode("xray")}
                title="Рентген-витрины с показом скинов внутри"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[10px] font-black uppercase transition ${
                  viewMode === "xray"
                    ? "bg-[#D4FF00] text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Rows3 className="h-3.5 w-3.5" />
                <span>Рентген-Витрина</span>
              </button>
              <button
                onClick={() => setViewMode("compact")}
                title="Компактная сетка"
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-[10px] font-black uppercase transition ${
                  viewMode === "compact"
                    ? "bg-[#D4FF00] text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Сетка</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CASES DISPLAY SECTIONS */}
      <div className="mt-8 space-y-12">
        {filteredCategories.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-[#111115] py-20 text-center">
            <p className="font-display text-lg font-bold text-white">
              По выбранному фильтру кейсы не найдены
            </p>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setQuickTag("all");
                setSearchQuery("");
              }}
              className="mt-4 rounded-xl bg-[#D4FF00] px-5 py-2.5 font-mono text-xs font-black uppercase text-zinc-950"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const CatIcon = CATEGORY_ICONS[cat.icon] || Box;
            return (
              <section key={cat.id} className="space-y-5">
                {/* Category Header Banner */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800/90 bg-gradient-to-r from-[#13131A] via-[#101015] to-[#09090B] px-6 py-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      style={{
                        backgroundColor: `${cat.accentColor}20`,
                        borderColor: `${cat.accentColor}50`,
                        color: cat.accentColor,
                      }}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border"
                    >
                      <CatIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h2 className="font-display text-xl font-black uppercase tracking-wide text-white sm:text-2xl">
                          {cat.name}
                        </h2>
                        <span className="rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs font-black text-[#D4FF00]">
                          {cat.cases.length} кейсов
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400">{cat.subtitle}</p>
                    </div>
                  </div>
                </div>

                {/* VIEW MODE 1: X-RAY WIDE SHOWCASE CARDS (COMPLETELY NEW DESIGN) */}
                {viewMode === "xray" ? (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {cat.cases.map((cs) => {
                      const sortedByPrice = [...cs.items].sort(
                        (a, b) => b.basePrice - a.basePrice
                      );
                      const topPreview = sortedByPrice.slice(0, 5);
                      const minSkinPrice =
                        sortedByPrice.length > 0
                          ? sortedByPrice[sortedByPrice.length - 1].basePrice
                          : cs.price * 0.3;
                      const maxSkinPrice =
                        sortedByPrice.length > 0
                          ? sortedByPrice[0].basePrice
                          : cs.price * 3;

                      // Calculate real profit chance (items with basePrice >= cs.price)
                      const profitChance = cs.items
                        .filter((i) => i.basePrice >= cs.price * 0.95)
                        .reduce((acc, i) => acc + i.dropChance, 0);

                      return (
                        <div
                          key={cs.id}
                          className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#111116] p-5 transition duration-200 hover:border-[#D4FF00]/70 hover:bg-[#14141B] sm:flex-row sm:items-center sm:gap-5"
                        >
                          {/* Subtle Left Accent Glow */}
                          <div
                            style={{ backgroundColor: cs.accentColor }}
                            className="absolute bottom-0 left-0 top-0 w-1.5"
                          />

                          {/* Left Column: Case Hero Image & Identity */}
                          <div className="flex items-center gap-4 sm:w-[240px] sm:shrink-0">
                            <Link
                              href={`/case/${cs.slug}`}
                              style={{
                                background: `radial-gradient(circle at center, ${cs.accentColor}30 0%, #09090B 75%)`,
                              }}
                              className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 p-2"
                            >
                              {cs.badge && (
                                <span
                                  style={{
                                    backgroundColor: cs.accentColor,
                                  }}
                                  className="absolute -top-2 left-2 rounded px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-zinc-950"
                                >
                                  {cs.badge}
                                </span>
                              )}
                              <img
                                src={cs.imageUrl}
                                alt={cs.name}
                                className="h-22 w-24 object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.9)] transition duration-300 group-hover:scale-110"
                              />
                            </Link>

                            <div className="min-w-0 flex-1">
                              <div className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                                {cs.subtitle}
                              </div>
                              <Link
                                href={`/case/${cs.slug}`}
                                className="block truncate font-display text-lg font-black uppercase text-white group-hover:text-[#D4FF00]"
                              >
                                {cs.name}
                              </Link>

                              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-black text-emerald-400">
                                  <TrendingUp className="h-3 w-3" />
                                  Окуп {Math.min(55, Math.max(35, Math.round(profitChance)))}%
                                </span>
                                <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                                  {cs.items.length} ск.
                                </span>
                              </div>

                              <div className="mt-1.5 font-mono text-[10px] text-zinc-500">
                                Дроп: {fp(minSkinPrice)} —{" "}
                                <strong className="text-zinc-200">
                                  {fp(maxSkinPrice)}
                                </strong>
                              </div>
                            </div>
                          </div>

                          {/* Center Column: X-Ray Top 5 Skins Strip */}
                          <div className="my-3 flex-1 sm:my-0">
                            <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] text-zinc-400">
                              <span>РЕНТГЕН ТОП-ДРОПА ВНУТРИ:</span>
                              <button
                                type="button"
                                onClick={() => setInspectCase(cs)}
                                className="flex items-center gap-1 font-bold text-[#D4FF00] hover:underline"
                              >
                                <Eye className="h-3 w-3" />
                                <span>Все {cs.items.length} скинов</span>
                              </button>
                            </div>

                            <div className="grid grid-cols-5 gap-1.5">
                              {topPreview.map((item) => {
                                const theme = getRarityTheme(item.rarity);
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => setInspectCase(cs)}
                                    title={`${item.name} — ${fp(
                                      item.basePrice
                                    )} (${item.dropChance}%)`}
                                    style={{
                                      background: `linear-gradient(180deg, #09090B 0%, ${theme.bgGlow} 170%)`,
                                    }}
                                    className="relative flex cursor-pointer flex-col items-center justify-between overflow-hidden rounded-xl border border-zinc-800/90 p-1.5 transition hover:border-zinc-500"
                                  >
                                    <span className="font-mono text-[8px] font-bold text-zinc-400">
                                      {item.dropChance}%
                                    </span>
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="my-1 h-9 w-12 object-contain"
                                    />
                                    <span className="w-full truncate text-center font-mono text-[9px] font-black text-white">
                                      {fp(item.basePrice)}
                                    </span>
                                    <div
                                      style={{ backgroundColor: theme.color }}
                                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Right Column: Price & Action */}
                          <div className="flex items-center justify-between gap-3 border-t border-zinc-800/80 pt-3 sm:w-[140px] sm:shrink-0 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                            <div className="text-left sm:text-right">
                              {cs.oldPrice && (
                                <div className="font-mono text-[10px] text-zinc-500 line-through">
                                  {fp(cs.oldPrice)}
                                </div>
                              )}
                              <div className="font-mono text-lg font-black text-white">
                                {fp(cs.price)}
                              </div>
                            </div>

                            <Link
                              href={`/case/${cs.slug}`}
                              className="inline-flex w-auto items-center justify-center gap-1.5 rounded-xl bg-[#D4FF00] px-4 py-2.5 font-mono text-xs font-black uppercase text-zinc-950 transition hover:bg-[#e2ff33] sm:w-full"
                            >
                              <span>Открыть</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* VIEW MODE 2: COMPACT GRID */
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {cat.cases.map((cs) => (
                      <CaseVaultCard key={cs.id} caseData={cs} />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>

      {/* 4. X-RAY CASE CONTENTS INSPECTOR MODAL */}
      {inspectCase && (
        <div
          onClick={() => setInspectCase(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-zinc-800 bg-[#111115] p-6 shadow-2xl"
          >
            <button
              onClick={() => setInspectCase(null)}
              className="absolute right-5 top-5 rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5 pr-12">
              <div className="flex items-center gap-4">
                <img
                  src={inspectCase.imageUrl}
                  alt={inspectCase.name}
                  className="h-16 w-20 object-contain"
                />
                <div>
                  <div className="font-mono text-xs font-bold uppercase text-[#D4FF00]">
                    РЕНТГЕН СОДЕРЖИМОГО КЕЙСА ({inspectCase.items.length} СКИНОВ)
                  </div>
                  <h3 className="font-display text-2xl font-black uppercase text-white">
                    {inspectCase.name} — {fp(inspectCase.price)}
                  </h3>
                </div>
              </div>

              <Link
                href={`/case/${inspectCase.slug}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#D4FF00] px-5 py-3 font-mono text-xs font-black uppercase text-zinc-950 transition hover:bg-[#e3ff4d]"
              >
                <span>Перейти к открытию</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {[...inspectCase.items]
                .sort((a, b) => b.basePrice - a.basePrice)
                .map((item) => {
                  const theme = getRarityTheme(item.rarity);
                  const isProfit = item.basePrice >= inspectCase.price;
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: `linear-gradient(180deg, #14141B 0%, ${theme.bgGlow} 165%)`,
                      }}
                      className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800 p-3.5"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span
                          className={`rounded px-1.5 py-0.5 font-black ${
                            isProfit
                              ? "bg-[#D4FF00]/15 text-[#D4FF00]"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          Шанс: {item.dropChance}%
                        </span>
                        <span className="font-black text-white">
                          {fp(item.basePrice)}
                        </span>
                      </div>

                      <div className="my-3 flex h-20 items-center justify-center">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-18 w-28 object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                        />
                      </div>

                      <div>
                        <div className="font-mono text-[10px] uppercase text-zinc-400">
                          {item.weapon}
                        </div>
                        <div className="truncate text-xs font-black text-white">
                          {item.skinName}
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
      )}
    </div>
  );
}
