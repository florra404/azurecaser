"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  Box,
  Camera,
  Check,
  Coins,
  Crown,
  Eye,
  Flame,
  Gift,
  Layers,
  Search,
  Sparkles,
  Tag,
  Trophy,
  User as UserIcon,
  X,
} from "lucide-react";
import { getRarityTheme, useFormatPrice } from "@/lib/rarity";
import { sellInventoryItems } from "@/app/actions/case";
import {
  claimRankBonusAction,
  updateProfileAction,
} from "@/app/actions/user";
import { useAppStore } from "@/lib/store";
import { soundEngine } from "@/lib/sound";
import {
  AVATAR_PRESETS,
  getLevelInfo,
  RANK_TIERS,
  resolveAvatarUrl,
} from "@/lib/levels";
import { parseCaseAndNameTag } from "@/lib/wear";
import { UpgradeHistoryEntry } from "./UpgraderClient";
import AvatarCropper from "./AvatarCropper";
import SkinInspectorModal from "./SkinInspectorModal";

export interface ProfileInventoryItem {
  id: string;
  wear: string;
  floatValue: number;
  isStatTrak: boolean;
  price: number;
  obtainedFrom: string; // CASE, UPGRADE, CONTRACT
  caseName: string | null;
  skin: {
    id: string;
    name: string;
    weapon: string;
    skinName: string;
    rarity: string;
    imageUrl: string;
  };
}

export interface ProfileCaseHistoryItem {
  id: string;
  skinName: string;
  weapon: string;
  rarity: string;
  imageUrl: string;
  wear: string;
  floatValue: number;
  isStatTrak: boolean;
  price: number;
  caseName: string;
}

interface ProfileClientProps {
  user: {
    username: string;
    avatar: string;
    balance: number;
    level: number;
    xp: number;
    totalOpened: number;
    totalUpgraded: number;
    totalProfit: number;
  };
  initialInventory: ProfileInventoryItem[];
  caseHistory: ProfileCaseHistoryItem[];
  upgradeHistory: UpgradeHistoryEntry[];
}

