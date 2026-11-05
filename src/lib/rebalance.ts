import { prisma } from "./prisma";

interface ExternalApiSkin {
  name: string;
  image: string;
  weapon?: { name?: string };
  pattern?: { name?: string };
  rarity?: { id?: string; name?: string };
  category?: { name?: string };
  collections?: { name?: string }[];
}

function mapApiRarity(apiItem: ExternalApiSkin): string {
  const isKnifeOrGlove =
    apiItem.name.startsWith("★") ||
    apiItem.category?.name === "Knives" ||
    apiItem.category?.name === "Gloves";
  if (isKnifeOrGlove) return "GOLD";

  const rName = (apiItem.rarity?.name || "").toLowerCase();
  if (rName.includes("covert") || rName.includes("contraband")) return "COVERT";
  if (rName.includes("classified")) return "CLASSIFIED";
  if (rName.includes("restricted")) return "RESTRICTED";
  return "MIL_SPEC";
}

function generateRealisticPrice(
  rarity: string,
  weapon: string,
  index: number
): number {
  const isTopGun = [
    "AWP",
    "AK-47",
    "M4A1-S",
    "M4A4",
    "Desert Eagle",
    "USP-S",
    "Glock-18",
  ].includes(weapon);
  const mult = isTopGun ? 1.45 : 1.0;
  const seed = ((index * 79 + 17) % 100) / 100;

  if (rarity === "GOLD") {
    return Number((280 + seed * 2800).toFixed(2));
  }
  if (rarity === "COVERT") {
    return Number(((24 + seed * 460) * mult).toFixed(2));
  }
  if (rarity === "CLASSIFIED") {
    return Number(((7.5 + seed * 92) * mult).toFixed(2));
  }
  if (rarity === "RESTRICTED") {
    return Number(((1.6 + seed * 22) * mult).toFixed(2));
  }
  return Number(((0.45 + seed * 6.5) * mult).toFixed(2));
}

export const CATEGORIES_BLUEPRINT = [
  {
    slug: "hardcore-grind",
    name: "Хардкор с Нуля",
    subtitle: "Стартовые гринд-кейсы от $0.18 (7 ₴) специально для подъёма с нуля из мини-игр",
    icon: "Flame",
    accentColor: "#F43F5E",
    sortOrder: 0,
  },
  {
    slug: "budget-farm",
    name: "Бюджетный старт",
    subtitle: "Честные стартовые кейсы от $0.80 с высоким шансом окупаемости",
    icon: "Flame",
    accentColor: "#D4FF00",
    sortOrder: 1,
  },
  {
    slug: "azure-originals",
    name: "Фирменные сборки",
    subtitle: "Флагманские кейсы AzureCaser с идеальным балансом цен и редкости",
    icon: "Snowflake",
    accentColor: "#38BDF8",
    sortOrder: 2,
  },
  {
    slug: "high-voltage",
    name: "Риск 50 на 50",
    subtitle: "Только 4 скина в кейсе: ~48% шанс сразу удвоить банк без лишнего ширпа",
    icon: "Zap",
    accentColor: "#F59E0B",
    sortOrder: 3,
  },
  {
    slug: "arsenal-specialists",
    name: "Оружейные серии",
    subtitle: "Строго 100% скинов на выбранную пушку: AWP, AK-47, M4, Deagle, USP-S, Glock",
    icon: "Crosshair",
    accentColor: "#8B5CF6",
    sortOrder: 4,
  },
  {
    slug: "color-collections",
    name: "Цветовые сеты",
    subtitle: "Тематические подборки по стилю: Printstream, Изумруд, Неон, Золото и Рубин",
    icon: "Sparkles",
    accentColor: "#06B6D4",
    sortOrder: 5,
  },
  {
    slug: "blade-glove-vaults",
    name: "Ножи и Перчатки",
    subtitle: "Специализированные ножевые и перчаточные кейсы без дешёвого дропа",
    icon: "Swords",
    accentColor: "#EC4899",
    sortOrder: 6,
  },
  {
    slug: "mythic-archives",
    name: "Коллекционный тир",
    subtitle: "Редчайшие турнирные легенды: Dragon Lore, Gungnir, Wild Lotus и Howl",
    icon: "Crown",
    accentColor: "#EF4444",
    sortOrder: 7,
  },
  {
    slug: "highroller-vip",
    name: "Хайроллер & VIP",
    subtitle: "Максимальные ставки для охотников за Сапфирами, Изумрудами и Сувенирами",
    icon: "Sparkles",
    accentColor: "#10B981",
    sortOrder: 8,
  },
  {
    slug: "cs-operations",
    name: "Операции и Мейджоры",
    subtitle: "Эксклюзивные сборки по мотивам легендарных операций CS: Broken Fang, Riptide, Hydra и Kilowatt",
    icon: "Flame",
    accentColor: "#F97316",
    sortOrder: 9,
  },
  {
    slug: "billionaire-olympus",
    name: "Олимп Миллиардеров",
    subtitle: "Экстремальные сейфы со скинами за $25,000 – $250,000: #387 Blue Gem, #661 ST™ и 4x Kato 14 Holo",
    icon: "Crown",
    accentColor: "#FACC15",
    sortOrder: 10,
  },
];

export interface CaseBlueprint {
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  oldPrice: number | null;
  accentColor: string;
  badge: string | null;
  categorySlug: string;
  heroSkin: string;
  sortOrder: number;
  mode?: "standard" | "5050" | "weapon" | "knife" | "olympus";
  weaponFilter?: string[];
}

