"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  Camera,
  Check,
  Flame,
  Gamepad2,
  Gift,
  Globe,
  Home,
  Layers,
  LogIn,
  Plus,
  ShieldAlert,
  Sparkles,
  Ticket,
  User as UserIcon,
  UserPlus,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useFormatPrice } from "@/lib/rarity";
import {
  loginAccountAction,
  redeemPromoAction,
  registerAccountAction,
  updateProfileAction,
} from "@/app/actions/user";
import { CURRENCIES, CurrencyCode, useAppStore } from "@/lib/store";
import { soundEngine } from "@/lib/sound";
import { AVATAR_PRESETS, getLevelInfo, resolveAvatarUrl } from "@/lib/levels";
import AvatarCropper from "./AvatarCropper";

interface NavbarProps {
  user: {
    id: string;
    username: string;
    avatar: string;
    balance: number;
    level: number;
    xp: number;
    inventoryCount: number;
  };
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    balance: storeBalance,
    setBalance,
    inventoryCount: storeInvCount,
    setInventoryCount,
    soundEnabled,
    toggleSound,
    currency,
    setCurrency,
  } = useAppStore();
  const { fp } = useFormatPrice();

  const [showTopUp, setShowTopUp] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authTab, setAuthTab] = useState<"profile" | "register" | "login">(
    "profile"
  );

  // Profile / Avatar edit state
  const [editUsername, setEditUsername] = useState(user.username);
  const [selectedAvatar, setSelectedAvatar] = useState(user.avatar);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");

  // Register state
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regAvatar, setRegAvatar] = useState(AVATAR_PRESETS[0].id);

  // Login state
  const [loginQuery, setLoginQuery] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Promo code state
  const [promoInput, setPromoInput] = useState("");
  const [promoMsg, setPromoMsg] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setBalance(user.balance);
    setInventoryCount(user.inventoryCount);
    setEditUsername(user.username);
    setSelectedAvatar(user.avatar);
  }, [
    user.balance,
    user.inventoryCount,
    user.username,
    user.avatar,
    setBalance,
    setInventoryCount,
  ]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(
        "azurecaser_currency"
      ) as CurrencyCode | null;
      if (saved && CURRENCIES[saved]) {
        setCurrency(saved);
      }
    }
  }, [setCurrency]);

  const currentBalance = storeBalance !== null ? storeBalance : user.balance;
  const currentInvCount =
    storeInvCount !== null ? storeInvCount : user.inventoryCount;

  const levelInfo = getLevelInfo(user.xp);
  const avatarSrc = resolveAvatarUrl(user.avatar);

  const handleToggleSound = () => {
    toggleSound();
    soundEngine.enabled = !soundEnabled;
  };

  const handleRedeemPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoMsg(null);
    startTransition(async () => {
      const res = await redeemPromoAction(promoInput);
      if (!res.ok) {
        setPromoMsg({
          ok: false,
          text: res.error || "Ошибка активации промокода",
        });
        return;
      }
      if (typeof res.newBalance === "number") {
        setBalance(res.newBalance);
      }
      if (typeof res.newInventoryCount === "number") {
        setInventoryCount(res.newInventoryCount);
      }
      soundEngine.playWin(true);
      setPromoInput("");
      setPromoMsg({
        ok: true,
        text: res.message || "Промокод успешно активирован!",
      });
      router.refresh();
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    const finalAvatar = customAvatarUrl.trim() || selectedAvatar;

    startTransition(async () => {
      const res = await updateProfileAction({
        username: editUsername,
        avatar: finalAvatar,
      });
      if (!res.ok) {
        setAuthError(res.error || "Ошибка сохранения");
        return;
      }
      soundEngine.playCashout();
      setAuthSuccess("Профиль и аватарка успешно обновлены!");
      router.refresh();
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    startTransition(async () => {
      const res = await registerAccountAction({
        username: regUsername,
        email: regEmail,
        password: regPassword,
        avatar: regAvatar,
      });
      if (!res.ok) {
        setAuthError(res.error || "Ошибка регистрации");
        return;
      }
      if (typeof res.newBalance === "number") {
        setBalance(res.newBalance);
        setInventoryCount(0);
      }
      soundEngine.playWin(true);
      setShowAuthModal(false);
      router.refresh();
    });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);

    startTransition(async () => {
      const res = await loginAccountAction({
        usernameOrEmail: loginQuery,
        password: loginPassword,
      });
      if (!res.ok) {
        setAuthError(res.error || "Ошибка входа");
        return;
      }
      if (typeof res.newBalance === "number") {
        setBalance(res.newBalance);
      }
      soundEngine.playCashout();
      setShowAuthModal(false);
      router.refresh();
    });
  };

  const navItems = [
    {
      href: "/",
      label: "Главная",
      icon: Home,
      match: (p: string) => p === "/",
    },
    {
      href: "/cases",
      label: "Кейсы",
      badge: "84",
      icon: Box,
      match: (p: string) => p.startsWith("/cases") || p.startsWith("/case/"),
    },
    {
      href: "/earn",
      label: "Гринд",
      badge: "ИГРЫ",
      icon: Gamepad2,
      match: (p: string) => p.startsWith("/earn"),
    },
    {
      href: "/missions",
      label: "Миссии",
      badge: "КОЛЕСО",
      icon: Gift,
      match: (p: string) => p.startsWith("/missions"),
    },
    {
      href: "/upgrader",
      label: "Апгрейд",
      badge: "PRO",
      icon: Flame,
      match: (p: string) => p.startsWith("/upgrader"),
    },
    {
      href: "/contracts",
      label: "Контракты",
      icon: Layers,
      match: (p: string) => p.startsWith("/contracts"),
    },
    {
      href: "/profile",
      label: "Инвентарь",
      count: currentInvCount,
      icon: UserIcon,
      match: (p: string) => p.startsWith("/profile"),
    },
    {
      href: "/admin",
      label: "Админка",
      badge: "ROOT",
      icon: ShieldAlert,
      match: (p: string) => p.startsWith("/admin"),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#09090B]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1720px] items-center justify-between gap-2 px-3 lg:px-5">
          {/* Left: Brand & Navigation */}
          <div className="flex min-w-0 items-center gap-2.5 xl:gap-3.5">
            <Link href="/" className="group flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D4FF00] text-zinc-950 transition-transform duration-200 group-hover:scale-105">
                <span className="font-display text-base font-black tracking-tighter">
                  AC
                </span>
              </div>
              <div className="hidden items-baseline gap-1 sm:flex">
                <span className="font-display text-sm font-black tracking-tight text-white xl:text-base">
                  AZURECASER
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF00]" />
              </div>
            </Link>

            <nav className="hidden items-center gap-0.5 lg:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`relative flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide transition-all ${
                      active
                        ? "bg-zinc-800/90 text-white"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    }`}
                  >
                    <Icon
                      className={`h-3.5 w-3.5 shrink-0 ${
                        active ? "text-[#D4FF00]" : "text-zinc-500"
                      }`}
                    />
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="rounded bg-[#D4FF00]/15 px-1 py-0.5 font-mono text-[8px] font-black leading-none text-[#D4FF00]">
                        {item.badge}
                      </span>
                    )}
                    {typeof item.count === "number" && (
                      <span className="rounded bg-zinc-800 px-1 py-0.5 font-mono text-[9px] font-bold leading-none text-[#D4FF00]">
                        {item.count}
                      </span>
                    )}
                    {active && (
                      <span className="absolute -bottom-[15px] left-2 right-2 h-[2px] bg-[#D4FF00]" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Currency Switcher, Sound, Balance, Profile & Registration */}
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Currency Switcher (Compact Symbols) */}
            <div className="hidden items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-900/90 p-1 md:flex">
              {(["UAH", "USD", "EUR", "KZT"] as CurrencyCode[]).map((code) => (
                <button
                  key={code}
                  onClick={() => setCurrency(code)}
                  title={CURRENCIES[code].label}
                  className={`flex h-7 w-7 items-center justify-center whitespace-nowrap rounded font-mono text-xs font-black transition ${
                    currency === code
                      ? "bg-[#D4FF00] text-zinc-950"
                      : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                  }`}
                >
                  {CURRENCIES[code].symbol}
                </button>
              ))}
            </div>

            {/* Sound Toggle */}
            <button
              onClick={handleToggleSound}
              title={soundEnabled ? "Выключить звук" : "Включить звук"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 transition hover:border-zinc-700 hover:text-white"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 text-[#D4FF00]" />
              ) : (
                <VolumeX className="h-4 w-4 text-zinc-600" />
              )}
            </button>

            {/* Balance Module */}
            <div className="flex shrink-0 items-center rounded-lg border border-zinc-800 bg-zinc-900/90 p-1 pl-3">
              <span className="mr-2.5 whitespace-nowrap font-mono text-xs font-black text-white xl:text-sm">
                {fp(currentBalance)}
              </span>
              <button
                onClick={() => {
                  setPromoMsg(null);
                  setShowTopUp(true);
                }}
                title="Ввести промокод или ваучер"
                className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md bg-[#D4FF00] px-2.5 py-1.5 text-[11px] font-black uppercase tracking-wide text-zinc-950 transition hover:bg-[#e0ff33]"
              >
                <Ticket className="h-3.5 w-3.5 stroke-[2.5]" />
                <span className="hidden xl:inline">Промокод</span>
              </button>
            </div>

            {/* User Pill with Avatar, Level Bar & Account Modal Trigger */}
            <div className="flex shrink-0 items-center gap-1">
              <Link
                href="/profile"
                className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/90 py-1 pl-1.5 pr-2.5 transition hover:border-[#D4FF00]/60"
              >
                <img
                  src={avatarSrc}
                  alt={user.username}
                  className="h-7 w-7 shrink-0 rounded-md border border-zinc-700 object-cover"
                />
                <div className="hidden leading-none sm:block">
                  <div className="flex items-center gap-1.5">
                    <span className="max-w-[88px] truncate text-[11px] font-black text-white">
                      {user.username}
                    </span>
                    <span
                      style={{
                        color: levelInfo.rank.color,
                        backgroundColor: levelInfo.rank.bgBadge,
                      }}
                      className="whitespace-nowrap rounded px-1 py-0.5 font-mono text-[9px] font-black"
                    >
                      LVL {levelInfo.level}
                    </span>
                  </div>
                  {/* Mini XP Progress Bar */}
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-1 w-14 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full bg-[#D4FF00]"
                        style={{ width: `${levelInfo.progressPct}%` }}
                      />
                    </div>
                    <span className="max-w-[64px] truncate whitespace-nowrap font-mono text-[8px] text-zinc-400">
                      {levelInfo.rank.ruTitle}
                    </span>
                  </div>
                </div>
              </Link>

              <button
                onClick={() => {
                  setAuthError(null);
                  setAuthSuccess(null);
                  setAuthTab("register");
                  setShowAuthModal(true);
                }}
                title="Аккаунт / Регистрация / Смена аватарки"
                className="flex h-9 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-[#D4FF00]/50 bg-[#D4FF00]/10 px-2.5 text-[11px] font-black uppercase text-[#D4FF00] transition hover:bg-[#D4FF00] hover:text-zinc-950"
              >
                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden 2xl:inline">Аккаунт</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Promo Code & Voucher Modal (Replaces Easy Free Balance Top-Up) */}
      {showTopUp && (
        <div
          onClick={() => setShowTopUp(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-[#111115] p-6 shadow-2xl"
          >
            <button
              onClick={() => setShowTopUp(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="inline-flex items-center gap-1.5 rounded bg-[#D4FF00]/15 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-[#D4FF00]">
              <Ticket className="h-3.5 w-3.5" />
              <span>ПРОМОКОДЫ И СЕКРЕТНЫЕ ВАУЧЕРЫ</span>
            </div>

            <h3 className="mt-2 font-display text-xl font-black uppercase tracking-wide text-white">
              Активация бонусного кода
            </h3>
            <p className="mt-1 text-xs text-zinc-400">
              Бесплатная накрутка баланса отключена. Введи секретный промокод на
              баланс или редкий скин!
            </p>

            <div className="mt-4 rounded-xl border border-zinc-800/80 bg-[#09090B] p-3.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                Твой текущий счёт
              </div>
              <div className="mt-0.5 font-mono text-2xl font-black text-[#D4FF00]">
                {fp(currentBalance)}
              </div>
            </div>

            {promoMsg && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-xs font-bold ${
                  promoMsg.ok
                    ? "border-[#D4FF00]/50 bg-[#D4FF00]/15 text-[#D4FF00]"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-300"
                }`}
              >
                {promoMsg.text}
              </div>
            )}

            <form onSubmit={handleRedeemPromo} className="mt-4 space-y-3">
              <div>
                <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                  Введи промокод или ваучер:
                </label>
                <input
                  type="text"
                  required
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Например: START250 или DRAGON"
                  className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#09090B] px-4 py-3 font-mono text-sm font-black uppercase tracking-wider text-white placeholder-zinc-600 focus:border-[#D4FF00] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4FF00] py-3.5 font-display text-sm font-black uppercase tracking-wider text-zinc-950 transition hover:bg-[#e2ff33] disabled:opacity-50"
              >
                <Gift className="h-4 w-4" />
                <span>Активировать промокод</span>
              </button>

              <Link
                href="/earn"
                onClick={() => setShowTopUp(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#D4FF00]/40 bg-[#D4FF00]/10 py-3 font-mono text-xs font-black uppercase text-[#D4FF00] transition hover:bg-[#D4FF00] hover:text-zinc-950"
              >
                <Gamepad2 className="h-4 w-4" />
                <span>Перейти в Мини-Игры для заработка →</span>
              </Link>
            </form>
          </div>
        </div>
      )}

      {/* Account / Registration / Avatar Switcher Modal */}
      {showAuthModal && (
        <div
          onClick={() => setShowAuthModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl rounded-2xl border border-zinc-800 bg-[#111115] p-6 shadow-2xl"
          >
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Tabs */}
            <div className="flex gap-1.5 rounded-xl border border-zinc-800 bg-[#09090B] p-1.5 pr-10">
              <button
                onClick={() => {
                  setAuthTab("profile");
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black uppercase transition ${
                  authTab === "profile"
                    ? "bg-[#D4FF00] text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Аватар и Ник</span>
              </button>
              <button
                onClick={() => {
                  setAuthTab("register");
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black uppercase transition ${
                  authTab === "register"
                    ? "bg-[#D4FF00] text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Регистрация</span>
              </button>
              <button
                onClick={() => {
                  setAuthTab("login");
                  setAuthError(null);
                  setAuthSuccess(null);
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black uppercase transition ${
                  authTab === "login"
                    ? "bg-[#D4FF00] text-zinc-950"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Вход</span>
              </button>
            </div>

            {authError && (
              <div className="mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-xs font-bold text-rose-300">
                {authError}
              </div>
            )}

            {authSuccess && (
              <div className="mt-4 rounded-xl border border-[#D4FF00]/40 bg-[#D4FF00]/10 px-4 py-2.5 text-xs font-bold text-[#D4FF00]">
                {authSuccess}
              </div>
            )}

            {/* TAB 1: EDIT AVATAR & USERNAME */}
            {authTab === "profile" && (
              <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                    Твой никнейм на сайте
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="Введи никнейм"
                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-[#09090B] px-3.5 py-2.5 text-sm font-bold text-white focus:border-[#D4FF00] focus:outline-none"
                  />
                </div>

                {/* Upload from PC & Scale/Crop */}
                <AvatarCropper
                  initialPreviewUrl={resolveAvatarUrl(
                    customAvatarUrl.trim() || selectedAvatar
                  )}
                  onApplyCroppedDataUrl={(croppedDataUrl) => {
                    setSelectedAvatar(croppedDataUrl);
                    setCustomAvatarUrl("");
                  }}
                />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold uppercase text-zinc-400">
                      Или выбери фирменную эмблему:
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      8 коллекционных эмблем
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {AVATAR_PRESETS.map((preset) => {
                      const active =
                        !customAvatarUrl.trim() && selectedAvatar === preset.id;
                      return (
                        <button
                          type="button"
                          key={preset.id}
                          onClick={() => {
                            setSelectedAvatar(preset.id);
                            setCustomAvatarUrl("");
                          }}
                          className={`group relative flex flex-col items-center rounded-xl border p-1.5 transition ${
                            active
                              ? "border-[#D4FF00] bg-[#D4FF00]/15"
                              : "border-zinc-800 bg-[#09090B] hover:border-zinc-600"
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="h-10 w-10 rounded-lg object-cover"
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
                  className="w-full rounded-xl bg-[#D4FF00] py-3 font-display text-sm font-black uppercase tracking-wider text-zinc-950 transition hover:bg-[#e2ff33] disabled:opacity-50"
                >
                  Сохранить изменения профиля
                </button>
              </form>
            )}

            {/* TAB 2: REGISTER NEW ACCOUNT */}
            {authTab === "register" && (
              <form onSubmit={handleRegister} className="mt-5 space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-[#D4FF00]/30 bg-[#D4FF00]/10 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="h-5 w-5 text-[#D4FF00]" />
                    <div>
                      <div className="text-xs font-black uppercase text-white">
                        Регистрация нового игрока
                      </div>
                      <div className="text-[11px] text-zinc-300">
                        Стартовый бонус{" "}
                        <strong className="text-[#D4FF00]">{fp(1000)}</strong> +
                        своя аватарка с ПК
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                      Никнейм *
                    </label>
                    <input
                      type="text"
                      required
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="s1mple_volt"
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs font-bold text-white focus:border-[#D4FF00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                      Email
                    </label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="you@mail.com"
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-white focus:border-[#D4FF00] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                      Пароль *
                    </label>
                    <input
                      type="password"
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Мин. 4 симв."
                      className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2 text-xs text-white focus:border-[#D4FF00] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Upload Avatar from PC with Zoom during registration */}
                <AvatarCropper
                  initialPreviewUrl={resolveAvatarUrl(regAvatar)}
                  onApplyCroppedDataUrl={(croppedDataUrl) => {
                    setRegAvatar(croppedDataUrl);
                  }}
                />

                <div>
                  <span className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                    Или выбери готовую эмблему:
                  </span>
                  <div className="mt-1.5 grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {AVATAR_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => setRegAvatar(preset.id)}
                        className={`flex justify-center rounded-xl border p-1.5 transition ${
                          regAvatar === preset.id
                            ? "border-[#D4FF00] bg-[#D4FF00]/15"
                            : "border-zinc-800 bg-[#09090B]"
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.name}
                          className="h-9 w-9 rounded-lg"
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-[#D4FF00] py-3 font-display text-sm font-black uppercase tracking-wider text-zinc-950 transition hover:bg-[#e2ff33] disabled:opacity-50"
                >
                  Зарегистрироваться и получить {fp(1000)}
                </button>
              </form>
            )}

            {/* TAB 3: LOGIN TO EXISTING ACCOUNT */}
            {authTab === "login" && (
              <form onSubmit={handleLogin} className="mt-5 space-y-4">
                <div>
                  <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                    Никнейм или Email
                  </label>
                  <input
                    type="text"
                    required
                    value={loginQuery}
                    onChange={(e) => setLoginQuery(e.target.value)}
                    placeholder="Введи свой никнейм или Email"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2.5 text-xs font-bold text-white focus:border-[#D4FF00] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] font-bold uppercase text-zinc-400">
                    Пароль
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Введи пароль от аккаунта"
                    className="mt-1 w-full rounded-lg border border-zinc-800 bg-[#09090B] px-3 py-2.5 text-xs text-white focus:border-[#D4FF00] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-[#D4FF00] py-3 font-display text-sm font-black uppercase tracking-wider text-zinc-950 transition hover:bg-[#e2ff33] disabled:opacity-50"
                >
                  Войти в аккаунт
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
