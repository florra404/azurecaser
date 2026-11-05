"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  Coins,
  Flame,
  Layers,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { getRarityTheme, useFormatPrice } from "@/lib/rarity";
import { UpgraderInventoryItem } from "./UpgraderClient";
import { performContractAction } from "@/app/actions/contracts";
import { sellInventoryItems, WonDropResult } from "@/app/actions/case";
import { useAppStore } from "@/lib/store";
import { soundEngine } from "@/lib/sound";

export default function ContractsClient({
  initialInventory,
}: {
  initialInventory: UpgraderInventoryItem[];
}) {
  const { setBalance, setInventoryCount } = useAppStore();
  const { fp } = useFormatPrice();

  const [inventory, setInventory] =
    useState<UpgraderInventoryItem[]>(initialInventory);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "crafting" | "won">("idle");
  const [wonDrop, setWonDrop] = useState<WonDropResult | null>(null);
  const [isSold, setIsSold] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedItems = useMemo(
    () => inventory.filter((i) => selectedIds.includes(i.id)),
    [inventory, selectedIds]
  );

  const totalInputUsd = useMemo(
    () =>
      Number(selectedItems.reduce((sum, i) => sum + i.price, 0).toFixed(2)),
    [selectedItems]
  );

  const minDropUsd = totalInputUsd * 0.45;
  const maxDropUsd = totalInputUsd * 2.85;

  const toggleItem = (id: string) => {
    if (phase === "crafting") return;
    setPhase("idle");
    setWonDrop(null);
    setIsSold(false);
    setErrorMsg(null);

    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 10) return prev;
      soundEngine.playTick(0.8);
      return [...prev, id];
    });
  };

  const handleAutoFill = () => {
    if (phase === "crafting" || inventory.length < 3) return;
    const sorted = [...inventory].sort((a, b) => a.price - b.price);
    const takeCount = Math.min(5, sorted.length);
    setSelectedIds(sorted.slice(0, takeCount).map((i) => i.id));
    setPhase("idle");
    setWonDrop(null);
    setErrorMsg(null);
  };

  const handleCraftContract = async () => {
    if (phase === "crafting") return;
    setErrorMsg(null);

    if (selectedIds.length < 3) {
      setErrorMsg("Добавь минимум 3 скина для создания контракта");
      return;
    }

    soundEngine.playStartSpin();
    setPhase("crafting");

    const res = await performContractAction(selectedIds);
    if (!res.ok || !res.wonItem) {
      setPhase("idle");
      setErrorMsg(res.error || "Ошибка контракта");
      return;
    }

    window.setTimeout(() => {
      soundEngine.playWin(true);
      setWonDrop(res.wonItem!);
      setIsSold(false);
      setPhase("won");

      if (typeof res.newInventoryCount === "number") {
        setInventoryCount(res.newInventoryCount);
      }

      const craftedInvItem: UpgraderInventoryItem = {
        id: res.wonItem!.inventoryItemId,
        skinId: res.wonItem!.skinId,
        wear: res.wonItem!.wear,
        floatValue: res.wonItem!.floatValue,
        isStatTrak: res.wonItem!.isStatTrak,
        price: res.wonItem!.price,
        isNewUpgrade: true,
        skin: {
          id: res.wonItem!.skinId,
          name: res.wonItem!.name,
          weapon: res.wonItem!.weapon,
          skinName: res.wonItem!.skinName,
          rarity: res.wonItem!.rarity,
          basePrice: res.wonItem!.price,
          imageUrl: res.wonItem!.imageUrl,
        },
      };

      setInventory((prev) => [
        craftedInvItem,
        ...prev.filter((i) => !selectedIds.includes(i.id)),
      ]);
      setSelectedIds([]);
    }, 1600);
  };

  const handleSellCrafted = async () => {
    if (!wonDrop || isSold) return;
    const res = await sellInventoryItems([wonDrop.inventoryItemId]);
    if (res.ok && typeof res.newBalance === "number") {
      setBalance(res.newBalance);
      setIsSold(true);
      const nextList = inventory.filter((i) => i.id !== wonDrop.inventoryItemId);
      setInventory(nextList);
      setInventoryCount(nextList.length);
      soundEngine.playCashout();
    }
  };

  const slots = Array.from({ length: 10 }, (_, idx) => selectedItems[idx] || null);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-7 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded bg-[#D4FF00]/15 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-[#D4FF00]">
            <Layers className="h-3.5 w-3.5" />
            <span>SKIN SYNTHESIS CONTRACT</span>
          </div>
          <h1 className="mt-1 font-display text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
            КОНТРАКТЫ ОБМЕНА (ОТ 3 ДО 10 СКИНОВ)
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={inventory.length < 3 || phase === "crafting"}
            onClick={handleAutoFill}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold uppercase text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00] disabled:opacity-40"
          >
            Авто-заполнение (5 шт.)
          </button>
          {selectedIds.length > 0 && (
            <button
              disabled={phase === "crafting"}
              onClick={() => setSelectedIds([])}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold uppercase text-zinc-400 hover:text-rose-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Очистить</span>
            </button>
          )}
        </div>
      </div>

      {/* CONTRACT MATRIX & RESULT STAGE */}
      <div className="bg-carbon-pattern rounded-3xl border border-zinc-800 bg-[#111115] p-6 shadow-2xl lg:p-8">
        {phase === "won" && wonDrop ? (
          <div className="my-6 flex flex-col items-center justify-center text-center">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#D4FF00]/15 px-3.5 py-1 font-mono text-xs font-black uppercase text-[#D4FF00]">
              <Sparkles className="h-4 w-4" />
              <span>КОНТРАКТ ВЫПОЛНЕН • СКИН В ИНВЕНТАРЕ!</span>
            </span>

            <div className="my-6 flex h-48 w-72 items-center justify-center rounded-2xl border-2 border-[#D4FF00] bg-[#09090B] p-4 shadow-[0_0_50px_rgba(212,255,0,0.2)]">
              <img
                src={wonDrop.imageUrl}
                alt={wonDrop.name}
                className="animate-weapon-hover h-40 w-60 object-contain drop-shadow-[0_20px_28px_rgba(0,0,0,0.95)]"
              />
            </div>

            <div className="font-mono text-xs font-bold uppercase text-zinc-400">
              {wonDrop.weapon} • {wonDrop.wear} • Float:{" "}
              {wonDrop.floatValue.toFixed(5)}
            </div>
            <h2 className="mt-1 font-display text-2xl font-black text-white">
              {wonDrop.skinName}
            </h2>
            <div className="mt-1 font-mono text-xl font-black text-[#D4FF00]">
              {fp(wonDrop.price)}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                disabled={isSold}
                onClick={handleSellCrafted}
                className={`flex items-center gap-2 rounded-xl px-6 py-3 font-mono text-xs font-black uppercase transition ${
                  isSold
                    ? "bg-zinc-800 text-zinc-400"
                    : "bg-[#D4FF00] text-zinc-950 hover:bg-[#e3ff4d]"
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
                    <span>Продать за {fp(wonDrop.price)}</span>
                  </>
                )}
              </button>

              {!isSold && (
                <Link
                  href={`/upgrader?item=${wonDrop.inventoryItemId}`}
                  className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-3 font-mono text-xs font-black uppercase text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
                >
                  <Flame className="h-4 w-4 text-[#D4FF00]" />
                  <span>Закинуть в апгрейд</span>
                </Link>
              )}

              <button
                onClick={() => {
                  setPhase("idle");
                  setWonDrop(null);
                }}
                className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#09090B] px-5 py-3 text-xs font-bold uppercase text-zinc-300 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Новый контракт</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 10 Contract Slots Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {slots.map((slotItem, idx) => {
                const theme = slotItem
                  ? getRarityTheme(slotItem.skin.rarity)
                  : null;
                return (
                  <div
                    key={idx}
                    onClick={() => slotItem && toggleItem(slotItem.id)}
                    style={
                      slotItem && theme
                        ? {
                            borderColor: theme.color,
                            background: `radial-gradient(circle at 50% 70%, ${theme.bgGlow} 0%, #0B0B0F 80%)`,
                          }
                        : undefined
                    }
                    className={`relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl border p-3.5 transition ${
                      slotItem
                        ? "cursor-pointer hover:opacity-85"
                        : "border-dashed border-zinc-800 bg-[#0B0B0F]/70"
                    } ${phase === "crafting" ? "animate-pulse" : ""}`}
                  >
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-zinc-500">СЛОТ #{idx + 1}</span>
                      {slotItem && (
                        <span className="font-black text-[#D4FF00]">
                          {fp(slotItem.price)}
                        </span>
                      )}
                    </div>

                    {slotItem ? (
                      <>
                        <div className="my-1 flex h-20 items-center justify-center">
                          <img
                            src={slotItem.skin.imageUrl}
                            alt={slotItem.skin.name}
                            className="h-16 w-28 object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.9)]"
                          />
                        </div>
                        <div className="truncate text-xs font-black text-white">
                          {slotItem.skin.skinName}
                        </div>
                      </>
                    ) : (
                      <div className="my-auto flex flex-col items-center justify-center text-zinc-600">
                        <Plus className="h-6 w-6" />
                        <span className="mt-1 font-mono text-[10px] uppercase">
                          Пусто
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {errorMsg && (
              <div className="mx-auto mt-4 max-w-md rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-center text-xs font-bold text-rose-300">
                {errorMsg}
              </div>
            )}

            {/* Contract Telemetry & Craft Button */}
            <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-[#0B0B0F] p-5 sm:flex-row">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="font-mono text-[10px] uppercase text-zinc-500">
                    Выбрано скинов
                  </div>
                  <div className="font-mono text-xl font-black text-white">
                    {selectedIds.length} / 10{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      (мин. 3)
                    </span>
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase text-zinc-500">
                    Сумма контракта
                  </div>
                  <div className="font-mono text-xl font-black text-[#D4FF00]">
                    {fp(totalInputUsd)}
                  </div>
                </div>

                <div>
                  <div className="font-mono text-[10px] uppercase text-zinc-500">
                    Возможный дроп
                  </div>
                  <div className="font-mono text-sm font-black text-zinc-200">
                    от {fp(minDropUsd)} до{" "}
                    <span className="text-[#D4FF00]">{fp(maxDropUsd)}</span>
                  </div>
                </div>
              </div>

              <button
                disabled={selectedIds.length < 3 || phase === "crafting"}
                onClick={handleCraftContract}
                className="flex items-center gap-2 rounded-xl bg-[#D4FF00] px-8 py-4 text-xs font-black uppercase tracking-wider text-zinc-950 shadow-[0_0_25px_rgba(212,255,0,0.25)] transition hover:bg-[#e3ff4d] disabled:opacity-40"
              >
                <Layers className="h-4 w-4 stroke-[2.5]" />
                <span>
                  {phase === "crafting"
                    ? "Синтезируем..."
                    : "Подписать контракт"}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* INVENTORY PICKER */}
      <div className="mt-8 rounded-2xl border border-zinc-800 bg-[#111115] p-6">
        <h3 className="font-display text-base font-black uppercase text-white">
          Доступные скины в инвентаре ({inventory.length})
        </h3>
        <p className="text-xs text-zinc-400">
          Выбери от 3 до 10 предметов, чтобы объединить их в один новый скин
        </p>

        {inventory.length === 0 ? (
          <div className="py-16 text-center text-xs text-zinc-500">
            В инвентаре пока нет предметов. Открой несколько кейсов!
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
            {inventory.map((item) => {
              const theme = getRarityTheme(item.skin.rarity);
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{
                    background: `linear-gradient(180deg, #14141A 0%, ${theme.bgGlow} 160%)`,
                  }}
                  className={`relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border p-3.5 transition ${
                    isSelected
                      ? "border-[#D4FF00] ring-1 ring-[#D4FF00]"
                      : "border-zinc-800 hover:border-zinc-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-zinc-400">
                      {item.wear}
                    </span>
                    <span className="font-mono text-xs font-black text-white">
                      {fp(item.price)}
                    </span>
                  </div>

                  <div className="my-2 flex h-20 items-center justify-center">
                    <img
                      src={item.skin.imageUrl}
                      alt={item.skin.name}
                      className="h-16 w-28 object-contain"
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
    </div>
  );
}