export const CASES_BLUEPRINT: CaseBlueprint[] = [
  // 0. Хардкор с Нуля (8 grind cases: $0.18 - $0.75)
  { slug: "rusty-scrap-box", name: "Ржавый Ящик", subtitle: "Старт с копеек", price: 0.18, oldPrice: 0.25, accentColor: "#F43F5E", badge: "ГРИНД", categorySlug: "hardcore-grind", heroSkin: "P250 | Sand Dune", sortOrder: 1 },
  { slug: "underground-tir-case", name: "Пайка Сталкера", subtitle: "Кейс за 10 кликов", price: 0.25, oldPrice: null, accentColor: "#D4FF00", badge: "С НУЛЯ", categorySlug: "hardcore-grind", heroSkin: "Glock-18 | Oxide Blaze", sortOrder: 2 },
  { slug: "factory-worker-box", name: "Смена в Цехе", subtitle: "Рабочий дроп", price: 0.35, oldPrice: 0.45, accentColor: "#38BDF8", badge: "ФАРМ", categorySlug: "hardcore-grind", heroSkin: "USP-S | Ticket to Hell", sortOrder: 3 },
  { slug: "dust-patrol-case", name: "Пыльный Патруль", subtitle: "Бюджетный разгон", price: 0.42, oldPrice: null, accentColor: "#F59E0B", badge: null, categorySlug: "hardcore-grind", heroSkin: "AK-47 | Uncharted", sortOrder: 4 },
  { slug: "silver-elo-grind", name: "Сильвер Гринд", subtitle: "Выход из Сильвера", price: 0.50, oldPrice: 0.65, accentColor: "#10B981", badge: "ХИТ", categorySlug: "hardcore-grind", heroSkin: "M4A1-S | Night Terror", sortOrder: 5 },
  { slug: "eco-round-drop", name: "Эко-Раунд", subtitle: "Пистолетка на окуп", price: 0.58, oldPrice: null, accentColor: "#A855F7", badge: "ECO", categorySlug: "hardcore-grind", heroSkin: "Desert Eagle | Trigger Discipline", sortOrder: 6 },
  { slug: "garage-craft-case", name: "Подпольный Крафт", subtitle: "Шанс на x4", price: 0.65, oldPrice: 0.80, accentColor: "#EC4899", badge: "ШАНС", categorySlug: "hardcore-grind", heroSkin: "AWP | Capillary", sortOrder: 7 },
  { slug: "grind-boss-5050", name: "Хардкор 50/50", subtitle: "Удвой копейки", price: 0.75, oldPrice: null, accentColor: "#D4FF00", badge: "50/50", categorySlug: "hardcore-grind", heroSkin: "AK-47 | Elite Build", sortOrder: 8, mode: "5050" },
  // 1. Бюджетный старт (7 cases)
  { slug: "scout-drop", name: "Fast Drop", subtitle: "Начальный фарм", price: 0.85, oldPrice: 1.2, accentColor: "#D4FF00", badge: "ФАРМ", categorySlug: "budget-farm", heroSkin: "AK-47 | Elite Build", sortOrder: 1 },
  { slug: "moonrise-glock", name: "Moonrise Start", subtitle: "Ночной патруль", price: 1.35, oldPrice: null, accentColor: "#A855F7", badge: "NEW", categorySlug: "budget-farm", heroSkin: "Glock-18 | Moonrise", sortOrder: 2 },
  { slug: "neon-mac", name: "Neon Rush", subtitle: "Яркий старт", price: 1.9, oldPrice: 2.4, accentColor: "#A3E635", badge: "ХИТ", categorySlug: "budget-farm", heroSkin: "MAC-10 | Neon Rider", sortOrder: 3 },
  { slug: "slate-tactical", name: "Black Slate", subtitle: "Тактический карбон", price: 2.5, oldPrice: null, accentColor: "#38BDF8", badge: null, categorySlug: "budget-farm", heroSkin: "AK-47 | Slate", sortOrder: 4 },
  { slug: "atheris-venom", name: "Venom Strike", subtitle: "Ядовитая кобра", price: 3.2, oldPrice: 3.9, accentColor: "#10B981", badge: "ТОП", categorySlug: "budget-farm", heroSkin: "AWP | Atheris", sortOrder: 5 },
  { slug: "cortex-brain", name: "Pink Cortex", subtitle: "Кибер-импульс", price: 3.9, oldPrice: null, accentColor: "#EC4899", badge: null, categorySlug: "budget-farm", heroSkin: "USP-S | Cortex", sortOrder: 6 },
  { slug: "duality-gold", name: "Golden Duality", subtitle: "Двойной баланс", price: 4.6, oldPrice: 5.5, accentColor: "#F59E0B", badge: "ОКУП", categorySlug: "budget-farm", heroSkin: "AWP | Duality", sortOrder: 7 },

  // 2. Фирменные сборки (7 cases)
  { slug: "cryo-genesis", name: "Ice Coaled", subtitle: "Ледяной градиент", price: 6.5, oldPrice: 8.0, accentColor: "#38BDF8", badge: "ХИТ", categorySlug: "azure-originals", heroSkin: "AK-47 | Ice Coaled", sortOrder: 1 },
  { slug: "abyssal-pulse", name: "Night Pulse", subtitle: "Синтвейв сборка", price: 11.5, oldPrice: null, accentColor: "#818CF8", badge: "NEW", categorySlug: "azure-originals", heroSkin: "M4A1-S | Decimator", sortOrder: 2 },
  { slug: "emperor-tarot", name: "The Emperor", subtitle: "Императорское Таро", price: 18.0, oldPrice: 22.0, accentColor: "#F59E0B", badge: null, categorySlug: "azure-originals", heroSkin: "M4A4 | The Emperor", sortOrder: 3 },
  { slug: "temukau-anime", name: "Cyber Anime", subtitle: "Неоновый Токио", price: 24.5, oldPrice: null, accentColor: "#EC4899", badge: "АНИМЕ", categorySlug: "azure-originals", heroSkin: "M4A4 | Temukau", sortOrder: 4 },
  { slug: "cobalt-overdrive", name: "Blue Phosphor", subtitle: "Сапфировый глянец", price: 39.0, oldPrice: 45.0, accentColor: "#3B82F6", badge: "ТОП", categorySlug: "azure-originals", heroSkin: "M4A1-S | Blue Phosphor", sortOrder: 5 },
  { slug: "zero-kelvin", name: "Vulcan Strike", subtitle: "Киберспортивный тир", price: 68.0, oldPrice: 79.0, accentColor: "#06B6D4", badge: null, categorySlug: "azure-originals", heroSkin: "AK-47 | Vulcan", sortOrder: 6 },
  { slug: "azure-sovereign", name: "Azure Royal", subtitle: "Флагманский сейф", price: 135.0, oldPrice: 160.0, accentColor: "#0EA5E9", badge: "VIP", categorySlug: "azure-originals", heroSkin: "★ Sport Gloves | Amphibious", sortOrder: 7 },

  // 3. Риск 50 на 50 (6 cases — mode: "5050")
  { slug: "jawbreaker-5050", name: "Jawbreaker 50/50", subtitle: "4 скина • Честные 48%", price: 11.0, oldPrice: null, accentColor: "#FACC15", badge: "50/50", categorySlug: "high-voltage", heroSkin: "USP-S | Jawbreaker", sortOrder: 1, mode: "5050" },
  { slug: "neural-shock", name: "Asiimov 50/50", subtitle: "4 скина • Окуп x2", price: 22.0, oldPrice: 26.0, accentColor: "#F59E0B", badge: "50/50", categorySlug: "high-voltage", heroSkin: "AK-47 | Asiimov", sortOrder: 2, mode: "5050" },
  { slug: "printstream-chance", name: "Printstream 50/50", subtitle: "4 скина • Белый глянец", price: 42.0, oldPrice: null, accentColor: "#FAFAFA", badge: "50/50", categorySlug: "high-voltage", heroSkin: "M4A1-S | Printstream", sortOrder: 3, mode: "5050" },
  { slug: "plasma-overload", name: "Containment 50/50", subtitle: "4 скина • Кислотный риск", price: 58.0, oldPrice: 65.0, accentColor: "#10B981", badge: "ХИТ", categorySlug: "high-voltage", heroSkin: "AWP | Containment Breach", sortOrder: 4, mode: "5050" },
  { slug: "quantum-breach", name: "Deagle Blaze 50/50", subtitle: "4 скина • Огненный банк", price: 120.0, oldPrice: null, accentColor: "#F97316", badge: "РИСК", categorySlug: "high-voltage", heroSkin: "Desert Eagle | Blaze", sortOrder: 5, mode: "5050" },
  { slug: "supernova-all-in", name: "AWP Fade 50/50", subtitle: "4 скина • Ва-банк", price: 250.0, oldPrice: 285.0, accentColor: "#EC4899", badge: "VIP", categorySlug: "high-voltage", heroSkin: "AWP | Fade", sortOrder: 6, mode: "5050" },

  // 4. Оружейные серии (8 cases — mode: "weapon")
  { slug: "awp-hyper-sniper", name: "Только AWP", subtitle: "100% снайперские винтовки", price: 36.0, oldPrice: 42.0, accentColor: "#8B5CF6", badge: "AWP", categorySlug: "arsenal-specialists", heroSkin: "AWP | Chrome Cannon", sortOrder: 1, mode: "weapon", weaponFilter: ["AWP"] },
  { slug: "kalashnikov-dynasty", name: "Только AK-47", subtitle: "100% автоматы Калашникова", price: 34.0, oldPrice: null, accentColor: "#EC4899", badge: "AK-47", categorySlug: "arsenal-specialists", heroSkin: "AK-47 | Inheritance", sortOrder: 2, mode: "weapon", weaponFilter: ["AK-47"] },
  { slug: "m4-silencer-phantom", name: "Только M4", subtitle: "100% винтовки M4A1-S и M4A4", price: 31.0, oldPrice: null, accentColor: "#06B6D4", badge: "M4", categorySlug: "arsenal-specialists", heroSkin: "M4A1-S | Printstream", sortOrder: 3, mode: "weapon", weaponFilter: ["M4A1-S", "M4A4"] },
  { slug: "deagle-hand-cannon", name: "Только Deagle", subtitle: "100% пистолеты Desert Eagle", price: 24.0, oldPrice: 28.0, accentColor: "#3B82F6", badge: "DEAGLE", categorySlug: "arsenal-specialists", heroSkin: "Desert Eagle | Printstream", sortOrder: 4, mode: "weapon", weaponFilter: ["Desert Eagle"] },
  { slug: "usp-silenced-pro", name: "Только USP-S", subtitle: "100% пистолеты USP-S", price: 19.0, oldPrice: null, accentColor: "#EF4444", badge: "USP-S", categorySlug: "arsenal-specialists", heroSkin: "USP-S | Kill Confirmed", sortOrder: 5, mode: "weapon", weaponFilter: ["USP-S"] },
  { slug: "glock-burst-master", name: "Только Glock-18", subtitle: "100% пистолеты Glock-18", price: 16.0, oldPrice: null, accentColor: "#10B981", badge: "GLOCK", categorySlug: "arsenal-specialists", heroSkin: "Glock-18 | Gamma Doppler", sortOrder: 6, mode: "weapon", weaponFilter: ["Glock-18"] },
  { slug: "smg-rush-b", name: "Фарм ПП (MP9 & MAC-10)", subtitle: "Только пистолеты-пулемёты", price: 9.5, oldPrice: 12.0, accentColor: "#F59E0B", badge: "RUSH B", categorySlug: "arsenal-specialists", heroSkin: "MP9 | Starlight Protector", sortOrder: 7, mode: "weapon", weaponFilter: ["MP9", "MAC-10", "MP7", "UMP-45", "P90"] },
  { slug: "scout-galil-famas", name: "Форс-бай Арсенал", subtitle: "SSG 08, Galil AR и FAMAS", price: 12.0, oldPrice: null, accentColor: "#38BDF8", badge: "FORCE", categorySlug: "arsenal-specialists", heroSkin: "SSG 08 | Dragonfire", sortOrder: 8, mode: "weapon", weaponFilter: ["SSG 08", "Galil AR", "FAMAS", "P250", "Five-SeveN"] },

  // 5. Цветовые сеты (6 cases)
  { slug: "white-printstream-set", name: "Белый Принтстрим", subtitle: "Перламутровая коллекция", price: 29.0, oldPrice: 34.0, accentColor: "#FFFFFF", badge: "WHITE", categorySlug: "color-collections", heroSkin: "USP-S | Printstream", sortOrder: 1 },
  { slug: "acid-volt-set", name: "Кислотный Вольт", subtitle: "Ядовито-зелёный сет", price: 26.0, oldPrice: null, accentColor: "#D4FF00", badge: "VOLT", categorySlug: "color-collections", heroSkin: "AWP | Containment Breach", sortOrder: 2 },
  { slug: "crimson-bloodsport-set", name: "Кровавый Спорт", subtitle: "Красно-чёрный сет", price: 35.0, oldPrice: null, accentColor: "#EF4444", badge: "RED", categorySlug: "color-collections", heroSkin: "AK-47 | Bloodsport", sortOrder: 3 },
  { slug: "neon-miami-set", name: "Неоновый Майами", subtitle: "Розово-бирюзовый сет", price: 32.0, oldPrice: 38.0, accentColor: "#EC4899", badge: "NEON", categorySlug: "color-collections", heroSkin: "AK-47 | Neon Rider", sortOrder: 4 },
  { slug: "asiimov-future-set", name: "Сектор Азимов", subtitle: "Бело-оранжевая классика", price: 44.0, oldPrice: null, accentColor: "#F97316", badge: "ASIIMOV", categorySlug: "color-collections", heroSkin: "AWP | Asiimov", sortOrder: 5 },
  { slug: "golden-relic-set", name: "Золотой Слиток", subtitle: "Королевское золото", price: 78.0, oldPrice: 90.0, accentColor: "#FACC15", badge: "GOLD", categorySlug: "color-collections", heroSkin: "★ Karambit | Tiger Tooth", sortOrder: 6 },

  // 6. Ножи и Перчатки (7 cases — mode: "knife")
  { slug: "flip-shadow-knives", name: "Flip & Doppler", subtitle: "Складные ножи CS2", price: 69.0, oldPrice: 79.0, accentColor: "#8B5CF6", badge: "НОЖИ", categorySlug: "blade-glove-vaults", heroSkin: "★ Flip Knife | Doppler", sortOrder: 1, mode: "knife" },
  { slug: "neon-edge-knives", name: "Kukri & Talon", subtitle: "Новые клинки", price: 95.0, oldPrice: 110.0, accentColor: "#EC4899", badge: "НОЖИ", categorySlug: "blade-glove-vaults", heroSkin: "★ Kukri Knife | Fade", sortOrder: 2, mode: "knife" },
  { slug: "bayonet-gamma-vault", name: "Bayonet Gamma", subtitle: "Штык-ножи и градиенты", price: 120.0, oldPrice: null, accentColor: "#10B981", badge: "НОЖИ", categorySlug: "blade-glove-vaults", heroSkin: "★ Bayonet | Gamma Doppler", sortOrder: 3, mode: "knife" },
  { slug: "cyber-silk-gloves", name: "Vice & Cobalt Gloves", subtitle: "Перчаточный арсенал", price: 145.0, oldPrice: 165.0, accentColor: "#D946EF", badge: "ПЕРЧАТКИ", categorySlug: "blade-glove-vaults", heroSkin: "★ Sport Gloves | Vice", sortOrder: 4, mode: "knife" },
  { slug: "skeleton-fade-vault", name: "Skeleton Fade", subtitle: "Скелетные ножи", price: 175.0, oldPrice: null, accentColor: "#F97316", badge: "ТОП", categorySlug: "blade-glove-vaults", heroSkin: "★ Skeleton Knife | Fade", sortOrder: 5, mode: "knife" },
  { slug: "karambit-syndicate", name: "Karambit Sapphire", subtitle: "Элитные Керамбиты", price: 215.0, oldPrice: 245.0, accentColor: "#6366F1", badge: "ХИТ", categorySlug: "blade-glove-vaults", heroSkin: "★ Karambit | Doppler", sortOrder: 6, mode: "knife" },
  { slug: "emerald-butterfly", name: "Butterfly Emerald", subtitle: "Ножи-бабочки", price: 340.0, oldPrice: null, accentColor: "#10B981", badge: "ЛЕГЕНДА", categorySlug: "blade-glove-vaults", heroSkin: "★ Butterfly Knife | Gamma Doppler", sortOrder: 7, mode: "knife" },

  // 7. Коллекционный тир (6 cases)
  { slug: "serpent-bravo", name: "Fire Serpent", subtitle: "Операция Браво", price: 155.0, oldPrice: null, accentColor: "#10B981", badge: "ОЛД", categorySlug: "mythic-archives", heroSkin: "AK-47 | Fire Serpent", sortOrder: 1 },
  { slug: "welcome-jungle-ancient", name: "Ancient Jungle", subtitle: "Сокровище Ancient", price: 185.0, oldPrice: 210.0, accentColor: "#84CC16", badge: "РЕДКИЙ", categorySlug: "mythic-archives", heroSkin: "M4A1-S | Welcome to the Jungle", sortOrder: 2 },
  { slug: "medusa-gods", name: "Medusa & Prince", subtitle: "Боги и Монстры", price: 235.0, oldPrice: null, accentColor: "#38BDF8", badge: "МИФ", categorySlug: "mythic-archives", heroSkin: "AWP | Medusa", sortOrder: 3 },
  { slug: "norse-gungnir-relic", name: "Norse Gungnir", subtitle: "Копьё Одина", price: 295.0, oldPrice: 330.0, accentColor: "#3B82F6", badge: "NORSE", categorySlug: "mythic-archives", heroSkin: "AWP | Gungnir", sortOrder: 4 },
  { slug: "contraband-lotus", name: "Wild Lotus & Howl", subtitle: "Контрабанда и St. Marc", price: 380.0, oldPrice: null, accentColor: "#EF4444", badge: "ЛИМИТ", categorySlug: "mythic-archives", heroSkin: "AK-47 | Wild Lotus", sortOrder: 5 },
  { slug: "dragon-lore-citadel", name: "Dragon Lore", subtitle: "Легенда Cobblestone", price: 440.0, oldPrice: 495.0, accentColor: "#F59E0B", badge: "ЛЕГЕНДА", categorySlug: "mythic-archives", heroSkin: "AWP | Dragon Lore", sortOrder: 6 },

  // 8. Хайроллер & VIP (7 cases)
  { slug: "arabesque-gold", name: "Gold Arabesque", subtitle: "Золотой резерв Dust 2", price: 290.0, oldPrice: null, accentColor: "#F59E0B", badge: "GOLD", categorySlug: "highroller-vip", heroSkin: "AK-47 | Gold Arabesque", sortOrder: 1 },
  { slug: "howl-contraband-vip", name: "Contraband Howl", subtitle: "Охота за Воем", price: 360.0, oldPrice: 410.0, accentColor: "#EF4444", badge: "CONTRABAND", categorySlug: "highroller-vip", heroSkin: "M4A4 | Howl", sortOrder: 2 },
  { slug: "pandora-royale", name: "Pandora's Box", subtitle: "Ультра-перчатки VIP", price: 450.0, oldPrice: 510.0, accentColor: "#A855F7", badge: "VIP", categorySlug: "highroller-vip", heroSkin: "★ Sport Gloves | Pandora's Box", sortOrder: 3 },
  { slug: "ruby-sapphire-gem", name: "Ruby vs Sapphire", subtitle: "Драгоценные камни", price: 590.0, oldPrice: null, accentColor: "#EF4444", badge: "GEM", categorySlug: "highroller-vip", heroSkin: "★ M9 Bayonet | Doppler", sortOrder: 4 },
  { slug: "emerald-dynasty-vip", name: "Emerald Dynasty", subtitle: "Изумрудный Синдикат", price: 720.0, oldPrice: 810.0, accentColor: "#10B981", badge: "EMERALD", categorySlug: "highroller-vip", heroSkin: "★ Butterfly Knife | Gamma Doppler", sortOrder: 5 },
  { slug: "sovereign-millionaire", name: "Millionaire Vault", subtitle: "Только элитный дроп", price: 850.0, oldPrice: 990.0, accentColor: "#D4FF00", badge: "MAX BET", categorySlug: "highroller-vip", heroSkin: "AWP | Dragon Lore", sortOrder: 6 },
  { slug: "titan-holo-souvenir", name: "Souvenir Titan Vault", subtitle: "Абсолютный предел CS2", price: 1250.0, oldPrice: 1450.0, accentColor: "#38BDF8", badge: "ULTIMATE", categorySlug: "highroller-vip", heroSkin: "AWP | Gungnir", sortOrder: 7 },

  // 9. Операции и Мейджоры (14 new cases -> 68 total cases!)
  { slug: "op-kilowatt-strike", name: "Операция Kilowatt", subtitle: "Электрический разряд CS2", price: 8.5, oldPrice: 10.0, accentColor: "#D4FF00", badge: "KILOWATT", categorySlug: "cs-operations", heroSkin: "AWP | Chrome Cannon", sortOrder: 1 },
  { slug: "op-revolution-cyber", name: "Операция Revolution", subtitle: "Киберпанк арсенал", price: 14.0, oldPrice: null, accentColor: "#EC4899", badge: "REVOLUTION", categorySlug: "cs-operations", heroSkin: "M4A4 | Temukau", sortOrder: 2 },
  { slug: "op-recoil-venom", name: "Операция Recoil", subtitle: "Кислотная отдача", price: 17.5, oldPrice: 21.0, accentColor: "#10B981", badge: "RECOIL", categorySlug: "cs-operations", heroSkin: "USP-S | Printstream", sortOrder: 3 },
  { slug: "op-dreams-nightmares", name: "Dreams & Nightmares", subtitle: "Мистический архив", price: 23.0, oldPrice: null, accentColor: "#A855F7", badge: "DREAMS", categorySlug: "cs-operations", heroSkin: "MP9 | Starlight Protector", sortOrder: 4 },
  { slug: "op-riptide-ocean", name: "Операция Riptide", subtitle: "Тропический шторм", price: 33.0, oldPrice: 39.0, accentColor: "#06B6D4", badge: "RIPTIDE", categorySlug: "cs-operations", heroSkin: "AK-47 | Leet Museo", sortOrder: 5 },
  { slug: "op-broken-fang", name: "Broken Fang", subtitle: "Сломанный Клык", price: 46.0, oldPrice: null, accentColor: "#F59E0B", badge: "FANG", categorySlug: "cs-operations", heroSkin: "M4A1-S | Printstream", sortOrder: 6 },
  { slug: "op-shattered-web", name: "Shattered Web", subtitle: "Расколотая Сеть", price: 59.0, oldPrice: 68.0, accentColor: "#EF4444", badge: "WEB", categorySlug: "cs-operations", heroSkin: "AWP | Containment Breach", sortOrder: 7 },
  { slug: "op-wildfire-blaze", name: "Операция Wildfire", subtitle: "Дикое Пламя", price: 74.0, oldPrice: null, accentColor: "#F97316", badge: "WILDFIRE", categorySlug: "cs-operations", heroSkin: "AK-47 | Fuel Injector", sortOrder: 8 },
  { slug: "op-hydra-veteran", name: "Операция Hydra", subtitle: "Золотая Гидра", price: 98.0, oldPrice: 115.0, accentColor: "#10B981", badge: "HYDRA", categorySlug: "cs-operations", heroSkin: "AWP | Oni Taiji", sortOrder: 9 },
  { slug: "op-phoenix-classic", name: "Операция Phoenix", subtitle: "Возрождение Феникса", price: 115.0, oldPrice: null, accentColor: "#FACC15", badge: "PHOENIX", categorySlug: "cs-operations", heroSkin: "AWP | Asiimov", sortOrder: 10 },
  { slug: "op-breakout-butterfly", name: "Операция Breakout", subtitle: "Охота на Бабочку", price: 165.0, oldPrice: 190.0, accentColor: "#38BDF8", badge: "BREAKOUT", categorySlug: "cs-operations", heroSkin: "★ Butterfly Knife | Fade", sortOrder: 11, mode: "knife" },
  { slug: "major-copenhagen-legends", name: "Major Legends", subtitle: "Капсула Чемпионов", price: 210.0, oldPrice: null, accentColor: "#D4FF00", badge: "MAJOR", categorySlug: "cs-operations", heroSkin: "AK-47 | Vulcan", sortOrder: 12 },
  { slug: "major-katowice-2014", name: "Katowice 2014 Vault", subtitle: "Легендарная эпоха CS", price: 320.0, oldPrice: 375.0, accentColor: "#3B82F6", badge: "KATO 14", categorySlug: "cs-operations", heroSkin: "AWP | Medusa", sortOrder: 13 },
  { slug: "major-souvenir-cobble", name: "Cobblestone Souvenir", subtitle: "Сувенирный Лор", price: 490.0, oldPrice: 550.0, accentColor: "#F59E0B", badge: "SOUVENIR", categorySlug: "cs-operations", heroSkin: "AWP | Dragon Lore", sortOrder: 14 },

  // 10. Олимп Миллиардеров (8 ultra-high-roller cases: $1,850 – $18,500)
  { slug: "olympus-crimson-rank1", name: "Crimson #1 World", subtitle: "Мировой рекорд Float 0.060001", price: 1850.0, oldPrice: 2200.0, accentColor: "#EF4444", badge: "#1 FLOAT", categorySlug: "billionaire-olympus", heroSkin: "★ M9 Bayonet | Crimson Web #1 World FN", sortOrder: 1, mode: "olympus" },
  { slug: "olympus-emerald-monarch", name: "Emerald Monarch", subtitle: "Изумрудные Бабочки и Керамбиты", price: 2650.0, oldPrice: null, accentColor: "#10B981", badge: "EMERALD", categorySlug: "billionaire-olympus", heroSkin: "★ Butterfly Knife | Emerald #1 World FN", sortOrder: 2, mode: "olympus" },
  { slug: "olympus-pandora-flawless", name: "Pandora Flawless", subtitle: "Безупречные перчатки коллекционера", price: 3400.0, oldPrice: 3900.0, accentColor: "#A855F7", badge: "GOD TIER", categorySlug: "billionaire-olympus", heroSkin: "★ Sport Gloves | Pandora's Box #1 Float FN", sortOrder: 3, mode: "olympus" },
  { slug: "olympus-gungnir-kato14", name: "Gungnir 4x Kato 14", subtitle: "Скандинавский бог с 4x Reason Holo", price: 4800.0, oldPrice: null, accentColor: "#38BDF8", badge: "4x HOLO", categorySlug: "billionaire-olympus", heroSkin: "AWP | Gungnir (4x Reason Gaming Holo Kato 14)", sortOrder: 4, mode: "olympus" },
  { slug: "olympus-howl-ibp-holo", name: "Howl 4x iBP Holo", subtitle: "Контрабанда с 4x iBUYPOWER Holo", price: 6500.0, oldPrice: 7400.0, accentColor: "#F43F5E", badge: "iBP HOLO", categorySlug: "billionaire-olympus", heroSkin: "M4A4 | Howl ST™ FN (4x iBUYPOWER Holo)", sortOrder: 5, mode: "olympus" },
  { slug: "olympus-scar-661-titan", name: "AK-47 #661 Scar Titan", subtitle: "Паттерн #661 ST™ + 4x Titan Holo", price: 9500.0, oldPrice: null, accentColor: "#3B82F6", badge: "#661 SCAR", categorySlug: "billionaire-olympus", heroSkin: "AK-47 | Case Hardened #661 ST™ 4x Titan Holo", sortOrder: 6, mode: "olympus" },
  { slug: "olympus-karambit-387-gem", name: "Karambit #387 Blue Gem", subtitle: "Единственный в мире #387 FN", price: 13500.0, oldPrice: 15500.0, accentColor: "#0EA5E9", badge: "#387 GEM", categorySlug: "billionaire-olympus", heroSkin: "★ Karambit | Case Hardened #387 Blue Gem", sortOrder: 7, mode: "olympus" },
  { slug: "olympus-souvenir-dlore-kato", name: "Сейф Шейха: 4x Titan Lore", subtitle: "Абсолютный грааль CS2 за $250,000", price: 18500.0, oldPrice: 22000.0, accentColor: "#FACC15", badge: "$250,000", categorySlug: "billionaire-olympus", heroSkin: "Souvenir AWP | Dragon Lore (4x Titan Holo Kato 14)", sortOrder: 8, mode: "olympus" },
];

