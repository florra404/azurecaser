"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Check,
  Coins,
  Crown,
  Database,
  Flame,
  Gift,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Ticket,
  Trash2,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { getRarityTheme, useFormatPrice } from "@/lib/rarity";
import { useAppStore } from "@/lib/store";
import { soundEngine } from "@/lib/sound";
import { getLevelInfo, resolveAvatarUrl } from "@/lib/levels";
import { PromoCodeRecord } from "@/lib/promocodes";
import {
  adminClearInventoryAction,
  adminCreateCustomCaseAction,
  adminCreatePromoAction,
  adminDeletePromoAction,
  adminGiveGodPackAction,
  adminGiveSkinAction,
  adminRunFullRebalanceAction,
  adminSetBalanceAndLevelAction,
  adminSwitchUserSessionAction,
  adminTriggerLiveDropRainAction,
  adminUpdateCaseAction,
} from "@/app/actions/admin";

interface AdminSkinItem {
  id: string;
  name: string;
  weapon: string;
  skinName: string;
  rarity: string;
  basePrice: number;
  imageUrl: string;
}

interface AdminCaseItem {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  oldPrice: number | null;
  badge: string | null;
  imageUrl: string;
  categoryName: string;
  itemsCount: number;
}

interface AdminUserItem {
  id: string;
  username: string;
  avatar: string;
  balance: number;
  level: number;
  xp: number;
  totalOpened: number;
  totalUpgraded: number;
}

interface AdminCategoryOption {
  id: string;
  name: string;
}

interface AdminClientProps {
  currentUser: AdminUserItem;
  allUsers: AdminUserItem[];
  allSkins: AdminSkinItem[];
  allCases: AdminCaseItem[];
  categories: AdminCategoryOption[];
  initialPromocodes: PromoCodeRecord[];
}

