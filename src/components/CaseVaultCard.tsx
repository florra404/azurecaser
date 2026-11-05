"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Flame, Sparkles } from "lucide-react";
import { getRarityTheme, useFormatPrice } from "@/lib/rarity";

export interface CaseSkinPreview {
  id: string;
  name: string;
  weapon: string;
  skinName: string;
  rarity: string;
  basePrice: number;
  imageUrl: string;
  dropChance: number;
}

export interface CaseCardData {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  oldPrice: number | null;
  imageUrl: string;
  accentColor: string;
  badge: string | null;
  openCount: number;
  items: CaseSkinPreview[];
}

interface CaseVaultCardProps {
  caseData: CaseCardData;
}

export default function CaseVaultCard({ caseData }: CaseVaultCardProps) {
  const { fp } = useFormatPrice();

  const sortedItems = [...caseData.items].sort(
    (a, b) => b.basePrice - a.basePrice
  );
  const topThree = sortedItems.slice(0, 3);
  const maxPrice = sortedItems[0]?.basePrice || 0;

  return (
    <Link
      href={`/case/${caseData.slug}`}
      className="bg-carbon-pattern group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800/90 bg-[#101015] p-4 transition-all duration-300 hover:-translate-y-1.5 hover:border-[#D4FF00]/60 hover:bg-[#14141C] hover:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.95)]"
    >
      {/* Top Neon Accent Laser */}
      <div
        style={{ backgroundColor: caseData.accentColor }}
        className="absolute left-6 right-6 top-0 h-[2px] opacity-75 transition-all duration-300 group-hover:left-0 group-hover:right-0 group-hover:h-[3px] group-hover:opacity-100"
      />

      {/* Ambient Radial Aura */}
      <div
        style={{
          background: `radial-gradient(circle at 50% 42%, ${caseData.accentColor}26 0%, transparent 66%)`,
        }}
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* Top Row: Badge & Max Jackpot */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        {caseData.badge ? (
          <span
            style={{
              borderColor: `${caseData.accentColor}55`,
              backgroundColor: `${caseData.accentColor}18`,
              color: caseData.accentColor,
            }}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider"
          >
            <Flame className="h-2.5 w-2.5" />
            <span>{caseData.badge}</span>
          </span>
        ) : (
          <span className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400">
            CS2 VAULT
          </span>
        )}

        <span className="rounded-md bg-zinc-900/90 px-2 py-0.5 font-mono text-[10px] font-bold text-zinc-400">
          ТОП: <strong className="text-[#D4FF00]">{fp(maxPrice)}</strong>
        </span>
      </div>

      {/* Main Weapon Stage */}
      <div className="relative my-3 flex h-40 items-center justify-center">
        <div
          style={{ borderColor: `${caseData.accentColor}22` }}
          className="pointer-events-none absolute h-32 w-32 rounded-full border bg-white/[0.01] transition-transform duration-500 group-hover:scale-110"
        />

        <img
          src={caseData.imageUrl}
          alt={caseData.name}
          decoding="async"
          className="animate-weapon-hover relative z-10 h-34 w-48 object-contain drop-shadow-[0_18px_22px_rgba(0,0,0,0.92)] transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-2"
        />
      </div>

      {/* Mini Top-3 Contents Strip */}
      {topThree.length > 0 && (
        <div className="relative z-10 mb-2.5 grid grid-cols-3 gap-1.5">
          {topThree.map((sk) => {
            const rTheme = getRarityTheme(sk.rarity);
            return (
              <div
                key={sk.id}
                style={{ borderBottomColor: rTheme.color }}
                className="flex flex-col items-center rounded-lg border border-b-2 border-zinc-800/80 bg-[#09090C]/90 px-1.5 py-1"
              >
                <img
                  src={sk.imageUrl}
                  alt={sk.name}
                  decoding="async"
                  className="h-6 w-10 object-contain"
                />
                <span className="mt-0.5 max-w-full truncate font-mono text-[8px] font-bold text-zinc-300">
                  {fp(sk.basePrice)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Row: Title & Action Button */}
      <div className="relative z-10 flex items-center justify-between gap-2 rounded-xl border border-zinc-800/90 bg-[#08080B]/95 p-2.5 pl-3 transition-colors group-hover:border-zinc-700">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm font-black uppercase tracking-wide text-white group-hover:text-[#D4FF00]">
            {caseData.name}
          </h3>
          <p className="truncate text-[10px] text-zinc-500">
            {caseData.subtitle} • {caseData.items.length} скинов
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-[#D4FF00] px-3 py-2 text-zinc-950 shadow-[0_0_20px_rgba(212,255,0,0.18)] transition-transform duration-200 group-hover:scale-105">
          {caseData.oldPrice && (
            <span className="mr-0.5 font-mono text-[9px] text-zinc-700 line-through">
              {fp(caseData.oldPrice)}
            </span>
          )}
          <span className="font-mono text-xs font-black text-zinc-950">
            {fp(caseData.price)}
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
        </div>
      </div>
    </Link>
  );
}