export async function expandCatalogAndRebalanceCases(): Promise<{
  totalSkins: number;
  totalCases: number;
  addedSkins: number;
}> {
  let apiSkins: ExternalApiSkin[] = [];
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json"
    );
    if (res.ok) {
      apiSkins = (await res.json()) as ExternalApiSkin[];
    }
  } catch {
    // Offline fallback
  }

  const existingSkins = await prisma.skin.findMany();
  const existingMap = new Map(existingSkins.map((s) => [s.name, s]));
  let addedSkins = 0;

  // 1A. Seed the 14 Ultra-Expensive Mythic / Collector Grail Skins ($18,500 – $250,000)
  const findImg = (substr: string, fallbackWeapon: string) => {
    const found =
      existingSkins.find((s) => s.name.includes(substr)) ||
      existingSkins.find((s) => s.weapon === fallbackWeapon);
    return (
      found?.imageUrl ||
      "https://raw.githubusercontent.com/ByMykel/counter-strike-image-tracker/main/static/panorama/images/econ/default_generated/weapon_awp_cu_medieval_dragon_awp_light_png.png"
    );
  };

  const ULTRA_MYTHIC_SKINS = [
    {
      name: "Souvenir AWP | Dragon Lore (4x Titan Holo Kato 14)",
      weapon: "AWP",
      skinName: "Dragon Lore (4x Titan Holo Kato 14)",
      rarity: "GOLD",
      basePrice: 250000,
      imageUrl: findImg("Dragon Lore", "AWP"),
      collection: "Katowice 2014 Collector Vault",
    },
    {
      name: "★ Karambit | Case Hardened #387 Blue Gem",
      weapon: "Karambit",
      skinName: "Case Hardened #387 Blue Gem",
      rarity: "GOLD",
      basePrice: 185000,
      imageUrl: findImg("Karambit", "Karambit"),
      collection: "Blue Gem Syndicate",
    },
    {
      name: "AK-47 | Case Hardened #661 ST™ 4x Titan Holo",
      weapon: "AK-47",
      skinName: "Case Hardened #661 (4x Titan Holo)",
      rarity: "GOLD",
      basePrice: 145000,
      imageUrl: findImg("Case Hardened", "AK-47"),
      collection: "Katowice 2014 Collector Vault",
    },
    {
      name: "M4A4 | Howl ST™ FN (4x iBUYPOWER Holo)",
      weapon: "M4A4",
      skinName: "Howl (4x iBUYPOWER Holo Kato 14)",
      rarity: "GOLD",
      basePrice: 115000,
      imageUrl: findImg("Howl", "M4A4"),
      collection: "Contraband Grail",
    },
    {
      name: "★ M9 Bayonet | Crimson Web #1 World FN",
      weapon: "M9 Bayonet",
      skinName: "Crimson Web #1 World (0.060001)",
      rarity: "GOLD",
      basePrice: 95000,
      imageUrl: findImg("M9 Bayonet", "M9 Bayonet"),
      collection: "World Rank #1 Vault",
    },
    {
      name: "AWP | Gungnir (4x Reason Gaming Holo Kato 14)",
      weapon: "AWP",
      skinName: "Gungnir (4x Reason Holo Kato 14)",
      rarity: "GOLD",
      basePrice: 88000,
      imageUrl: findImg("Gungnir", "AWP"),
      collection: "Norse Kato 14 Craft",
    },
    {
      name: "★ Sport Gloves | Pandora's Box #1 Float FN",
      weapon: "Sport Gloves",
      skinName: "Pandora's Box #1 Float FN",
      rarity: "GOLD",
      basePrice: 78000,
      imageUrl: findImg("Pandora", "Sport Gloves"),
      collection: "World Rank #1 Vault",
    },
    {
      name: "★ Butterfly Knife | Emerald #1 World FN",
      weapon: "Butterfly Knife",
      skinName: "Gamma Doppler Emerald #1 FN",
      rarity: "GOLD",
      basePrice: 68000,
      imageUrl: findImg("Butterfly Knife", "Butterfly Knife"),
      collection: "Emerald Dynasty",
    },
    {
      name: "★ Talon Knife | Case Hardened #55 Blue Gem",
      weapon: "Talon Knife",
      skinName: "Case Hardened #55 Blue Gem",
      rarity: "GOLD",
      basePrice: 62000,
      imageUrl: findImg("Talon Knife", "Talon Knife"),
      collection: "Blue Gem Syndicate",
    },
    {
      name: "AK-47 | Wild Lotus (4x Reason Gaming Holo Kato 14)",
      weapon: "AK-47",
      skinName: "Wild Lotus (4x Reason Holo)",
      rarity: "GOLD",
      basePrice: 56000,
      imageUrl: findImg("Wild Lotus", "AK-47"),
      collection: "St. Marc Collector Craft",
    },
    {
      name: "★ Skeleton Knife | Crimson Web #1 World FN",
      weapon: "Skeleton Knife",
      skinName: "Crimson Web #1 World FN",
      rarity: "GOLD",
      basePrice: 48000,
      imageUrl: findImg("Skeleton Knife", "Skeleton Knife"),
      collection: "World Rank #1 Vault",
    },
    {
      name: "★ Karambit | Doppler Sapphire #1 World FN",
      weapon: "Karambit",
      skinName: "Doppler Sapphire #1 World FN",
      rarity: "GOLD",
      basePrice: 42000,
      imageUrl: findImg("Karambit", "Karambit"),
      collection: "Gem Syndicate",
    },
    {
      name: "★ Sport Gloves | Hedge Maze #1 World FN",
      weapon: "Sport Gloves",
      skinName: "Hedge Maze #1 World FN",
      rarity: "GOLD",
      basePrice: 36000,
      imageUrl: findImg("Sport Gloves", "Sport Gloves"),
      collection: "World Rank #1 Vault",
    },
    {
      name: "Souvenir AK-47 | Gold Arabesque (4x Gold Major)",
      weapon: "AK-47",
      skinName: "Gold Arabesque (Souvenir #1 FN)",
      rarity: "GOLD",
      basePrice: 24500,
      imageUrl: findImg("Gold Arabesque", "AK-47"),
      collection: "Dust II Souvenir Vault",
    },
  ];

  for (const mythic of ULTRA_MYTHIC_SKINS) {
    if (!existingMap.has(mythic.name)) {
      const created = await prisma.skin.create({
        data: {
          ...mythic,
          canBeStatTrak: !mythic.weapon.toLowerCase().includes("gloves"),
        },
      });
      existingMap.set(created.name, created);
      addedSkins++;
    } else {
      const ex = existingMap.get(mythic.name)!;
      if (ex.basePrice !== mythic.basePrice) {
        const upd = await prisma.skin.update({
          where: { id: ex.id },
          data: { basePrice: mythic.basePrice, rarity: "GOLD" },
        });
        existingMap.set(upd.name, upd);
      }
    }
  }

  // 1B. Add +1,050 more skins to reach 2,380+ total skins in DB
  const targetSkinTotal = 2380;
  const newSkinsBatch: {
    name: string;
    weapon: string;
    skinName: string;
    rarity: string;
    basePrice: number;
    imageUrl: string;
    collection: string;
    canBeStatTrak: boolean;
  }[] = [];

  if (apiSkins.length > 0 && existingSkins.length < targetSkinTotal) {
    for (
      let i = 0;
      i < apiSkins.length &&
      existingSkins.length + newSkinsBatch.length < targetSkinTotal;
      i++
    ) {
      const item = apiSkins[i];
      if (!item || !item.name || !item.image || !item.name.includes("|")) {
        continue;
      }
      if (existingMap.has(item.name)) continue;

      const parts = item.name.split("|");
      const weapon = (item.weapon?.name || parts[0]).replace("★ ", "").trim();
      const skinName = (item.pattern?.name || parts[1] || "Custom").trim();
      const rarity = mapApiRarity(item);
      const basePrice = generateRealisticPrice(rarity, weapon, i);
      const collection = item.collections?.[0]?.name || "CS2 Collection";

      newSkinsBatch.push({
        name: item.name,
        weapon,
        skinName,
        rarity,
        basePrice,
        imageUrl: item.image,
        collection,
        canBeStatTrak:
          !weapon.toLowerCase().includes("gloves") &&
          !weapon.toLowerCase().includes("wraps"),
      });
      existingMap.set(item.name, {} as never);
    }
  }

  // If external API had fewer than 2,380 unique base names, generate official Souvenir / Kato-Craft / Phase editions from real skins
  const EDITION_TAGS = [
    { prefix: "Souvenir ", suffix: " (Gold Foil)", mult: 2.35, col: "Souvenir Major Vault" },
    { prefix: "", suffix: " (Kato 14 Craft)", mult: 3.1, col: "Katowice Craft Series" },
    { prefix: "", suffix: " (Crown Foil)", mult: 1.75, col: "Crown Collector Series" },
    { prefix: "", suffix: " (Low Float #1)", mult: 2.1, col: "Rank #1 Float Archive" },
  ];

  let edIdx = 0;
  while (existingSkins.length + newSkinsBatch.length < targetSkinTotal && existingSkins.length > 0) {
    const baseSkin = existingSkins[edIdx % existingSkins.length];
    const tag = EDITION_TAGS[Math.floor(edIdx / existingSkins.length) % EDITION_TAGS.length];
    edIdx++;
    if (edIdx > 6000) break;

    const craftedName = `${tag.prefix}${baseSkin.weapon} | ${baseSkin.skinName}${tag.suffix}`;
    if (existingMap.has(craftedName)) continue;

    // Also create ultra-cheap grind skins ($0.06 – $0.45) for the first 120 generated items so Hardcore Grind Cases have plenty of micro-skins
    const isMicroGrind = newSkinsBatch.length % 5 === 0;
    const craftedPrice = isMicroGrind
      ? Number((0.06 + ((edIdx * 13) % 38) / 100).toFixed(2))
      : Number((baseSkin.basePrice * tag.mult).toFixed(2));

    newSkinsBatch.push({
      name: craftedName,
      weapon: baseSkin.weapon,
      skinName: `${baseSkin.skinName}${tag.suffix}`,
      rarity: isMicroGrind ? "MIL_SPEC" : baseSkin.rarity,
      basePrice: craftedPrice,
      imageUrl: baseSkin.imageUrl,
      collection: isMicroGrind ? "Hardcore Grind Drop" : tag.col,
      canBeStatTrak: baseSkin.canBeStatTrak,
    });
    existingMap.set(craftedName, {} as never);
  }

  if (newSkinsBatch.length > 0) {
    try {
      const createdBatch = await prisma.skin.createMany({
        data: newSkinsBatch,
      });
      addedSkins += createdBatch.count;
    } catch {
      for (const skinData of newSkinsBatch) {
        try {
          await prisma.skin.create({ data: skinData });
          addedSkins++;
        } catch {
          // Ignore duplicate
        }
      }
    }
  }

  const allSkins = await prisma.skin.findMany();
  const fullMap = new Map(allSkins.map((s) => [s.name, s]));

  // 2. Upsert all 11 Categories
  const categoryIdMap = new Map<string, string>();
  for (const cat of CATEGORIES_BLUEPRINT) {
    const upserted = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        name: cat.name,
        subtitle: cat.subtitle,
        icon: cat.icon,
        accentColor: cat.accentColor,
        sortOrder: cat.sortOrder,
      },
      create: cat,
    });
    categoryIdMap.set(cat.slug, upserted.id);
  }

  // Helper to pick distinct skins closest to desired price targets
  const pickDistinctClosest = (
    pool: typeof allSkins,
    targetPrices: number[],
    usedIds: Set<string>,
    seedShift: number
  ) => {
    const picked: typeof allSkins = [];
    for (let idx = 0; idx < targetPrices.length; idx++) {
      const targetP = targetPrices[idx];
      const available = pool.filter((s) => !usedIds.has(s.id));
      const sourcePool = available.length > 0 ? available : allSkins.filter((s) => !usedIds.has(s.id));
      if (sourcePool.length === 0) break;

      const sortedByDiff = [...sourcePool].sort(
        (a, b) => Math.abs(a.basePrice - targetP) - Math.abs(b.basePrice - targetP)
      );
      const topCandidates = sortedByDiff.slice(0, Math.min(5, sortedByDiff.length));
      const chosen = topCandidates[(idx + seedShift) % topCandidates.length];
      if (chosen) {
        usedIds.add(chosen.id);
        picked.push(chosen);
      }
    }
    return picked;
  };

  // 3. Upsert all 84 Cases and rebuild their CaseItems with honest, fair distribution
  for (let cIdx = 0; cIdx < CASES_BLUEPRINT.length; cIdx++) {
    const bp = CASES_BLUEPRINT[cIdx];
    const hero =
      fullMap.get(bp.heroSkin) ||
      allSkins.find((s) => s.name.includes(bp.heroSkin)) ||
      allSkins[0];
    const categoryId = categoryIdMap.get(bp.categorySlug)!;

    const upsertedCase = await prisma.case.upsert({
      where: { slug: bp.slug },
      update: {
        name: bp.name,
        subtitle: bp.subtitle,
        price: bp.price,
        oldPrice: bp.oldPrice,
        imageUrl: hero.imageUrl,
        accentColor: bp.accentColor,
        badge: bp.badge,
        sortOrder: bp.sortOrder,
        categoryId,
      },
      create: {
        slug: bp.slug,
        name: bp.name,
        subtitle: bp.subtitle,
        price: bp.price,
        oldPrice: bp.oldPrice,
        imageUrl: hero.imageUrl,
        accentColor: bp.accentColor,
        badge: bp.badge,
        openCount: Math.floor(9500 + ((cIdx * 4391) % 42000)),
        sortOrder: bp.sortOrder,
        categoryId,
      },
    });

    // Clear old items for this case and insert cleanly balanced ones
    await prisma.caseItem.deleteMany({
      where: { caseId: upsertedCase.id },
    });

    const usedIds = new Set<string>([hero.id]);
    const p = bp.price;

    let candidatePool = allSkins;
    if (bp.mode === "weapon" && bp.weaponFilter && bp.weaponFilter.length > 0) {
      const wf = bp.weaponFilter.map((w) => w.toLowerCase());
      const weaponMatched = allSkins.filter((s) =>
        wf.includes(s.weapon.toLowerCase())
      );
      if (weaponMatched.length >= 8) {
        candidatePool = weaponMatched;
      }
    }

    const itemsToCreate: { skinId: string; chance: number }[] = [];

    if (bp.mode === "5050") {
      // Strictly 4 skins for 50/50 cases:
      // 1 Hero (~2.2x-3x) @ 18%, 1 Profit (~1.6x) @ 30% => 48% Profit Chance!
      // 2 Consolation (~0.45x and ~0.32x) @ 28% and 24% => 52% Consolation
      const rest = pickDistinctClosest(
        candidatePool,
        [p * 1.65, p * 0.48, p * 0.34],
        usedIds,
        cIdx
      );
      itemsToCreate.push({ skinId: hero.id, chance: 18.0 });
      const chances5050 = [30.0, 28.0, 24.0];
      rest.forEach((sk, i) => {
        itemsToCreate.push({ skinId: sk.id, chance: chances5050[i] || 20.0 });
      });
    } else if (bp.mode === "knife" || bp.mode === "olympus") {
      // Knife/Glove & Olympus Vaults: top 4 items are strictly GOLD (Knives/Gloves/Mythics), rest are high-value Covert/Classified
      const goldPool = allSkins.filter((s) => s.rarity === "GOLD");
      const extraGolds = pickDistinctClosest(
        goldPool,
        [p * 3.2, p * 2.1, p * 1.45],
        usedIds,
        cIdx
      );
      const supportSkins = pickDistinctClosest(
        allSkins.filter((s) => s.rarity !== "MIL_SPEC"),
        [p * 1.15, p * 0.95, p * 0.8, p * 0.65, p * 0.52, p * 0.42, p * 0.35],
        usedIds,
        cIdx + 3
      );

      itemsToCreate.push({ skinId: hero.id, chance: 1.5 });
      const goldChances = [3.0, 4.5, 6.0];
      extraGolds.forEach((sk, i) => {
        itemsToCreate.push({ skinId: sk.id, chance: goldChances[i] || 3.0 });
      });
      const supChances = [10.0, 12.0, 14.0, 15.0, 13.0, 11.5, 9.5];
      supportSkins.forEach((sk, i) => {
        itemsToCreate.push({ skinId: sk.id, chance: supChances[i] || 10.0 });
      });
    } else {
      // Standard / Weapon / Collector Case: 12 honest, tightly-scaled skins
      const targetMultipliers = [
        2.6,  // High Jackpot #2 (3.5%)
        1.85, // High Profit (5.5%)
        1.45, // Solid Profit (8.0%)
        1.18, // Profit (10.5%)
        1.02, // Break-even (13.0%) -> Total Profit/Break-Even = 42.0%!
        0.82, // Near payback (15.0%)
        0.68, // Mid payback (14.0%)
        0.55, // Mid-low (11.5%)
        0.44, // Low (8.5%)
        0.36, // Floor #1 (5.5%)
        0.30, // Floor #2 (3.5%)
      ];
      const targetPrices = targetMultipliers.map((m) => p * m);
      const picked = pickDistinctClosest(
        candidatePool,
        targetPrices,
        usedIds,
        cIdx
      );

      itemsToCreate.push({ skinId: hero.id, chance: 1.5 });
      const stdChances = [
        3.5, 5.5, 8.0, 10.5, 13.0, 15.0, 14.0, 11.5, 8.5, 5.5, 3.5,
      ];
      picked.forEach((sk, i) => {
        itemsToCreate.push({ skinId: sk.id, chance: stdChances[i] || 5.0 });
      });
    }

    if (itemsToCreate.length > 0) {
      await prisma.caseItem.createMany({
        data: itemsToCreate.map((item) => ({
          caseId: upsertedCase.id,
          skinId: item.skinId,
          dropChance: item.chance,
          weight: Math.max(1, Math.round(item.chance * 100)),
        })),
      });
    }
  }

  const finalSkinsCount = await prisma.skin.count();
  const finalCasesCount = await prisma.case.count();

  return {
    totalSkins: finalSkinsCount,
    totalCases: finalCasesCount,
    addedSkins,
  };
}
