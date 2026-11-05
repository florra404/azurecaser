export interface RankTier {
  minLevel: number;
  maxLevel: number;
  title: string;
  ruTitle: string;
  color: string;
  bgBadge: string;
  bonusUsd: number;
  perk: string;
}

export const RANK_TIERS: RankTier[] = [
  {
    minLevel: 1,
    maxLevel: 4,
    title: "RECRUIT",
    ruTitle: "Новобранец",
    color: "#94A3B8",
    bgBadge: "rgba(148, 163, 184, 0.15)",
    bonusUsd: 10,
    perk: "Базовый доступ к кейсам и апгрейдеру",
  },
  {
    minLevel: 5,
    maxLevel: 9,
    title: "SILVER ELITE",
    ruTitle: "Серебряный Страж",
    color: "#38BDF8",
    bgBadge: "rgba(56, 189, 248, 0.16)",
    bonusUsd: 25,
    perk: "+25$ за каждый новый уровень",
  },
  {
    minLevel: 10,
    maxLevel: 19,
    title: "GOLD NOVA",
    ruTitle: "Золотая Звезда",
    color: "#FACC15",
    bgBadge: "rgba(250, 204, 21, 0.16)",
    bonusUsd: 50,
    perk: "+50$ за уровень и золотая метка профиля",
  },
  {
    minLevel: 20,
    maxLevel: 34,
    title: "MASTER GUARDIAN",
    ruTitle: "Магистр-Хранитель",
    color: "#C084FC",
    bgBadge: "rgba(192, 132, 252, 0.16)",
    bonusUsd: 100,
    perk: "+100$ за уровень и статус Калаша",
  },
  {
    minLevel: 35,
    maxLevel: 49,
    title: "LEGENDARY EAGLE",
    ruTitle: "Легендарный Беркут",
    color: "#FB923C",
    bgBadge: "rgba(251, 146, 60, 0.16)",
    bonusUsd: 200,
    perk: "+200$ за уровень и приоритетный дроп",
  },
  {
    minLevel: 50,
    maxLevel: 74,
    title: "SUPREME MASTER",
    ruTitle: "Суприм",
    color: "#F43F5E",
    bgBadge: "rgba(244, 63, 94, 0.18)",
    bonusUsd: 350,
    perk: "+350$ за уровень и рубиновый статус",
  },
  {
    minLevel: 75,
    maxLevel: 999,
    title: "GLOBAL ELITE",
    ruTitle: "Глобал Элита",
    color: "#D4FF00",
    bgBadge: "rgba(212, 255, 0, 0.18)",
    bonusUsd: 600,
    perk: "+600$ за уровень и максимальный престиж",
  },
];

export const XP_PER_LEVEL = 350;

export interface LevelProgressInfo {
  level: number;
  xp: number;
  currentLevelStartXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeededForNext: number;
  progressPct: number;
  rank: RankTier;
  nextRank: RankTier | null;
}

export function getLevelInfo(xp: number): LevelProgressInfo {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = Math.max(1, Math.floor(safeXp / XP_PER_LEVEL) + 1);
  const currentLevelStartXp = (level - 1) * XP_PER_LEVEL;
  const nextLevelXp = level * XP_PER_LEVEL;
  const xpIntoLevel = safeXp - currentLevelStartXp;
  const xpNeededForNext = XP_PER_LEVEL;
  const progressPct = Math.min(
    100,
    Math.max(0, Math.round((xpIntoLevel / xpNeededForNext) * 100))
  );

  const rank =
    RANK_TIERS.find((r) => level >= r.minLevel && level <= r.maxLevel) ||
    RANK_TIERS[RANK_TIERS.length - 1];

  const currentRankIdx = RANK_TIERS.indexOf(rank);
  const nextRank =
    currentRankIdx >= 0 && currentRankIdx + 1 < RANK_TIERS.length
      ? RANK_TIERS[currentRankIdx + 1]
      : null;

  return {
    level,
    xp: safeXp,
    currentLevelStartXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeededForNext,
    progressPct,
    rank,
    nextRank,
  };
}

export interface AvatarPreset {
  id: string;
  name: string;
  url: string;
  accent: string;
}

// High-contrast custom SVG Data-URI tactical & CS2 avatars + Steam-style icons
function makeSvgAvatar(
  bg1: string,
  bg2: string,
  accent: string,
  symbol: string,
  label: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" fill="none">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="24" fill="url(#g)"/>
    <rect x="6" y="6" width="108" height="108" rx="19" stroke="${accent}" stroke-opacity="0.45" stroke-width="2"/>
    <circle cx="60" cy="50" r="24" fill="${accent}" fill-opacity="0.14" stroke="${accent}" stroke-width="2.5"/>
    <text x="60" y="59" text-anchor="middle" fill="${accent}" font-family="monospace" font-weight="900" font-size="26">${symbol}</text>
    <rect x="22" y="84" width="76" height="18" rx="6" fill="#09090B" fill-opacity="0.85" stroke="${accent}" stroke-opacity="0.35"/>
    <text x="60" y="96" text-anchor="middle" fill="#FFFFFF" font-family="monospace" font-weight="800" font-size="10" letter-spacing="1">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "volt-viper",
    name: "VOLT VIPER",
    url: makeSvgAvatar("#141A05", "#09090B", "#D4FF00", "⚡", "VIPER"),
    accent: "#D4FF00",
  },
  {
    id: "crimson-awp",
    name: "DRAGON SNIPER",
    url: makeSvgAvatar("#28090E", "#09090B", "#FF2A54", "🎯", "SNIPER"),
    accent: "#FF2A54",
  },
  {
    id: "cyber-phantom",
    name: "CYBER PHANTOM",
    url: makeSvgAvatar("#08202B", "#09090B", "#00F0FF", "👁", "PHANTOM"),
    accent: "#00F0FF",
  },
  {
    id: "gold-karambit",
    name: "KARAMBIT KING",
    url: makeSvgAvatar("#291D04", "#09090B", "#FFB800", "👑", "GOLD KING"),
    accent: "#FFB800",
  },
  {
    id: "violet-demon",
    name: "DOPPLER DEMON",
    url: makeSvgAvatar("#1E0B30", "#09090B", "#B829FF", "🔥", "DOPPLER"),
    accent: "#B829FF",
  },
  {
    id: "emerald-wolf",
    name: "GAMMA WOLF",
    url: makeSvgAvatar("#062619", "#09090B", "#10B981", "🐺", "GAMMA"),
    accent: "#10B981",
  },
  {
    id: "blaze-titan",
    name: "HOWL TITAN",
    url: makeSvgAvatar("#2B1205", "#09090B", "#F97316", "🦁", "TITAN"),
    accent: "#F97316",
  },
  {
    id: "ice-samurai",
    name: "CRYO RONIN",
    url: makeSvgAvatar("#0B162C", "#09090B", "#60A5FA", "⚔", "RONIN"),
    accent: "#60A5FA",
  },
];

export function resolveAvatarUrl(avatar: string | undefined | null): string {
  if (!avatar || avatar === "/avatars/operative.svg") {
    return AVATAR_PRESETS[0].url;
  }
  const preset = AVATAR_PRESETS.find((p) => p.id === avatar);
  if (preset) return preset.url;
  return avatar;
}