export default function ProfileClient({
  user,
  initialInventory,
  caseHistory,
  upgradeHistory,
}: ProfileClientProps) {
  const router = useRouter();
  const { setBalance, setInventoryCount } = useAppStore();
  const { fp } = useFormatPrice();

  const [inventory, setInventory] =
    useState<ProfileInventoryItem[]>(initialInventory);
  const [userXp, setUserXp] = useState<number>(user.xp);
  const [username, setUsername] = useState<string>(user.username);
  const [avatar, setAvatar] = useState<string>(user.avatar);

  const [activeTab, setActiveTab] = useState<
    "inventory" | "levels" | "cases" | "upgrades"
  >("inventory");
  const [originFilter, setOriginFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Avatar editor modal state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [editName, setEditName] = useState(user.username);
  const [editAvatar, setEditAvatar] = useState(user.avatar);
  const [customUrl, setCustomUrl] = useState("");
  const [bonusBanner, setBonusBanner] = useState<string | null>(null);
  const [inspectedItem, setInspectedItem] =
    useState<ProfileInventoryItem | null>(null);

  const [isPending, startTransition] = useTransition();

  const levelInfo = useMemo(() => getLevelInfo(userXp), [userXp]);
  const avatarSrc = resolveAvatarUrl(avatar);

  const totalInventoryValue = useMemo(
    () => inventory.reduce((sum, item) => sum + item.price, 0),
    [inventory]
  );

  const bestDrop = useMemo(() => {
    if (inventory.length === 0) return null;
    return [...inventory].sort((a, b) => b.price - a.price)[0];
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      if (originFilter !== "ALL" && item.obtainedFrom !== originFilter) {
        return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (q && !item.skin.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [inventory, originFilter, searchQuery]);

  const handleSellOne = (id: string) => {
    startTransition(async () => {
      const res = await sellInventoryItems([id]);
      if (res.ok && typeof res.newBalance === "number") {
        setBalance(res.newBalance);
        const nextList = inventory.filter((i) => i.id !== id);
        setInventory(nextList);
        setInventoryCount(nextList.length);
        soundEngine.playCashout();
      }
    });
  };

  const handleSellAll = () => {
    if (filteredInventory.length === 0) return;
    const ids = filteredInventory.map((i) => i.id);
    startTransition(async () => {
      const res = await sellInventoryItems(ids);
      if (res.ok && typeof res.newBalance === "number") {
        setBalance(res.newBalance);
        const nextList = inventory.filter((i) => !ids.includes(i.id));
        setInventory(nextList);
        setInventoryCount(nextList.length);
        soundEngine.playCashout();
      }
    });
  };

  const handleClaimLevelBonus = () => {
    startTransition(async () => {
      const res = await claimRankBonusAction();
      if (res.ok) {
        if (typeof res.newBalance === "number") {
          setBalance(res.newBalance);
        }
        if (typeof res.newXp === "number") {
          setUserXp(res.newXp);
        }
        soundEngine.playWin(true);
        setBonusBanner(
          `Бонус ранга получен: +${fp(res.bonusUsd || 25)} на баланс и +${
            res.xpAdded || 350
          } XP (Уровень ${res.newLevel})!`
        );
        router.refresh();
      }
    });
  };

  const handleSaveAvatarAndName = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenAvatar = customUrl.trim() || editAvatar;
    startTransition(async () => {
      const res = await updateProfileAction({
        username: editName,
        avatar: chosenAvatar,
      });
      if (res.ok && res.user) {
        setUsername(res.user.username);
        setAvatar(res.user.avatar);
        soundEngine.playCashout();
        setShowAvatarModal(false);
        router.refresh();
      }
    });
  };

  const originBadgeLabel = (origin: string) => {
    if (origin === "UPGRADE")
      return {
        label: "АПГРЕЙД",
        color: "text-[#D4FF00] bg-[#D4FF00]/15",
      };
    if (origin === "CONTRACT")
      return {
        label: "КОНТРАКТ",
        color: "text-purple-300 bg-purple-500/20",
      };
    return { label: "КЕЙС", color: "text-zinc-300 bg-zinc-800" };
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 lg:px-8">
      {bonusBanner && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-[#D4FF00]/50 bg-[#D4FF00]/10 px-4 py-3 text-xs font-black text-[#D4FF00]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>{bonusBanner}</span>
          </div>
          <button
            onClick={() => setBonusBanner(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* TOP PROFILE DASHBOARD */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Left Operative Card + Level Progression */}
        <div className="bg-carbon-pattern flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-4">
              <div className="group relative">
                <img
                  src={avatarSrc}
                  alt={username}
                  className="h-20 w-20 rounded-2xl border-2 border-[#D4FF00] object-cover shadow-lg"
                />
                <button
                  onClick={() => setShowAvatarModal(true)}
                  title="Сменить аватарку и никнейм"
                  className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-900 bg-[#D4FF00] text-zinc-950 shadow transition hover:scale-105"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-2xl font-black uppercase text-white">
                    {username}
                  </h1>
                  <span
                    style={{
                      color: levelInfo.rank.color,
                      backgroundColor: levelInfo.rank.bgBadge,
                    }}
                    className="rounded-md px-2.5 py-1 font-mono text-xs font-black uppercase"
                  >
                    LVL {levelInfo.level} • {levelInfo.rank.ruTitle}
                  </span>
                  <button
                    onClick={() => setShowAvatarModal(true)}
                    className="rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1 font-mono text-[10px] font-bold uppercase text-zinc-300 transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
                  >
                    Изменить профиль
                  </button>
                </div>
                <p className="mt-1.5 font-mono text-xs text-zinc-400">
                  В инвентаре {inventory.length} предм. на сумму{" "}
                  <strong className="text-white">
                    {fp(totalInventoryValue)}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                disabled={isPending}
                onClick={handleClaimLevelBonus}
                className="flex items-center gap-2 rounded-xl border border-[#D4FF00]/50 bg-[#D4FF00]/15 px-4 py-3 font-mono text-xs font-black uppercase text-[#D4FF00] transition hover:bg-[#D4FF00] hover:text-zinc-950 disabled:opacity-50"
              >
                <Gift className="h-4 w-4" />
                <span>
                  Бонус ранга (+{fp(levelInfo.rank.bonusUsd)} & +LVL)
                </span>
              </button>

              {filteredInventory.length > 0 && (
                <button
                  disabled={isPending}
                  onClick={handleSellAll}
                  className="flex items-center gap-2 rounded-xl bg-[#D4FF00] px-5 py-3 font-mono text-xs font-black uppercase text-zinc-950 transition hover:bg-[#e3ff4d] disabled:opacity-50"
                >
                  <Coins className="h-4 w-4" />
                  <span>
                    Продать все ({filteredInventory.length}) за{" "}
                    {fp(filteredInventory.reduce((s, i) => s + i.price, 0))}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* LEVEL & XP PROGRESS BAR */}
          <div className="mt-5 rounded-xl border border-zinc-800 bg-[#09090B] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award
                  style={{ color: levelInfo.rank.color }}
                  className="h-4 w-4"
                />
                <span className="font-mono text-xs font-black uppercase text-white">
                  Уровень {levelInfo.level} ({levelInfo.rank.title})
                </span>
                <span className="font-mono text-[11px] text-zinc-400">
                  — {levelInfo.rank.perk}
                </span>
              </div>
              <div className="font-mono text-xs font-bold text-[#D4FF00]">
                {levelInfo.xpIntoLevel} / {levelInfo.xpNeededForNext} XP (
                {levelInfo.progressPct}%)
              </div>
            </div>

            <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-zinc-900 p-0.5">
              <div
                style={{
                  width: `${levelInfo.progressPct}%`,
                  backgroundColor: levelInfo.rank.color,
                }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>

            <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-zinc-500">
              <span>Общий опыт: {levelInfo.xp} XP</span>
              {levelInfo.nextRank ? (
                <span>
                  Следующий ранг: {levelInfo.nextRank.ruTitle} (с LVL{" "}
                  {levelInfo.nextRank.minLevel})
                </span>
              ) : (
                <span className="text-[#D4FF00]">
                  Достигнут максимальный ранг GLOBAL ELITE!
                </span>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4">
              <div className="font-mono text-[10px] uppercase text-zinc-500">
                ОТКРЫТО КЕЙСОВ
              </div>
              <div className="mt-1 font-mono text-2xl font-black text-white">
                {user.totalOpened}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4">
              <div className="font-mono text-[10px] uppercase text-zinc-500">
                СДЕЛАНО АПГРЕЙДОВ
              </div>
              <div className="mt-1 font-mono text-2xl font-black text-[#D4FF00]">
                {user.totalUpgraded}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4">
              <div className="font-mono text-[10px] uppercase text-zinc-500">
                СТОИМОСТЬ ИНВЕНТАРЯ
              </div>
              <div className="mt-1 font-mono text-2xl font-black text-white">
                {fp(totalInventoryValue)}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4">
              <div className="font-mono text-[10px] uppercase text-zinc-500">
                НАГРАДА ЗА УРОВЕНЬ
              </div>
              <div className="mt-1 font-mono text-2xl font-black text-emerald-400">
                +{fp(levelInfo.rank.bonusUsd)}
              </div>
            </div>
          </div>
        </div>

        {/* Right Best Drop Showcase */}
        <div className="bg-carbon-pattern flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-black uppercase text-[#D4FF00]">
              <Trophy className="h-4 w-4" />
              <span>ЛУЧШИЙ СКИН В ИНВЕНТАРЕ</span>
            </span>
            {bestDrop && (
              <span className="font-mono text-sm font-black text-white">
                {fp(bestDrop.price)}
              </span>
            )}
          </div>

          {bestDrop ? (
            <>
              <div
                onClick={() => setInspectedItem(bestDrop)}
                className="my-4 flex h-40 cursor-pointer items-center justify-center"
              >
                <img
                  src={bestDrop.skin.imageUrl}
                  alt={bestDrop.skin.name}
                  className="animate-weapon-hover h-36 w-56 object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.9)]"
                />
              </div>
              <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
                <div>
                  <div className="font-mono text-[10px] uppercase text-zinc-400">
                    {bestDrop.skin.weapon} • {bestDrop.wear}
                  </div>
                  <div className="font-display text-base font-black text-white">
                    {bestDrop.skin.skinName}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setInspectedItem(bestDrop)}
                    className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-2 font-mono text-xs font-bold text-white hover:border-[#D4FF00] hover:text-[#D4FF00]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>360°</span>
                  </button>
                  <Link
                    href={`/upgrader?item=${bestDrop.id}`}
                    className="rounded-lg bg-zinc-800 px-3 py-2 font-mono text-xs font-black uppercase text-[#D4FF00] hover:bg-[#D4FF00] hover:text-zinc-950"
                  >
                    В апгрейд
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="my-auto py-12 text-center text-xs text-zinc-500">
              Инвентарь пока пуст — открой кейс или сделай апгрейд!
            </div>
          )}
        </div>
      </div>

      {/* TABS & FILTERS */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition ${
              activeTab === "inventory"
                ? "bg-[#D4FF00] text-zinc-950"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            <UserIcon className="h-4 w-4" />
            <span>Инвентарь ({inventory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("levels")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition ${
              activeTab === "levels"
                ? "bg-[#D4FF00] text-zinc-950"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            <Crown className="h-4 w-4" />
            <span>Уровни и Ранги (LVL {levelInfo.level})</span>
          </button>

          <button
            onClick={() => setActiveTab("cases")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition ${
              activeTab === "cases"
                ? "bg-[#D4FF00] text-zinc-950"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            <Box className="h-4 w-4" />
            <span>История кейсов ({caseHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("upgrades")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition ${
              activeTab === "upgrades"
                ? "bg-[#D4FF00] text-zinc-950"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            <Flame className="h-4 w-4" />
            <span>История апгрейдов ({upgradeHistory.length})</span>
          </button>
        </div>

        {activeTab === "inventory" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-zinc-800 bg-[#09090B] p-1">
              {[
                { id: "ALL", label: "Все" },
                { id: "CASE", label: "Из кейсов" },
                { id: "UPGRADE", label: "Апгрейды" },
                { id: "CONTRACT", label: "Контракты" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setOriginFilter(f.id)}
                  className={`rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold uppercase transition ${
                    originFilter === f.id
                      ? "bg-zinc-800 text-[#D4FF00]"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск в инвентаре..."
                className="w-full rounded-xl border border-zinc-800 bg-[#09090B] py-2 pl-9 pr-7 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00] focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: FULL INVENTORY */}
      {activeTab === "inventory" && (
        <div className="mt-6">
          {filteredInventory.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-[#111115] py-20 text-center">
              <p className="text-sm font-bold text-zinc-300">
                В этой категории инвентаря пока нет скинов
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <Link
                  href="/cases"
                  className="rounded-xl bg-[#D4FF00] px-5 py-2.5 text-xs font-black uppercase text-zinc-950"
                >
                  Открыть кейсы
                </Link>
                <Link
                  href="/upgrader"
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-xs font-bold uppercase text-white"
                >
                  Перейти в апгрейдер
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filteredInventory.map((item) => {
                const theme = getRarityTheme(item.skin.rarity);
                const badge = originBadgeLabel(item.obtainedFrom);
                const { nameTag } = parseCaseAndNameTag(item.caseName);
                return (
                  <div
                    key={item.id}
                    style={{
                      background: `linear-gradient(180deg, #14141A 0%, ${theme.bgGlow} 160%)`,
                    }}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800 p-3.5 transition hover:-translate-y-1 hover:border-zinc-600"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-black uppercase ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      <span className="font-mono text-xs font-black text-white">
                        {fp(item.price)}
                      </span>
                    </div>

                    <div
                      onClick={() => setInspectedItem(item)}
                      title="Нажми для 360° HD осмотра скина"
                      className="relative my-3 flex h-24 cursor-pointer items-center justify-center"
                    >
                      <img
                        src={item.skin.imageUrl}
                        alt={item.skin.name}
                        className="h-20 w-32 object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.85)] transition-transform group-hover:scale-105"
                      />
                      {nameTag && (
                        <span className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded border border-amber-400/50 bg-zinc-950/90 px-1.5 py-0.5 font-mono text-[8px] font-black text-[#D4FF00]">
                          <Tag className="h-2 w-2" />«{nameTag}»
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>{item.skin.weapon}</span>
                        <span className="font-mono font-bold">
                          {item.isStatTrak ? "ST™ " : ""}
                          {item.wear}
                        </span>
                      </div>
                      <div className="truncate text-xs font-extrabold text-white">
                        {item.skin.skinName}
                      </div>
                      <div className="mt-0.5 font-mono text-[9px] text-zinc-500">
                        Float: {item.floatValue.toFixed(6)}
                      </div>

                      <div className="mt-2.5 flex gap-1.5">
                        <button
                          disabled={isPending}
                          onClick={() => handleSellOne(item.id)}
                          className="flex-1 rounded-lg bg-zinc-800 py-1.5 font-mono text-[10px] font-bold text-white transition hover:bg-[#D4FF00] hover:text-zinc-950"
                        >
                          Продать
                        </button>
                        <button
                          type="button"
                          onClick={() => setInspectedItem(item)}
                          title="Интерактивный 360° осмотр и именной ярлык"
                          className="flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-[10px] font-bold text-zinc-300 hover:border-[#D4FF00] hover:text-[#D4FF00]"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <Link
                          href={`/upgrader?item=${item.id}`}
                          className="flex items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-[10px] font-black uppercase text-[#D4FF00] hover:border-[#D4FF00]"
                        >
                          UPG
                        </Link>
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
          )}
        </div>
      )}

      {/* TAB 2: LEVELS & RANKS ROADMAP */}
      {activeTab === "levels" && (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {RANK_TIERS.map((tier) => {
              const isCurrent = levelInfo.rank.title === tier.title;
              const isUnlocked = levelInfo.level >= tier.minLevel;

              return (
                <div
                  key={tier.title}
                  style={{
                    borderColor: isCurrent
                      ? tier.color
                      : isUnlocked
                      ? "rgba(255,255,255,0.16)"
                      : "rgba(39,39,42,0.8)",
                  }}
                  className={`relative flex flex-col justify-between rounded-2xl border-2 bg-[#111115] p-5 transition ${
                    isCurrent ? "shadow-[0_0_30px_rgba(212,255,0,0.12)]" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        style={{
                          color: tier.color,
                          backgroundColor: tier.bgBadge,
                        }}
                        className="rounded-md px-2.5 py-1 font-mono text-[11px] font-black uppercase"
                      >
                        LVL {tier.minLevel}
                        {tier.maxLevel < 500 ? `–${tier.maxLevel}` : "+"}
                      </span>

                      {isCurrent ? (
                        <span className="rounded bg-[#D4FF00] px-2 py-0.5 font-mono text-[10px] font-black uppercase text-zinc-950">
                          ТВОЙ РАНГ
                        </span>
                      ) : isUnlocked ? (
                        <span className="font-mono text-[10px] font-bold uppercase text-emerald-400">
                          ОТКРЫТО
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] font-bold uppercase text-zinc-500">
                          ЗАКРЫТО
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 font-display text-xl font-black uppercase text-white">
                      {tier.ruTitle}
                    </h3>
                    <div
                      style={{ color: tier.color }}
                      className="font-mono text-xs font-bold uppercase"
                    >
                      {tier.title}
                    </div>
                    <p className="mt-2 text-xs text-zinc-400">{tier.perk}</p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                    <span className="font-mono text-[10px] uppercase text-zinc-500">
                      Бонус за уровень:
                    </span>
                    <span className="font-mono text-sm font-black text-[#D4FF00]">
                      +{fp(tier.bonusUsd)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CASE HISTORY */}
      {activeTab === "cases" && (
        <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {caseHistory.map((h) => {
            const theme = getRarityTheme(h.rarity);
            return (
              <div
                key={h.id}
                style={{
                  background: `linear-gradient(180deg, #14141A 0%, ${theme.bgGlow} 160%)`,
                }}
                className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800 p-3.5"
              >
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="text-zinc-400">{h.caseName}</span>
                  <span className="font-black text-[#D4FF00]">
                    {fp(h.price)}
                  </span>
                </div>
                <div className="my-3 flex h-20 items-center justify-center">
                  <img
                    src={h.imageUrl}
                    alt={h.skinName}
                    className="h-16 w-28 object-contain"
                  />
                </div>
                <div className="truncate text-xs font-bold text-white">
                  {h.skinName}
                </div>
                <div
                  style={{ backgroundColor: theme.color }}
                  className="absolute bottom-0 left-0 right-0 h-[3px]"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: UPGRADE HISTORY */}
      {activeTab === "upgrades" && (
        <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {upgradeHistory.map((u) => (
            <div
              key={u.id}
              className={`flex flex-col justify-between rounded-xl border p-3.5 ${
                u.isSuccess
                  ? "border-[#D4FF00]/50 bg-[#D4FF00]/[0.05]"
                  : "border-zinc-800 bg-[#111115]"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px]">
                <span
                  className={
                    u.isSuccess
                      ? "font-black text-[#D4FF00]"
                      : "font-bold text-rose-400"
                  }
                >
                  {u.isSuccess ? "УСПЕХ" : "СГОРЕЛ"} ({u.chance.toFixed(1)}%)
                </span>
                <span className="text-zinc-400">
                  {fp(u.sourceValue)} → {fp(u.targetPrice)}
                </span>
              </div>
              <div className="my-3 flex h-20 items-center justify-center">
                <img
                  src={u.targetImageUrl}
                  alt={u.targetSkinName}
                  className="h-16 w-28 object-contain"
                />
              </div>
              <div className="truncate text-xs font-bold text-white">
                {u.targetSkinName}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Avatar & Nickname Modal on Profile Page */}
      {showAvatarModal && (
        <div
          onClick={() => setShowAvatarModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#111115] p-6 shadow-2xl"
          >
            <button
              onClick={() => setShowAvatarModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display text-lg font-black uppercase text-white">
              Настройка профиля и аватарки
            </h3>

            <form onSubmit={handleSaveAvatarAndName} className="mt-4 space-y-4">
              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Никнейм на сайте
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#09090B] px-3.5 py-2.5 text-sm font-bold text-white focus:border-[#D4FF00] focus:outline-none"
                />
              </div>

              <AvatarCropper
                initialPreviewUrl={resolveAvatarUrl(
                  customUrl.trim() || editAvatar
                )}
                onApplyCroppedDataUrl={(croppedDataUrl) => {
                  setEditAvatar(croppedDataUrl);
                  setCustomUrl("");
                }}
              />

              <div>
                <div className="mb-2 font-mono text-[11px] font-bold uppercase text-zinc-400">
                  Или выбери готовую эмблему:
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                  {AVATAR_PRESETS.map((preset) => {
                    const active =
                      !customUrl.trim() && editAvatar === preset.id;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => {
                          setEditAvatar(preset.id);
                          setCustomUrl("");
                        }}
                        className={`relative flex justify-center rounded-xl border p-1.5 transition ${
                          active
                            ? "border-[#D4FF00] bg-[#D4FF00]/15"
                            : "border-zinc-800 bg-[#09090B]"
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="h-10 w-10 rounded-lg"
                        />
                        {active && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4FF00] text-zinc-950">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-[#D4FF00] py-3 font-display text-sm font-black uppercase text-zinc-950 transition hover:bg-[#e2ff33]"
              >
                Сохранить аватарку и ник
              </button>
            </form>
          </div>
        </div>
      )}
      {/* 360° / HD Skin Inspector Modal */}
      {inspectedItem && (
        <SkinInspectorModal
          item={inspectedItem}
          onClose={() => setInspectedItem(null)}
          onSell={(id) => handleSellOne(id)}
          onRenamed={(id, newCaseName) => {
            setInventory((prev) =>
              prev.map((i) =>
                i.id === id ? { ...i, caseName: newCaseName } : i
              )
            );
            setInspectedItem((prev) =>
              prev && prev.id === id ? { ...prev, caseName: newCaseName } : prev
            );
          }}
        />
      )}
    </div>
  );
}