export default function AdminClient({
  currentUser,
  allUsers,
  allSkins,
  allCases,
  categories,
  initialPromocodes,
}: AdminClientProps) {
  const router = useRouter();
  const { setBalance, setInventoryCount } = useAppStore();
  const { fp } = useFormatPrice();

  const [activeTab, setActiveTab] = useState<
    "cheats" | "spawner" | "cases" | "promos" | "users"
  >("cheats");
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Exact balance / XP inputs
  const [exactBalanceInput, setExactBalanceInput] = useState<string>(
    String(currentUser.balance)
  );

  // Skin Spawner filters & parameters
  const [skinSearch, setSkinSearch] = useState<string>("");
  const [skinRarityFilter, setSkinRarityFilter] = useState<string>("ALL");
  const [spawnWear, setSpawnWear] = useState<string>("FN");
  const [spawnFloat, setSpawnFloat] = useState<string>("0.000777");
  const [spawnStatTrak, setSpawnStatTrak] = useState<boolean>(true);
  const [spawnQty, setSpawnQty] = useState<number>(1);
  const [spawnTargetUserId, setSpawnTargetUserId] = useState<string>(
    currentUser.id
  );

  // Custom Case Builder state
  const [newCaseName, setNewCaseName] = useState<string>("");
  const [newCaseSubtitle, setNewCaseSubtitle] = useState<string>(
    "Особая сборка администратора"
  );
  const [newCasePrice, setNewCasePrice] = useState<string>("49");
  const [newCaseBadge, setNewCaseBadge] = useState<string>("VIPERR");
  const [newCaseCategoryId, setNewCaseCategoryId] = useState<string>(
    categories[0]?.id || ""
  );
  const [newCaseHeroSkinId, setNewCaseHeroSkinId] = useState<string>(
    allSkins[0]?.id || ""
  );

  // Case inline price edit map
  const [casePriceEdits, setCasePriceEdits] = useState<Record<string, string>>(
    {}
  );
  const [caseBadgeEdits, setCaseBadgeEdits] = useState<Record<string, string>>(
    {}
  );

  // Promo Code Builder state
  const [promoCode, setPromoCode] = useState<string>("");
  const [promoDesc, setPromoDesc] = useState<string>("");
  const [promoType, setPromoType] = useState<"BALANCE" | "SKIN" | "XP">(
    "BALANCE"
  );
  const [promoAmount, setPromoAmount] = useState<string>("500");
  const [promoSkinName, setPromoSkinName] = useState<string>(
    allSkins[0]?.name || "AWP | Dragon Lore"
  );
  const [promoWear, setPromoWear] = useState<"FN" | "MW" | "FT" | "WW" | "BS">(
    "FN"
  );
  const [promoMaxUses, setPromoMaxUses] = useState<string>("50");

  const filteredSkins = useMemo(() => {
    const q = skinSearch.trim().toLowerCase();
    return allSkins
      .filter((s) => {
        if (skinRarityFilter !== "ALL" && s.rarity !== skinRarityFilter) {
          return false;
        }
        if (q && !s.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .slice(0, 60);
  }, [allSkins, skinSearch, skinRarityFilter]);

  const notify = (msg: string) => {
    setStatusBanner(msg);
    soundEngine.playCashout();
  };

  const handleQuickBalanceAndXp = (opts: {
    balance?: number;
    addBalance?: number;
    xp?: number;
    addXp?: number;
    userId?: string;
  }) => {
    startTransition(async () => {
      const res = await adminSetBalanceAndLevelAction(opts);
      if (res.ok) {
        if (
          (!opts.userId || opts.userId === currentUser.id) &&
          typeof res.newBalance === "number"
        ) {
          setBalance(res.newBalance);
          setExactBalanceInput(String(res.newBalance));
        }
        notify(
          `Параметры обновлены! Баланс: $${res.newBalance} • Уровень: LVL ${res.newLevel}`
        );
        router.refresh();
      }
    });
  };

  const handleGiveGodPack = () => {
    startTransition(async () => {
      const res = await adminGiveGodPackAction();
      if (res.ok) {
        if (typeof res.newInventoryCount === "number") {
          setInventoryCount(res.newInventoryCount);
        }
        soundEngine.playWin(true);
        notify(
          `VIPERR GOD PACK выдан! В твой инвентарь добавлено ${res.spawned} легендарных скинов (Dragon Lore, Gungnir, Бабочка Изумруд, Керамбит Сапфир, Wild Lotus, Howl)!`
        );
        router.refresh();
      }
    });
  };

  const handleSpawnSkin = (skin: AdminSkinItem) => {
    startTransition(async () => {
      const res = await adminGiveSkinAction({
        userId: spawnTargetUserId,
        skinId: skin.id,
        wear: spawnWear,
        floatValue: Number(spawnFloat) || 0.001337,
        isStatTrak: spawnStatTrak,
        quantity: spawnQty,
      });
      if (res.ok) {
        if (
          spawnTargetUserId === currentUser.id &&
          typeof res.newInventoryCount === "number"
        ) {
          setInventoryCount(res.newInventoryCount);
        }
        soundEngine.playWin(true);
        notify(
          `Выдано в инвентарь: ${res.skinName} (${spawnWear}${
            spawnStatTrak ? " ST™" : ""
          }) x${res.quantity} шт.!`
        );
        router.refresh();
      }
    });
  };

  const handleFullRebalance = () => {
    startTransition(async () => {
      const res = await adminRunFullRebalanceAction();
      if (res.ok) {
        soundEngine.playWin(true);
        notify(
          `База успешно обновлена! Всего скинов: ${res.totalSkins} (+${res.addedSkins} новых), кейсов: ${res.totalCases}. Все шансы и цены распределены по-честному!`
        );
        router.refresh();
      }
    });
  };

  const handleLiveRain = () => {
    startTransition(async () => {
      const res = await adminTriggerLiveDropRainAction();
      if (res.ok) {
        soundEngine.playWin(true);
        notify("В Live-ленту сверху запущен дождь из 6 редких дропов!");
        router.refresh();
      }
    });
  };

  const handleCreateCustomCase = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await adminCreateCustomCaseAction({
        name: newCaseName,
        subtitle: newCaseSubtitle,
        price: Number(newCasePrice) || 25,
        badge: newCaseBadge,
        categoryId: newCaseCategoryId,
        heroSkinId: newCaseHeroSkinId,
      });
      if (res.ok) {
        setNewCaseName("");
        notify(`Твой новый кейс «${newCaseName}» создан и добавлен в каталог!`);
        router.refresh();
      }
    });
  };

  const handleSaveCaseRow = (cs: AdminCaseItem) => {
    const nextPrice =
      casePriceEdits[cs.id] !== undefined
        ? Number(casePriceEdits[cs.id])
        : cs.price;
    const nextBadge =
      caseBadgeEdits[cs.id] !== undefined ? caseBadgeEdits[cs.id] : cs.badge;

    startTransition(async () => {
      await adminUpdateCaseAction({
        caseId: cs.id,
        price: nextPrice,
        oldPrice: cs.oldPrice,
        badge: nextBadge,
      });
      notify(`Кейс «${cs.name}» обновлён!`);
      router.refresh();
    });
  };

  const handleSwitchUser = (u: AdminUserItem) => {
    startTransition(async () => {
      const res = await adminSwitchUserSessionAction(u.id);
      if (res.ok) {
        if (typeof res.newBalance === "number") {
          setBalance(res.newBalance);
        }
        notify(`Ты переключился на аккаунт ${u.username}!`);
        router.refresh();
      }
    });
  };

  return (
    <div className="mx-auto max-w-[1640px] px-4 py-8 lg:px-8">
      {/* Top Root Admin Header */}
      <div className="bg-carbon-pattern relative overflow-hidden rounded-3xl border border-[#D4FF00]/40 bg-[#111115] p-6 shadow-[0_0_50px_rgba(212,255,0,0.08)] lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-[#D4FF00] px-3 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-zinc-950">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>ROOT ПАНЕЛЬ УПРАВЛЕНИЯ // VIPERR ADMIN</span>
            </div>
            <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
              ЦЕНТР УПРАВЛЕНИЯ ПРОЕКТОМ{" "}
              <span className="text-[#D4FF00]">AZURECASER</span>
            </h1>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
              Полный контроль над балансом, инвентарём, выдачей любых из{" "}
              {allSkins.length} скинов, {allCases.length} кейсами и аккаунтами
              игроков
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              disabled={isPending}
              onClick={handleGiveGodPack}
              className="flex items-center gap-2 rounded-xl bg-[#D4FF00] px-5 py-3 font-mono text-xs font-black uppercase text-zinc-950 shadow-[0_0_25px_rgba(212,255,0,0.3)] transition hover:bg-[#e3ff4d] disabled:opacity-50"
            >
              <Crown className="h-4 w-4" />
              <span>Выдать GOD PACK (8 топ-скинов)</span>
            </button>

            <button
              disabled={isPending}
              onClick={handleFullRebalance}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-xs font-bold uppercase text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00] disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`}
              />
              <span>Честный ребаланс всех кейсов</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4">
            <div className="font-mono text-[10px] uppercase text-zinc-500">
              СКИНОВ В БАЗЕ
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-[#D4FF00]">
              {allSkins.length}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4">
            <div className="font-mono text-[10px] uppercase text-zinc-500">
              АКТИВНЫХ КЕЙСОВ
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-white">
              {allCases.length}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4">
            <div className="font-mono text-[10px] uppercase text-zinc-500">
              АККАУНТОВ ИГРОКОВ
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-cyan-400">
              {allUsers.length}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-[#09090B] p-4">
            <div className="font-mono text-[10px] uppercase text-zinc-500">
              ТВОЙ ТЕКУЩИЙ СЧЁТ
            </div>
            <div className="mt-1 font-mono text-2xl font-black text-emerald-400">
              {fp(currentUser.balance)}
            </div>
          </div>
        </div>
      </div>

      {/* Status Notification */}
      {statusBanner && (
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#D4FF00]/50 bg-[#D4FF00]/15 px-5 py-3.5 text-xs font-black text-[#D4FF00]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span>{statusBanner}</span>
          </div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-zinc-800 pb-4">
        {[
          {
            id: "cheats",
            label: "1. Читы, Баланс и События",
            icon: Zap,
          },
          {
            id: "spawner",
            label: `2. Выдача любого скина (${allSkins.length})`,
            icon: Gift,
          },
          {
            id: "cases",
            label: `3. Редактор и Конструктор кейсов (${allCases.length})`,
            icon: Box,
          },
          {
            id: "promos",
            label: `4. Промокоды и Секретные Ваучеры (${initialPromocodes.length})`,
            icon: Ticket,
          },
          {
            id: "users",
            label: `5. Управление игроками (${allUsers.length})`,
            icon: Users,
          },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() =>
                setActiveTab(
                  t.id as "cheats" | "spawner" | "cases" | "promos" | "users"
                )
              }
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase transition ${
                active
                  ? "bg-[#D4FF00] text-zinc-950 shadow-[0_0_20px_rgba(212,255,0,0.2)]"
                  : "border border-zinc-800 bg-[#111115] text-zinc-400 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: QUICK CHEATS, BALANCE, LEVELS & LIVE EVENTS */}
      {activeTab === "cheats" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Card 1: Balance Control */}
          <div className="rounded-2xl border border-zinc-800 bg-[#111115] p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-xs font-black uppercase text-[#D4FF00]">
                <Coins className="h-4 w-4" />
                <span>УПРАВЛЕНИЕ БАЛАНСОМ</span>
              </div>
              <button
                disabled={isPending}
                onClick={() => handleQuickBalanceAndXp({ balance: 0 })}
                className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 font-mono text-[10px] font-black uppercase text-rose-300 transition hover:bg-rose-500 hover:text-white"
              >
                Обнулить в 0
              </button>
            </div>
            <h3 className="mt-1 font-display text-xl font-black uppercase text-white">
              Начисление и списание средств
            </h3>

            {/* Quick Add */}
            <div className="mt-3 font-mono text-[10px] font-bold uppercase text-zinc-500">
              Быстро начислить (+):
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[500, 2500, 10000, 50000].map((amt) => (
                <button
                  key={`add-${amt}`}
                  disabled={isPending}
                  onClick={() => handleQuickBalanceAndXp({ addBalance: amt })}
                  className="rounded-xl border border-zinc-800 bg-[#09090B] py-2.5 font-mono text-xs font-black text-emerald-400 transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
                >
                  +{fp(amt)}
                </button>
              ))}
            </div>

            {/* Quick Deduct / Take Away */}
            <div className="mt-3 font-mono text-[10px] font-bold uppercase text-rose-400">
              Быстро забрать со счёта (−):
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[500, 2500, 10000, 50000].map((amt) => (
                <button
                  key={`sub-${amt}`}
                  disabled={isPending}
                  onClick={() => handleQuickBalanceAndXp({ addBalance: -amt })}
                  className="rounded-xl border border-rose-500/25 bg-rose-500/10 py-2.5 font-mono text-xs font-black text-rose-300 transition hover:border-rose-500 hover:bg-rose-500/20 hover:text-white"
                >
                  −{fp(amt)}
                </button>
              ))}
            </div>

            <div className="mt-4 border-t border-zinc-800 pt-4">
              <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                Сумма операции или точный баланс (в USD $):
              </label>
              <input
                type="number"
                value={exactBalanceInput}
                onChange={(e) => setExactBalanceInput(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs font-bold text-white focus:border-[#D4FF00] focus:outline-none"
              />
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  disabled={isPending}
                  onClick={() =>
                    handleQuickBalanceAndXp({
                      balance: Math.max(0, Number(exactBalanceInput) || 0),
                    })
                  }
                  className="rounded-xl bg-[#D4FF00] py-2 font-mono text-[11px] font-black uppercase text-zinc-950 transition hover:bg-[#e2ff33]"
                >
                  = Задать
                </button>
                <button
                  disabled={isPending}
                  onClick={() =>
                    handleQuickBalanceAndXp({
                      addBalance: Math.abs(Number(exactBalanceInput) || 0),
                    })
                  }
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-2 font-mono text-[11px] font-black uppercase text-emerald-300 transition hover:bg-emerald-500/25"
                >
                  + Выдать
                </button>
                <button
                  disabled={isPending}
                  onClick={() =>
                    handleQuickBalanceAndXp({
                      addBalance: -Math.abs(Number(exactBalanceInput) || 0),
                    })
                  }
                  className="rounded-xl border border-rose-500/40 bg-rose-500/15 py-2 font-mono text-[11px] font-black uppercase text-rose-300 transition hover:bg-rose-500/25"
                >
                  − Забрать
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Level & Rank Control */}
          <div className="rounded-2xl border border-zinc-800 bg-[#111115] p-6">
            <div className="flex items-center gap-2 font-mono text-xs font-black uppercase text-[#D4FF00]">
              <Crown className="h-4 w-4" />
              <span>УПРАВЛЕНИЕ УРОВНЕМ И РАНГОМ</span>
            </div>
            <h3 className="mt-1 font-display text-xl font-black uppercase text-white">
              Прокачка опыта и престижа
            </h3>

            <div className="mt-4 space-y-2.5">
              <button
                disabled={isPending}
                onClick={() => handleQuickBalanceAndXp({ addXp: 1750 })}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-3 font-mono text-xs font-bold text-white transition hover:border-[#D4FF00]"
              >
                <span>Повысить на +5 уровней</span>
                <span className="text-[#D4FF00]">+1,750 XP</span>
              </button>

              <button
                disabled={isPending}
                onClick={() => handleQuickBalanceAndXp({ addXp: 7000 })}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-3 font-mono text-xs font-bold text-white transition hover:border-[#D4FF00]"
              >
                <span>Повысить на +20 уровней</span>
                <span className="text-[#D4FF00]">+7,000 XP</span>
              </button>

              <button
                disabled={isPending}
                onClick={() => handleQuickBalanceAndXp({ xp: 28000 })}
                className="flex w-full items-center justify-between rounded-xl border border-[#D4FF00]/50 bg-[#D4FF00]/15 px-4 py-3 font-mono text-xs font-black text-[#D4FF00] transition hover:bg-[#D4FF00] hover:text-zinc-950"
              >
                <span>Выдать ранг GLOBAL ELITE</span>
                <span>LVL 81</span>
              </button>

              <button
                disabled={isPending}
                onClick={() => handleQuickBalanceAndXp({ xp: 0 })}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-2.5 font-mono text-[11px] text-zinc-400 hover:text-rose-400"
              >
                <span>Сбросить уровень до LVL 1</span>
                <span>0 XP</span>
              </button>
            </div>
          </div>

          {/* Card 3: Special Server Actions */}
          <div className="rounded-2xl border border-zinc-800 bg-[#111115] p-6">
            <div className="flex items-center gap-2 font-mono text-xs font-black uppercase text-[#D4FF00]">
              <Wand2 className="h-4 w-4" />
              <span>СПЕЦ-ФУНКЦИИ СЕРВЕРА</span>
            </div>
            <h3 className="mt-1 font-display text-xl font-black uppercase text-white">
              Ивенты, инвентарь и база
            </h3>

            <div className="mt-4 space-y-2.5">
              <button
                disabled={isPending}
                onClick={handleGiveGodPack}
                className="flex w-full items-center justify-between rounded-xl bg-[#D4FF00] px-4 py-3 font-mono text-xs font-black uppercase text-zinc-950 transition hover:bg-[#e3ff4d]"
              >
                <span>Спавн VIPERR GOD PACK</span>
                <span>+8 скинов</span>
              </button>

              <button
                disabled={isPending}
                onClick={handleLiveRain}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-3 font-mono text-xs font-bold text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
              >
                <span>Запустить дождь дропов в Live-ленту</span>
                <Flame className="h-4 w-4 text-[#D4FF00]" />
              </button>

              <button
                disabled={isPending}
                onClick={handleFullRebalance}
                className="flex w-full items-center justify-between rounded-xl border border-zinc-800 bg-[#09090B] px-4 py-3 font-mono text-xs font-bold text-white transition hover:border-[#D4FF00] hover:text-[#D4FF00]"
              >
                <span>Пересобрать все 52 кейса по-честному</span>
                <Database className="h-4 w-4 text-cyan-400" />
              </button>

              <button
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await adminClearInventoryAction(currentUser.id);
                    setInventoryCount(0);
                    notify("Твой инвентарь полностью очищен!");
                    router.refresh();
                  });
                }}
                className="flex w-full items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 font-mono text-xs font-bold text-rose-300 transition hover:bg-rose-500/20"
              >
                <span>Очистить свой инвентарь</span>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SKIN SPAWNER (GIVE ANY OF 750+ SKINS) */}
      {activeTab === "spawner" && (
        <div className="mt-6 space-y-5">
          {/* Spawner Controls Bar */}
          <div className="grid gap-4 rounded-2xl border border-zinc-800 bg-[#111115] p-5 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                Поиск среди {allSkins.length} скинов:
              </label>
              <div className="relative mt-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={skinSearch}
                  onChange={(e) => setSkinSearch(e.target.value)}
                  placeholder="Dragon Lore, Butterfly, Karambit, Printstream..."
                  className="w-full rounded-xl border border-zinc-800 bg-[#09090B] py-2.5 pl-9 pr-4 text-xs text-white focus:border-[#D4FF00] focus:outline-none"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                Кому выдать:
              </label>
              <select
                value={spawnTargetUserId}
                onChange={(e) => setSpawnTargetUserId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2.5 text-xs font-bold text-white focus:border-[#D4FF00] focus:outline-none"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username} (LVL {u.level})
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                Качество (Wear):
              </label>
              <select
                value={spawnWear}
                onChange={(e) => setSpawnWear(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2.5 font-mono text-xs font-bold text-white focus:border-[#D4FF00] focus:outline-none"
              >
                <option value="FN">FN (Прямо с завода)</option>
                <option value="MW">MW (Немного поношенное)</option>
                <option value="FT">FT (После полевых)</option>
                <option value="WW">WW (Поношенное)</option>
                <option value="BS">BS (Закалённое в боях)</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                Float Value:
              </label>
              <input
                type="text"
                value={spawnFloat}
                onChange={(e) => setSpawnFloat(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3 py-2.5 font-mono text-xs font-bold text-[#D4FF00] focus:border-[#D4FF00] focus:outline-none"
              />
            </div>

            <div className="flex items-end gap-2 lg:col-span-2">
              <button
                type="button"
                onClick={() => setSpawnStatTrak(!spawnStatTrak)}
                className={`flex-1 rounded-xl border py-2.5 font-mono text-xs font-black uppercase transition ${
                  spawnStatTrak
                    ? "border-orange-500 bg-orange-500/20 text-orange-400"
                    : "border-zinc-800 bg-[#09090B] text-zinc-500"
                }`}
              >
                StatTrak™ {spawnStatTrak ? "ON" : "OFF"}
              </button>

              <select
                value={spawnQty}
                onChange={(e) => setSpawnQty(Number(e.target.value))}
                className="rounded-xl border border-zinc-800 bg-[#09090B] px-2.5 py-2.5 font-mono text-xs font-black text-white"
              >
                {[1, 2, 3, 5, 10].map((q) => (
                  <option key={q} value={q}>
                    x{q}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rarity Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "ALL", label: "Все редкости" },
              { id: "GOLD", label: "★ Ножи и Перчатки (GOLD)" },
              { id: "COVERT", label: "Тайное (COVERT)" },
              { id: "CLASSIFIED", label: "Засекреченное" },
              { id: "RESTRICTED", label: "Запрещённое" },
              { id: "MIL_SPEC", label: "Армейское" },
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setSkinRarityFilter(r.id)}
                className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold uppercase transition ${
                  skinRarityFilter === r.id
                    ? "bg-[#D4FF00] text-zinc-950"
                    : "border border-zinc-800 bg-[#111115] text-zinc-400 hover:text-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Skins Grid to Spawn */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filteredSkins.map((skin) => {
              const theme = getRarityTheme(skin.rarity);
              return (
                <div
                  key={skin.id}
                  style={{
                    background: `linear-gradient(180deg, #14141A 0%, ${theme.bgGlow} 165%)`,
                  }}
                  className="flex flex-col justify-between overflow-hidden rounded-2xl border border-zinc-800 p-3.5 transition hover:border-[#D4FF00]"
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="truncate text-zinc-400">
                      {skin.weapon}
                    </span>
                    <span className="font-black text-[#D4FF00]">
                      {fp(skin.basePrice)}
                    </span>
                  </div>

                  <div className="my-3 flex h-24 items-center justify-center">
                    <img
                      src={skin.imageUrl}
                      alt={skin.name}
                      className="h-20 w-32 object-contain drop-shadow-[0_12px_16px_rgba(0,0,0,0.9)]"
                    />
                  </div>

                  <div>
                    <div className="truncate text-xs font-black text-white">
                      {skin.skinName}
                    </div>
                    <button
                      disabled={isPending}
                      onClick={() => handleSpawnSkin(skin)}
                      className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl bg-[#D4FF00] py-2 font-mono text-[11px] font-black uppercase text-zinc-950 transition hover:bg-[#e2ff33] disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[3]" />
                      <span>Выдать x{spawnQty}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: CASE EDITOR & CUSTOM CASE BUILDER */}
      {activeTab === "cases" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Left: Custom Case Creator */}
          <div className="rounded-2xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-4 lg:h-fit">
            <div className="font-mono text-xs font-black uppercase text-[#D4FF00]">
              КОНСТРУКТОР КЕЙСОВ
            </div>
            <h3 className="mt-1 font-display text-xl font-black uppercase text-white">
              Создать свой кейс на сайте
            </h3>

            <form onSubmit={handleCreateCustomCase} className="mt-4 space-y-3.5">
              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Название кейса *
                </label>
                <input
                  type="text"
                  required
                  value={newCaseName}
                  onChange={(e) => setNewCaseName(e.target.value)}
                  placeholder="Например: VIPERR SECRET VAULT"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs font-bold text-white focus:border-[#D4FF00] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Подзаголовок
                </label>
                <input
                  type="text"
                  value={newCaseSubtitle}
                  onChange={(e) => setNewCaseSubtitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-white focus:border-[#D4FF00] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                    Цена (в USD $)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={newCasePrice}
                    onChange={(e) => setNewCasePrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs font-bold text-[#D4FF00] focus:border-[#D4FF00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                    Бейдж
                  </label>
                  <input
                    type="text"
                    value={newCaseBadge}
                    onChange={(e) => setNewCaseBadge(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs font-bold text-white focus:border-[#D4FF00] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Категория
                </label>
                <select
                  value={newCaseCategoryId}
                  onChange={(e) => setNewCaseCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs font-bold text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Главный скин на обложке кейса
                </label>
                <select
                  value={newCaseHeroSkinId}
                  onChange={(e) => setNewCaseHeroSkinId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs font-bold text-white"
                >
                  {allSkins.slice(0, 120).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (${s.basePrice})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-[#D4FF00] py-3 font-display text-sm font-black uppercase text-zinc-950 transition hover:bg-[#e2ff33]"
              >
                Создать кейс и наполнить дропом
              </button>
            </form>
          </div>

          {/* Right: Live Case Price & Badge Editor */}
          <div className="space-y-3 lg:col-span-8">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {allCases.map((cs) => (
                <div
                  key={cs.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-[#111115] p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={cs.imageUrl}
                      alt={cs.name}
                      className="h-12 w-16 shrink-0 object-contain"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-xs font-black uppercase text-white">
                        {cs.name}
                      </div>
                      <div className="font-mono text-[10px] text-zinc-500">
                        {cs.categoryName} • {cs.itemsCount} ск.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      step="0.5"
                      value={
                        casePriceEdits[cs.id] !== undefined
                          ? casePriceEdits[cs.id]
                          : cs.price
                      }
                      onChange={(e) =>
                        setCasePriceEdits((prev) => ({
                          ...prev,
                          [cs.id]: e.target.value,
                        }))
                      }
                      className="w-20 rounded-lg border border-zinc-800 bg-[#09090B] px-2 py-1.5 font-mono text-xs font-bold text-[#D4FF00]"
                    />
                    <input
                      type="text"
                      placeholder="Бейдж"
                      value={
                        caseBadgeEdits[cs.id] !== undefined
                          ? caseBadgeEdits[cs.id]
                          : cs.badge || ""
                      }
                      onChange={(e) =>
                        setCaseBadgeEdits((prev) => ({
                          ...prev,
                          [cs.id]: e.target.value,
                        }))
                      }
                      className="w-20 rounded-lg border border-zinc-800 bg-[#09090B] px-2 py-1.5 font-mono text-xs text-white"
                    />
                    <button
                      disabled={isPending}
                      onClick={() => handleSaveCaseRow(cs)}
                      className="rounded-lg bg-[#D4FF00] p-2 text-zinc-950 transition hover:bg-[#e2ff33]"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PROMOCODES & SECRET VOUCHERS */}
      {activeTab === "promos" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Left: Create Promo Code or Skin Voucher */}
          <div className="rounded-2xl border border-zinc-800 bg-[#111115] p-6 lg:col-span-4 lg:h-fit">
            <div className="font-mono text-xs font-black uppercase text-[#D4FF00]">
              ГЕНЕРАТОР ПРОМОКОДОВ И ВАУЧЕРОВ
            </div>
            <h3 className="mt-1 font-display text-xl font-black uppercase text-white">
              Создать секретный код
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const res = await adminCreatePromoAction({
                    code: promoCode,
                    description: promoDesc,
                    rewardType: promoType,
                    amount: Number(promoAmount) || 100,
                    skinName: promoSkinName,
                    wear: promoWear,
                    isStatTrak: true,
                    maxUses: Number(promoMaxUses) || 50,
                  });
                  if (res.ok) {
                    notify(`Промокод «${promoCode.toUpperCase()}» создан!`);
                    setPromoCode("");
                    setPromoDesc("");
                    router.refresh();
                  }
                });
              }}
              className="mt-4 space-y-3.5"
            >
              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Код активации *
                </label>
                <input
                  type="text"
                  required
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Напр.: VIPERR2026 или SECRETDRAGON"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs font-black uppercase text-[#D4FF00] focus:border-[#D4FF00] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Описание награды
                </label>
                <input
                  type="text"
                  value={promoDesc}
                  onChange={(e) => setPromoDesc(e.target.value)}
                  placeholder="Секретный подгон от админа"
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs text-white focus:border-[#D4FF00] focus:outline-none"
                />
              </div>

              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Тип награды
                </label>
                <div className="mt-1 grid grid-cols-3 gap-1.5">
                  {[
                    { id: "BALANCE", label: "Деньги ($)" },
                    { id: "SKIN", label: "Скин в инв." },
                    { id: "XP", label: "Опыт (XP)" },
                  ].map((rt) => (
                    <button
                      type="button"
                      key={rt.id}
                      onClick={() =>
                        setPromoType(rt.id as "BALANCE" | "SKIN" | "XP")
                      }
                      className={`rounded-xl border py-2 font-mono text-[11px] font-black uppercase transition ${
                        promoType === rt.id
                          ? "border-[#D4FF00] bg-[#D4FF00] text-zinc-950"
                          : "border-zinc-800 bg-[#09090B] text-zinc-400"
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                </div>
              </div>

              {promoType === "SKIN" ? (
                <div className="space-y-3">
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                      Какой скин выдавать по ваучеру:
                    </label>
                    <select
                      value={promoSkinName}
                      onChange={(e) => setPromoSkinName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 text-xs font-bold text-white"
                    >
                      {allSkins.slice(0, 150).map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name} (${s.basePrice})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                      Качество скина (Wear):
                    </label>
                    <select
                      value={promoWear}
                      onChange={(e) =>
                        setPromoWear(
                          e.target.value as "FN" | "MW" | "FT" | "WW" | "BS"
                        )
                      }
                      className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs font-bold text-[#D4FF00]"
                    >
                      <option value="FN">FN (Прямо с завода ×1.35)</option>
                      <option value="MW">MW (Немного поношенное ×1.05)</option>
                      <option value="FT">FT (После полевых ×0.82)</option>
                      <option value="WW">WW (Поношенное ×0.64)</option>
                      <option value="BS">BS (Закалённое в боях ×0.48)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                    {promoType === "BALANCE"
                      ? "Сумма начисления (в USD $)"
                      : "Количество опыта (XP)"}
                  </label>
                  <input
                    type="number"
                    value={promoAmount}
                    onChange={(e) => setPromoAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs font-bold text-[#D4FF00]"
                  />
                </div>
              )}

              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Лимит активаций (макс. раз)
                </label>
                <input
                  type="number"
                  value={promoMaxUses}
                  onChange={(e) => setPromoMaxUses(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-zinc-800 bg-[#09090B] px-3.5 py-2.5 font-mono text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-[#D4FF00] py-3 font-display text-sm font-black uppercase text-zinc-950 transition hover:bg-[#e2ff33]"
              >
                Создать промокод / ваучер
              </button>
            </form>
          </div>

          {/* Right: Active Promocodes List */}
          <div className="space-y-3 lg:col-span-8">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {initialPromocodes.map((p) => (
                <div
                  key={p.code}
                  className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-[#111115] p-5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-lg border border-[#D4FF00]/40 bg-[#D4FF00]/15 px-3 py-1 font-mono text-sm font-black tracking-wider text-[#D4FF00]">
                        {p.code}
                      </span>
                      <span className="font-mono text-xs text-zinc-400">
                        Использовано:{" "}
                        <strong className="text-white">
                          {p.usedBy.length}
                        </strong>{" "}
                        / {p.maxUses}
                      </span>
                    </div>

                    <p className="mt-3 text-xs font-bold text-white">
                      {p.description}
                    </p>

                    <div className="mt-2 font-mono text-xs text-zinc-400">
                      Награда:{" "}
                      {p.rewardType === "BALANCE" && (
                        <strong className="text-emerald-400">
                          +{fp(p.amount)} на баланс
                        </strong>
                      )}
                      {p.rewardType === "SKIN" && (
                        <strong className="text-[#D4FF00]">
                          Скин {p.skinName} ({p.wear})
                        </strong>
                      )}
                      {p.rewardType === "XP" && (
                        <strong className="text-cyan-400">
                          +{p.amount} XP к уровню
                        </strong>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-zinc-800 pt-3">
                    <span className="font-mono text-[10px] text-zinc-500">
                      Вводить в окне «Промокод» сверху
                    </span>
                    <button
                      disabled={isPending}
                      onClick={() => {
                        startTransition(async () => {
                          await adminDeletePromoAction(p.code);
                          notify(`Промокод ${p.code} удалён`);
                          router.refresh();
                        });
                      }}
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-rose-300 hover:bg-rose-500/20"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: USERS MANAGER */}
      {activeTab === "users" && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allUsers.map((u) => {
            const isMe = u.id === currentUser.id;
            const lvl = getLevelInfo(u.xp);
            return (
              <div
                key={u.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 ${
                  isMe
                    ? "border-[#D4FF00] bg-[#14160F]"
                    : "border-zinc-800 bg-[#111115]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveAvatarUrl(u.avatar)}
                      alt={u.username}
                      className="h-14 w-14 rounded-xl border border-zinc-700 object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-black text-white">
                          {u.username}
                        </span>
                        {isMe && (
                          <span className="rounded bg-[#D4FF00] px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-zinc-950">
                            АКТИВЕН
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-xs text-zinc-400">
                        LVL {lvl.level} ({lvl.rank.ruTitle}) • Баланс:{" "}
                        <strong className="text-[#D4FF00]">
                          {fp(u.balance)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800/80 pt-4">
                  <button
                    disabled={isPending}
                    onClick={() =>
                      handleQuickBalanceAndXp({
                        userId: u.id,
                        addBalance: 5000,
                      })
                    }
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 py-2 font-mono text-[11px] font-bold text-[#D4FF00] hover:border-[#D4FF00]"
                  >
                    +{fp(5000)}
                  </button>

                  <button
                    disabled={isPending}
                    onClick={() =>
                      handleQuickBalanceAndXp({
                        userId: u.id,
                        addBalance: -5000,
                      })
                    }
                    className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 font-mono text-[11px] font-bold text-rose-300 hover:border-rose-500"
                  >
                    −{fp(5000)}
                  </button>

                  <button
                    disabled={isPending}
                    onClick={() =>
                      handleQuickBalanceAndXp({
                        userId: u.id,
                        balance: 0,
                      })
                    }
                    className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 font-mono text-[11px] font-bold text-rose-300 hover:bg-rose-500 hover:text-white"
                  >
                    В 0
                  </button>

                  <button
                    disabled={isPending}
                    onClick={() =>
                      handleQuickBalanceAndXp({
                        userId: u.id,
                        addXp: 3500,
                      })
                    }
                    className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-[11px] font-bold text-white hover:border-white"
                  >
                    +10 LVL
                  </button>

                  {!isMe && (
                    <button
                      disabled={isPending}
                      onClick={() => handleSwitchUser(u)}
                      className="w-full rounded-xl bg-[#D4FF00] py-2 font-mono text-xs font-black uppercase text-zinc-950"
                    >
                      Войти под этим аккаунтом
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
