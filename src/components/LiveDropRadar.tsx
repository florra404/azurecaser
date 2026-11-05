"use client";

import React, { useEffect, useState } from "react";
import { Crown, Flame } from "lucide-react";
import { getRarityTheme, useFormatPrice } from "@/lib/rarity";

export interface LiveDropItem {
  id: string;
  skinName: string;
  weapon: string;
  rarity: string;
  imageUrl: string;
  wear: string;
  isStatTrak: boolean;
  price: number;
  caseName: string;
  username: string;
}

const PLAYERS = [
  "s1mple",
  "m0NESY",
  "donk",
  "Viperr",
  "kyousuke",
  "b1t",
  "ZywOo",
  "NiKo",
  "sh1ro",
  "JL",
];

export default function LiveDropRadar({
  initialDrops,
}: {
  initialDrops: LiveDropItem[];
}) {
  const [drops, setDrops] = useState<LiveDropItem[]>(initialDrops);
  const [topOnly, setTopOnly] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1380);
  const { fp } = useFormatPrice();

  useEffect(() => {
    if (initialDrops.length === 0) return;

    const interval = setInterval(() => {
      const randomTemplate =
        initialDrops[Math.floor(Math.random() * initialDrops.length)];
      const randomUser = PLAYERS[Math.floor(Math.random() * PLAYERS.length)];

      const simulatedDrop: LiveDropItem = {
        ...randomTemplate,
        id: `sim-${Date.now()}`,
        username: randomUser,
      };

      setDrops((prev) => [simulatedDrop, ...prev.slice(0, 15)]);
      setOnlineCount((prev) => prev + (Math.random() > 0.48 ? 2 : -1));
    }, 4800);

    return () => clearInterval(interval);
  }, [initialDrops]);

  const visibleDrops = topOnly
    ? drops.filter((d) => d.price >= 120 || d.rarity === "GOLD")
    : drops;

  return (
    <section className="border-b border-zinc-800/80 bg-[#0C0C0F]">
      <div className="mx-auto flex max-w-[1600px] items-stretch">
        {/* Left Status Column */}
        <div className="flex shrink-0 flex-col justify-between border-r border-zinc-800/80 bg-[#09090B] px-4 py-2.5 sm:w-44">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#D4FF00] shadow-[0_0_8px_#D4FF00]" />
            <span className="font-mono text-xs font-bold text-white">
              {onlineCount.toLocaleString("ru-RU")}{" "}
              <span className="font-normal text-zinc-500">ONLINE</span>
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-zinc-900 p-0.5">
            <button
              onClick={() => setTopOnly(false)}
              className={`flex items-center justify-center gap-1 rounded py-1 text-[10px] font-black uppercase transition ${
                !topOnly
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Flame className="h-3 w-3 text-[#D4FF00]" />
              Все
            </button>
            <button
              onClick={() => setTopOnly(true)}
              className={`flex items-center justify-center gap-1 rounded py-1 text-[10px] font-black uppercase transition ${
                topOnly
                  ? "bg-[#D4FF00] text-zinc-950"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Crown className="h-3 w-3" />
              Топ
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto px-2.5 py-2 no-scrollbar">
          {visibleDrops.slice(0, 12).map((drop) => {
            const theme = getRarityTheme(drop.rarity);
            const cleanSkinTitle = drop.skinName.includes("|")
              ? drop.skinName.split("|")[1].trim()
              : drop.skinName;

            return (
              <div
                key={drop.id}
                style={{
                  background: `linear-gradient(180deg, #121217 0%, ${theme.bgGlow} 140%)`,
                }}
                className="group relative flex h-[78px] w-[158px] shrink-0 flex-col justify-between overflow-hidden rounded-lg border border-zinc-800/80 p-2.5 transition-all hover:border-zinc-600"
              >
                {/* Left vertical rarity bar */}
                <div
                  style={{ backgroundColor: theme.color }}
                  className="absolute bottom-0 left-0 top-0 w-[3px]"
                />

                <div className="z-10 flex items-center justify-between pl-1.5">
                  <div className="flex items-center gap-1">
                    {drop.isStatTrak && (
                      <span className="text-[9px] font-black text-orange-400">
                        ST
                      </span>
                    )}
                    <span className="font-mono text-[9px] font-bold text-zinc-500">
                      {drop.wear}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] font-black text-zinc-200">
                    {fp(drop.price)}
                  </span>
                </div>

                <div className="pointer-events-none absolute inset-0 flex items-center justify-center pl-2">
                  <img
                    src={drop.imageUrl}
                    alt={drop.skinName}
                    className="h-14 w-24 object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.85)] transition-transform duration-300 group-hover:scale-110"
                  />
                </div>

                <div className="z-10 mt-auto truncate pl-1.5 leading-none">
                  <span className="text-[10px] font-medium text-zinc-400">
                    {drop.weapon}{" "}
                  </span>
                  <span className="text-[11px] font-extrabold text-white">
                    {cleanSkinTitle}
                  </span>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/95 p-2 text-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <span className="text-xs font-black text-white">
                    {drop.username}
                  </span>
                  <span className="mt-1 rounded bg-zinc-800 px-2 py-0.5 font-mono text-[10px] font-bold text-[#D4FF00]">
                    {drop.caseName}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
