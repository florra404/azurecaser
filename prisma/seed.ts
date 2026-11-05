import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ApiSkin {
  name: string;
  image: string;
  weapon?: { name?: string };
  pattern?: { name?: string };
  rarity?: { id?: string; name?: string };
  category?: { name?: string };
  collections?: { name?: string }[];
}

const CURATED_SKINS = [
  // === GOLD / KNIVES & GLOVES ===
  { name: "★ Butterfly Knife | Gamma Doppler", weapon: "Butterfly Knife", skinName: "Gamma Doppler (Emerald)", rarity: "GOLD", basePrice: 4850.0, collection: "Emerald" },
  { name: "★ Karambit | Doppler", weapon: "Karambit", skinName: "Doppler (Sapphire)", rarity: "GOLD", basePrice: 4200.0, collection: "Sapphire" },
  { name: "★ M9 Bayonet | Doppler", weapon: "M9 Bayonet", skinName: "Doppler (Ruby)", rarity: "GOLD", basePrice: 3650.0, collection: "Ruby" },
  { name: "★ Butterfly Knife | Fade", weapon: "Butterfly Knife", skinName: "Fade", rarity: "GOLD", basePrice: 3100.0, collection: "Fade" },
  { name: "★ Sport Gloves | Vice", weapon: "Sport Gloves", skinName: "Vice", rarity: "GOLD", basePrice: 2450.0, collection: "Gloves" },
  { name: "★ Sport Gloves | Pandora's Box", weapon: "Sport Gloves", skinName: "Pandora's Box", rarity: "GOLD", basePrice: 3900.0, collection: "Gloves" },
  { name: "★ Specialist Gloves | Cobalt Skulls", weapon: "Specialist Gloves", skinName: "Cobalt Skulls", rarity: "GOLD", basePrice: 920.0, collection: "Gloves" },
  { name: "★Sport Gloves | Amphibious", searchName: "★ Sport Gloves | Amphibious", weapon: "Sport Gloves", skinName: "Amphibious", rarity: "GOLD", basePrice: 1180.0, collection: "Gloves" },
  { name: "★ Karambit | Lore", weapon: "Karambit", skinName: "Lore", rarity: "GOLD", basePrice: 1890.0, collection: "Lore" },
  { name: "★ Karambit | Tiger Tooth", weapon: "Karambit", skinName: "Tiger Tooth", rarity: "GOLD", basePrice: 1150.0, collection: "Chroma" },
  { name: "★ Skeleton Knife | Fade", weapon: "Skeleton Knife", skinName: "Fade", rarity: "GOLD", basePrice: 1620.0, collection: "Fracture" },
  { name: "★ Talon Knife | Marble Fade", weapon: "Talon Knife", skinName: "Marble Fade", rarity: "GOLD", basePrice: 940.0, collection: "Prisma" },
  { name: "★ Bayonet | Gamma Doppler", weapon: "Bayonet", skinName: "Gamma Doppler", rarity: "GOLD", basePrice: 780.0, collection: "Gamma" },
  { name: "★ Kukri Knife | Fade", weapon: "Kukri Knife", skinName: "Fade", rarity: "GOLD", basePrice: 690.0, collection: "Kilowatt" },
  { name: "★ Flip Knife | Doppler", weapon: "Flip Knife", skinName: "Doppler", rarity: "GOLD", basePrice: 460.0, collection: "Chroma" },

  // === COVERT ===
  { name: "AWP | Dragon Lore", weapon: "AWP", skinName: "Dragon Lore", rarity: "COVERT", basePrice: 6500.0, collection: "Cobblestone" },
  { name: "AWP | Gungnir", weapon: "AWP", skinName: "Gungnir", rarity: "COVERT", basePrice: 5400.0, collection: "Norse" },
  { name: "AK-47 | Wild Lotus", weapon: "AK-47", skinName: "Wild Lotus", rarity: "COVERT", basePrice: 4900.0, collection: "St. Marc" },
  { name: "M4A4 | Howl", weapon: "M4A4", skinName: "Howl", rarity: "COVERT", basePrice: 3800.0, collection: "Huntsman" },
  { name: "AWP | The Prince", weapon: "AWP", skinName: "The Prince", rarity: "COVERT", basePrice: 2650.0, collection: "Canals" },
  { name: "AK-47 | Gold Arabesque", weapon: "AK-47", skinName: "Gold Arabesque", rarity: "COVERT", basePrice: 2200.0, collection: "Dust 2" },
  { name: "AWP | Medusa", weapon: "AWP", skinName: "Medusa", rarity: "COVERT", basePrice: 2150.0, collection: "Gods & Monsters" },
  { name: "AK-47 | Fire Serpent", weapon: "AK-47", skinName: "Fire Serpent", rarity: "COVERT", basePrice: 1120.0, collection: "Bravo" },
  { name: "AWP | Fade", weapon: "AWP", skinName: "Fade", rarity: "COVERT", basePrice: 980.0, collection: "Control" },
  { name: "M4A1-S | Welcome to the Jungle", weapon: "M4A1-S", skinName: "Welcome to the Jungle", rarity: "COVERT", basePrice: 1350.0, collection: "Ancient" },
  { name: "AK-47 | Vulcan", weapon: "AK-47", skinName: "Vulcan", rarity: "COVERT", basePrice: 540.0, collection: "Huntsman" },
  { name: "M4A1-S | Blue Phosphor", weapon: "M4A1-S", skinName: "Blue Phosphor", rarity: "CLASSIFIED", basePrice: 680.0, collection: "Control" },
  { name: "M4A1-S | Printstream", weapon: "M4A1-S", skinName: "Printstream", rarity: "COVERT", basePrice: 245.0, collection: "Broken Fang" },
  { name: "AK-47 | Inheritance", weapon: "AK-47", skinName: "Inheritance", rarity: "COVERT", basePrice: 165.0, collection: "Kilowatt" },
  { name: "AWP | Chrome Cannon", weapon: "AWP", skinName: "Chrome Cannon", rarity: "COVERT", basePrice: 125.0, collection: "Kilowatt" },
  { name: "AWP | Asiimov", weapon: "AWP", skinName: "Asiimov", rarity: "COVERT", basePrice: 138.0, collection: "Phoenix" },
  { name: "AK-47 | Asiimov", weapon: "AK-47", skinName: "Asiimov", rarity: "COVERT", basePrice: 95.0, collection: "Danger Zone" },
  { name: "AWP | Containment Breach", weapon: "AWP", skinName: "Containment Breach", rarity: "COVERT", basePrice: 185.0, collection: "Shattered Web" },
  { name: "AWP | Hyper Beast", weapon: "AWP", skinName: "Hyper Beast", rarity: "COVERT", basePrice: 72.0, collection: "Falchion" },
  { name: "AWP | Wildfire", weapon: "AWP", skinName: "Wildfire", rarity: "COVERT", basePrice: 88.0, collection: "CS20" },
  { name: "M4A4 | Temukau", weapon: "M4A4", skinName: "Temukau", rarity: "COVERT", basePrice: 64.0, collection: "Revolution" },
  { name: "M4A4 | Neo-Noir", weapon: "M4A4", skinName: "Neo-Noir", rarity: "COVERT", basePrice: 34.0, collection: "Clutch" },
  { name: "AK-47 | Neon Rider", weapon: "AK-47", skinName: "Neon Rider", rarity: "COVERT", basePrice: 78.0, collection: "Horizon" },
  { name: "AK-47 | Bloodsport", weapon: "AK-47", skinName: "Bloodsport", rarity: "COVERT", basePrice: 118.0, collection: "Spectrum" },
  { name: "USP-S | Kill Confirmed", weapon: "USP-S", skinName: "Kill Confirmed", rarity: "COVERT", basePrice: 92.0, collection: "Shadow" },
  { name: "USP-S | Printstream", weapon: "USP-S", skinName: "Printstream", rarity: "COVERT", basePrice: 84.0, collection: "Recoil" },
  { name: "Desert Eagle | Printstream", weapon: "Desert Eagle", skinName: "Printstream", rarity: "COVERT", basePrice: 58.0, collection: "Fracture" },
  { name: "Glock-18 | Gamma Doppler", weapon: "Glock-18", skinName: "Gamma Doppler", rarity: "COVERT", basePrice: 68.0, collection: "Train" },

  // === CLASSIFIED ===
  { name: "Desert Eagle | Blaze", weapon: "Desert Eagle", skinName: "Blaze", rarity: "RESTRICTED", basePrice: 640.0, collection: "Dust" },
  { name: "Glock-18 | Fade", weapon: "Glock-18", skinName: "Fade", rarity: "RESTRICTED", basePrice: 1290.0, collection: "Assault" },
  { name: "AK-47 | Ice Coaled", weapon: "AK-47", skinName: "Ice Coaled", rarity: "CLASSIFIED", basePrice: 18.5, collection: "Recoil" },
  { name: "AK-47 | Slate", weapon: "AK-47", skinName: "Slate", rarity: "RESTRICTED", basePrice: 8.5, collection: "Snakebite" },
  { name: "M4A1-S | Black Lotus", weapon: "M4A1-S", skinName: "Black Lotus", rarity: "CLASSIFIED", basePrice: 22.0, collection: "Kilowatt" },
  { name: "M4A1-S | Nightmare", weapon: "M4A1-S", skinName: "Nightmare", rarity: "CLASSIFIED", basePrice: 26.5, collection: "Horizon" },
  { name: "M4A1-S | Decimator", weapon: "M4A1-S", skinName: "Decimator", rarity: "CLASSIFIED", basePrice: 29.0, collection: "Spectrum" },
  { name: "M4A4 | The Emperor", weapon: "M4A4", skinName: "The Emperor", rarity: "COVERT", basePrice: 52.0, collection: "Prisma" },
  { name: "AWP | Chromatic Aberration", weapon: "AWP", skinName: "Chromatic Aberration", rarity: "COVERT", basePrice: 24.0, collection: "Recoil" },
  { name: "AWP | Duality", weapon: "AWP", skinName: "Duality", rarity: "CLASSIFIED", basePrice: 14.5, collection: "Revolution" },
  { name: "USP-S | Jawbreaker", weapon: "USP-S", skinName: "Jawbreaker", rarity: "CLASSIFIED", basePrice: 19.0, collection: "Kilowatt" },
  { name: "USP-S | Cortex", weapon: "USP-S", skinName: "Cortex", rarity: "CLASSIFIED", basePrice: 9.8, collection: "Clutch" },
  { name: "Glock-18 | Water Elemental", weapon: "Glock-18", skinName: "Water Elemental", rarity: "CLASSIFIED", basePrice: 11.2, collection: "Breakout" },
  { name: "Desert Eagle | Cobalt Disruption", weapon: "Desert Eagle", skinName: "Cobalt Disruption", rarity: "CLASSIFIED", basePrice: 66.0, collection: "Winter" },
  { name: "Desert Eagle | Kumicho Dragon", weapon: "Desert Eagle", skinName: "Kumicho Dragon", rarity: "CLASSIFIED", basePrice: 28.0, collection: "Wildfire" },

  // === RESTRICTED & MIL-SPEC ===
  { name: "AWP | Atheris", weapon: "AWP", skinName: "Atheris", rarity: "RESTRICTED", basePrice: 7.4, collection: "Prisma" },
  { name: "AWP | Exoskeleton", weapon: "AWP", skinName: "Exoskeleton", rarity: "RESTRICTED", basePrice: 4.8, collection: "Broken Fang" },
  { name: "AK-47 | Frontside Misty", weapon: "AK-47", skinName: "Frontside Misty", rarity: "CLASSIFIED", basePrice: 32.0, collection: "Shadow" },
  { name: "AK-47 | Phantom Disruptor", weapon: "AK-47", skinName: "Phantom Disruptor", rarity: "CLASSIFIED", basePrice: 12.4, collection: "Prisma 2" },
  { name: "Desert Eagle | Mecha Industries", weapon: "Desert Eagle", skinName: "Mecha Industries", rarity: "CLASSIFIED", basePrice: 11.5, collection: "Danger Zone" },
  { name: "Desert Eagle | Light Rail", weapon: "Desert Eagle", skinName: "Light Rail", rarity: "RESTRICTED", basePrice: 3.9, collection: "Prisma" },
  { name: "USP-S | Cyrex", weapon: "USP-S", skinName: "Cyrex", rarity: "RESTRICTED", basePrice: 4.2, collection: "Glove" },
  { name: "Glock-18 | Vogue", weapon: "Glock-18", skinName: "Vogue", rarity: "CLASSIFIED", basePrice: 7.8, collection: "Fracture" },
  { name: "MP9 | Starlight Protector", weapon: "MP9", skinName: "Starlight Protector", rarity: "COVERT", basePrice: 21.0, collection: "Dreams" },
  { name: "MAC-10 | Neon Rider", weapon: "MAC-10", skinName: "Neon Rider", rarity: "COVERT", basePrice: 15.5, collection: "Chroma 2" },
  { name: "SSG 08 | Dragonfire", weapon: "SSG 08", skinName: "Dragonfire", rarity: "COVERT", basePrice: 19.5, collection: "Glove" },
  { name: "M4A4 | Desolate Space", weapon: "M4A4", skinName: "Desolate Space", rarity: "CLASSIFIED", basePrice: 16.0, collection: "Gamma" },
  { name: "FAMAS | Commemoration", weapon: "FAMAS", skinName: "Commemoration", rarity: "COVERT", basePrice: 17.5, collection: "CS20" },
  { name: "Galil AR | Chromatic Aberration", weapon: "Galil AR", skinName: "Chromatic Aberration", rarity: "CLASSIFIED", basePrice: 5.6, collection: "Snakebite" },
  { name: "P250 | Asiimov", weapon: "P250", skinName: "Asiimov", rarity: "CLASSIFIED", basePrice: 8.9, collection: "Chroma 3" },
  { name: "Five-SeveN | Angry Mob", weapon: "Five-SeveN", skinName: "Angry Mob", rarity: "COVERT", basePrice: 9.5, collection: "Prisma" },
  { name: "MP7 | Bloodsport", weapon: "MP7", skinName: "Bloodsport", rarity: "COVERT", basePrice: 5.2, collection: "Clutch" },
  { name: "UMP-45 | Primal Saber", weapon: "UMP-45", skinName: "Primal Saber", rarity: "CLASSIFIED", basePrice: 6.4, collection: "Chroma 3" },
  { name: "AWP | Capillary", weapon: "AWP", skinName: "Capillary", rarity: "MIL_SPEC", basePrice: 1.85, collection: "Horizon" },
  { name: "AK-47 | Elite Build", weapon: "AK-47", skinName: "Elite Build", rarity: "MIL_SPEC", basePrice: 2.9, collection: "Chroma 2" },
  { name: "M4A1-S | Night Terror", weapon: "M4A1-S", skinName: "Night Terror", rarity: "RESTRICTED", basePrice: 2.4, collection: "Dreams" },
  { name: "USP-S | Ticket to Hell", weapon: "USP-S", skinName: "Ticket to Hell", rarity: "RESTRICTED", basePrice: 1.95, collection: "Dreams" },
  { name: "Glock-18 | Moonrise", weapon: "Glock-18", skinName: "Moonrise", rarity: "RESTRICTED", basePrice: 2.2, collection: "Clutch" },
  { name: "Desert Eagle | Blue Ply", weapon: "Desert Eagle", skinName: "Blue Ply", rarity: "MIL_SPEC", basePrice: 1.45, collection: "Prisma 2" },
  { name: "MP9 | Bioleak", weapon: "MP9", skinName: "Bioleak", rarity: "MIL_SPEC", basePrice: 0.95, collection: "Gamma" },
  { name: "MAC-10 | Oceanic", weapon: "MAC-10", skinName: "Oceanic", rarity: "MIL_SPEC", basePrice: 0.85, collection: "Chroma 3" },
];

function mapApiRarity(apiItem: ApiSkin): string {
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

function generateRealisticPrice(rarity: string, weapon: string, index: number): number {
  const isTopGun = ["AWP", "AK-47", "M4A1-S", "M4A4", "Desert Eagle", "USP-S", "Glock-18"].includes(weapon);
  const mult = isTopGun ? 1.45 : 1.0;
  const seed = ((index * 73) % 100) / 100;

  if (rarity === "GOLD") {
    return Number((320 + seed * 2400).toFixed(2));
  }
  if (rarity === "COVERT") {
    return Number(((28 + seed * 420) * mult).toFixed(2));
  }
  if (rarity === "CLASSIFIED") {
    return Number(((8 + seed * 85) * mult).toFixed(2));
  }
  if (rarity === "RESTRICTED") {
    return Number(((1.8 + seed * 19) * mult).toFixed(2));
  }
  return Number(((0.45 + seed * 5.2) * mult).toFixed(2));
}

async function fetchFullSkinsCatalog(): Promise<ApiSkin[]> {
  try {
    console.log("🌐 Fetching full CS2 skins catalog from ByMykel CSGO-API...");
    const res = await fetch(
      "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json"
    );
    if (res.ok) {
      return (await res.json()) as ApiSkin[];
    }
  } catch (err) {
    console.warn("Could not fetch external skin API:", err);
  }
  return [];
}

async function main() {
  const apiSkins = await fetchFullSkinsCatalog();
  const imageMap = new Map<string, string>();
  for (const item of apiSkins) {
    if (item.name && item.image && !imageMap.has(item.name)) {
      imageMap.set(item.name, item.image);
    }
  }

  await prisma.upgradeHistory.deleteMany();
  await prisma.openHistory.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.caseItem.deleteMany();
  await prisma.case.deleteMany();
  await prisma.category.deleteMany();
  await prisma.skin.deleteMany();
  await prisma.user.deleteMany();

  const skinRecords = new Map<
    string,
    { id: string; name: string; weapon: string; skinName: string; rarity: string; basePrice: number; imageUrl: string }
  >();

  // 1. Seed 84 Curated Skins first
  for (const s of CURATED_SKINS) {
    const lookupKey = (s as { searchName?: string }).searchName || s.name;
    let imageUrl = imageMap.get(lookupKey) || imageMap.get(s.name);

    if (!imageUrl) {
      for (const [apiName, apiImg] of imageMap.entries()) {
        if (
          apiName.toLowerCase().includes(s.weapon.toLowerCase()) &&
          apiName.toLowerCase().includes(s.skinName.split(" ")[0].toLowerCase())
        ) {
          imageUrl = apiImg;
          break;
        }
      }
    }

    if (!imageUrl) {
      imageUrl =
        "https://raw.githubusercontent.com/ByMykel/counter-strike-image-tracker/main/static/panorama/images/econ/default_generated/weapon_awp_cu_awp_asimov_light_png.png";
    }

    const cleanName = s.name.replace("★Sport", "★ Sport");
    const created = await prisma.skin.create({
      data: {
        name: cleanName,
        weapon: s.weapon,
        skinName: s.skinName,
        rarity: s.rarity,
        basePrice: s.basePrice,
        imageUrl,
        collection: s.collection,
        canBeStatTrak: !s.weapon.includes("Gloves"),
      },
    });
    skinRecords.set(created.name, created);
  }

  // 2. Automatically add 240+ additional real CS2 skins across all rarities and weapons!
  let extraAdded = 0;
  const step = Math.max(1, Math.floor(apiSkins.length / 280));

  for (let i = 0; i < apiSkins.length && extraAdded < 240; i += step) {
    const item = apiSkins[i];
    if (!item || !item.name || !item.image || !item.name.includes("|")) continue;
    if (skinRecords.has(item.name)) continue;

    const parts = item.name.split("|");
    const weapon = (item.weapon?.name || parts[0]).replace("★ ", "").trim();
    const skinName = (item.pattern?.name || parts[1] || "Custom").trim();
    const rarity = mapApiRarity(item);
    const basePrice = generateRealisticPrice(rarity, weapon, i);
    const collection = item.collections?.[0]?.name || "CS2 Collection";

    try {
      const created = await prisma.skin.create({
        data: {
          name: item.name,
          weapon,
          skinName,
          rarity,
          basePrice,
          imageUrl: item.image,
          collection,
          canBeStatTrak: !weapon.toLowerCase().includes("gloves") && !weapon.toLowerCase().includes("wraps"),
        },
      });
      skinRecords.set(created.name, created);
      extraAdded++;
    } catch {
      // Ignore duplicate names
    }
  }

  const allCreatedSkins = Array.from(skinRecords.values());
  console.log(`✅ Total skins in database: ${allCreatedSkins.length}`);

  const getSkin = (name: string) => {
    const found = skinRecords.get(name);
    if (!found) throw new Error(`Skin not found: ${name}`);
    return found;
  };

  // Helper to build a balanced case from a hero skin + price range
  const buildBalancedItems = (heroName: string, casePrice: number) => {
    const hero = getSkin(heroName);
    const lowPool = allCreatedSkins.filter((s) => s.basePrice < casePrice * 0.75 && s.id !== hero.id);
    const midPool = allCreatedSkins.filter(
      (s) => s.basePrice >= casePrice * 0.75 && s.basePrice <= casePrice * 2.5 && s.id !== hero.id
    );
    const highPool = allCreatedSkins.filter(
      (s) => s.basePrice > casePrice * 2.5 && s.basePrice < hero.basePrice && s.id !== hero.id
    );

    const pickN = (pool: typeof allCreatedSkins, n: number, seedOffset: number) => {
      const res: typeof allCreatedSkins = [];
      if (pool.length === 0) return res;
      for (let i = 0; i < n; i++) {
        const candidate = pool[(i * 13 + seedOffset) % pool.length];
        if (!res.some((r) => r.id === candidate.id)) {
          res.push(candidate);
        }
      }
      return res;
    };

    const chosenLow = pickN(lowPool.length >= 4 ? lowPool : allCreatedSkins, 4, Math.round(casePrice * 7));
    const chosenMid = pickN(midPool.length >= 3 ? midPool : allCreatedSkins, 3, Math.round(casePrice * 11));
    const chosenHigh = pickN(highPool.length >= 2 ? highPool : allCreatedSkins, 2, Math.round(casePrice * 17));

    const items: { skinId: string; chance: number }[] = [];
    const lowChances = [26.0, 22.0, 17.0, 12.0];
    const midChances = [9.5, 6.5, 4.0];
    const highChances = [1.8, 0.8];
    const heroChance = 0.4;

    chosenLow.forEach((s, idx) => items.push({ skinId: s.id, chance: lowChances[idx] || 10 }));
    chosenMid.forEach((s, idx) => {
      if (!items.some((x) => x.skinId === s.id)) {
        items.push({ skinId: s.id, chance: midChances[idx] || 5 });
      }
    });
    chosenHigh.forEach((s, idx) => {
      if (!items.some((x) => x.skinId === s.id)) {
        items.push({ skinId: s.id, chance: highChances[idx] || 1 });
      }
    });
    if (!items.some((x) => x.skinId === hero.id)) {
      items.push({ skinId: hero.id, chance: heroChance });
    }

    return items;
  };

  // 3. Seed 7 Categories
  const categoriesData = [
    {
      slug: "budget-farm",
      name: "Бюджетный старт",
      subtitle: "Доступные кейсы для разогрева и фарма инвентаря с нуля",
      icon: "Flame",
      accentColor: "#D4FF00",
      sortOrder: 1,
    },
    {
      slug: "azure-originals",
      name: "Фирменные сборки",
      subtitle: "Сбалансированные кейсы на каждый день с отличным шансом окупа",
      icon: "Snowflake",
      accentColor: "#38BDF8",
      sortOrder: 2,
    },
    {
      slug: "high-voltage",
      name: "Риск 50 на 50",
      subtitle: "Минимум дешёвого ширпа — высокий шанс вытащить жирный скин",
      icon: "Zap",
      accentColor: "#F59E0B",
      sortOrder: 3,
    },
    {
      slug: "arsenal-specialists",
      name: "Оружейные серии",
      subtitle: "Кейсы под конкретную пушку: только AWP, AK-47, M4, Deagle, USP-S или Glock",
      icon: "Crosshair",
      accentColor: "#8B5CF6",
      sortOrder: 4,
    },
    {
      slug: "blade-glove-vaults",
      name: "Ножи и Перчатки",
      subtitle: "Охота за редкими ножами, керамбитами, бабочками и перчатками",
      icon: "Swords",
      accentColor: "#EC4899",
      sortOrder: 5,
    },
    {
      slug: "mythic-archives",
      name: "Коллекционный тир",
      subtitle: "Легендарные скины CS2: Dragon Lore, Gungnir, Howl и Wild Lotus",
      icon: "Crown",
      accentColor: "#EF4444",
      sortOrder: 6,
    },
    {
      slug: "highroller-vip",
      name: "Хайроллер & VIP",
      subtitle: "Элитные сборки для максимальных ставок и крупных заносов",
      icon: "Sparkles",
      accentColor: "#10B981",
      sortOrder: 7,
    },
  ];

  const categories = new Map<string, string>();
  for (const cat of categoriesData) {
    const created = await prisma.category.create({ data: cat });
    categories.set(cat.slug, created.id);
  }

  // 4. Seed 35 Unique Cases across the 7 Categories
  const casesBlueprint = [
    // 1. Бюджетный старт (5 cases)
    { slug: "scout-drop", name: "Fast Drop", subtitle: "Быстрый старт", price: 0.95, oldPrice: 1.4, accentColor: "#D4FF00", badge: "ФАРМ", categorySlug: "budget-farm", heroSkin: "AK-47 | Elite Build", sortOrder: 1 },
    { slug: "neon-mac", name: "Neon Rush", subtitle: "Яркий бюджет", price: 1.8, oldPrice: null, accentColor: "#A3E635", badge: "ХИТ", categorySlug: "budget-farm", heroSkin: "MAC-10 | Neon Rider", sortOrder: 2 },
    { slug: "slate-tactical", name: "Black Slate", subtitle: "Строгий стиль", price: 2.6, oldPrice: 3.2, accentColor: "#38BDF8", badge: null, categorySlug: "budget-farm", heroSkin: "AK-47 | Slate", sortOrder: 3 },
    { slug: "atheris-venom", name: "Venom Strike", subtitle: "Снайперский старт", price: 3.4, oldPrice: null, accentColor: "#10B981", badge: "ТОП", categorySlug: "budget-farm", heroSkin: "AWP | Atheris", sortOrder: 4 },
    { slug: "cortex-brain", name: "Pink Cortex", subtitle: "Розовый тир", price: 4.1, oldPrice: 5.0, accentColor: "#EC4899", badge: null, categorySlug: "budget-farm", heroSkin: "USP-S | Cortex", sortOrder: 5 },

    // 2. Фирменные сборки (6 cases)
    { slug: "cryo-genesis", name: "Ice Coaled", subtitle: "Холодный расчёт", price: 5.5, oldPrice: 7.0, accentColor: "#38BDF8", badge: "ХИТ", categorySlug: "azure-originals", heroSkin: "AK-47 | Ice Coaled", sortOrder: 1 },
    { slug: "abyssal-pulse", name: "Night Pulse", subtitle: "Неоновая сборка", price: 12.5, oldPrice: 15.0, accentColor: "#818CF8", badge: "NEW", categorySlug: "azure-originals", heroSkin: "M4A1-S | Decimator", sortOrder: 2 },
    { slug: "emperor-tarot", name: "The Emperor", subtitle: "Золотое Таро", price: 19.5, oldPrice: null, accentColor: "#F59E0B", badge: null, categorySlug: "azure-originals", heroSkin: "M4A4 | The Emperor", sortOrder: 3 },
    { slug: "cobalt-overdrive", name: "Blue Phosphor", subtitle: "Синяя коллекция", price: 29.0, oldPrice: null, accentColor: "#3B82F6", badge: "ТОП", categorySlug: "azure-originals", heroSkin: "M4A1-S | Blue Phosphor", sortOrder: 4 },
    { slug: "zero-kelvin", name: "Vulcan Strike", subtitle: "Турнирный набор", price: 65.0, oldPrice: 79.0, accentColor: "#06B6D4", badge: null, categorySlug: "azure-originals", heroSkin: "AK-47 | Vulcan", sortOrder: 5 },
    { slug: "azure-sovereign", name: "Azure Royal", subtitle: "Премиум сборка", price: 145.0, oldPrice: 170.0, accentColor: "#0EA5E9", badge: "VIP", categorySlug: "azure-originals", heroSkin: "★ Sport Gloves | Amphibious", sortOrder: 6 },

    // 3. Риск 50 на 50 (5 cases)
    { slug: "neural-shock", name: "Asiimov 50/50", subtitle: "Шанс на окуп", price: 19.0, oldPrice: null, accentColor: "#F59E0B", badge: "50/50", categorySlug: "high-voltage", heroSkin: "AK-47 | Asiimov", sortOrder: 1 },
    { slug: "printstream-chance", name: "Printstream 50/50", subtitle: "Белый глянец", price: 36.0, oldPrice: 42.0, accentColor: "#FAFAFA", badge: "50/50", categorySlug: "high-voltage", heroSkin: "M4A1-S | Printstream", sortOrder: 2 },
    { slug: "plasma-overload", name: "Toxic Breach", subtitle: "Высокий риск", price: 49.0, oldPrice: 55.0, accentColor: "#10B981", badge: "ХИТ", categorySlug: "high-voltage", heroSkin: "AWP | Containment Breach", sortOrder: 3 },
    { slug: "quantum-breach", name: "Deagle Blaze 50/50", subtitle: "Огненный дроп", price: 110.0, oldPrice: null, accentColor: "#F97316", badge: "РИСК", categorySlug: "high-voltage", heroSkin: "Desert Eagle | Blaze", sortOrder: 4 },
    { slug: "supernova-all-in", name: "All-In Fade", subtitle: "Хайроллер 50/50", price: 240.0, oldPrice: 280.0, accentColor: "#EC4899", badge: "VIP", categorySlug: "high-voltage", heroSkin: "AWP | Fade", sortOrder: 5 },

    // 4. Оружейные серии (6 cases)
    { slug: "awp-hyper-sniper", name: "Только AWP", subtitle: "Снайперский арсенал", price: 38.0, oldPrice: 44.0, accentColor: "#8B5CF6", badge: "AWP", categorySlug: "arsenal-specialists", heroSkin: "AWP | Chrome Cannon", sortOrder: 1 },
    { slug: "kalashnikov-dynasty", name: "Только AK-47", subtitle: "Классика атаки", price: 34.0, oldPrice: null, accentColor: "#EC4899", badge: "AK-47", categorySlug: "arsenal-specialists", heroSkin: "AK-47 | Inheritance", sortOrder: 2 },
    { slug: "m4-silencer-phantom", name: "Только M4", subtitle: "M4A1-S и M4A4", price: 32.0, oldPrice: null, accentColor: "#06B6D4", badge: "M4", categorySlug: "arsenal-specialists", heroSkin: "M4A1-S | Printstream", sortOrder: 3 },
    { slug: "deagle-hand-cannon", name: "Только Deagle", subtitle: "Ваншот серия", price: 24.0, oldPrice: 28.0, accentColor: "#3B82F6", badge: "DEAGLE", categorySlug: "arsenal-specialists", heroSkin: "Desert Eagle | Printstream", sortOrder: 4 },
    { slug: "usp-silenced-pro", name: "Только USP-S", subtitle: "Пистолетный раунд", price: 18.0, oldPrice: null, accentColor: "#EF4444", badge: "USP-S", categorySlug: "arsenal-specialists", heroSkin: "USP-S | Kill Confirmed", sortOrder: 5 },
    { slug: "glock-burst-master", name: "Glock & ПП", subtitle: "Раш Б сборка", price: 15.0, oldPrice: null, accentColor: "#10B981", badge: "GLOCK", categorySlug: "arsenal-specialists", heroSkin: "Glock-18 | Gamma Doppler", sortOrder: 6 },

    // 5. Ножи и Перчатки (5 cases)
    { slug: "flip-shadow-knives", name: "Flip & Bayonet", subtitle: "Доступные ножи", price: 69.0, oldPrice: 79.0, accentColor: "#8B5CF6", badge: "НОЖИ", categorySlug: "blade-glove-vaults", heroSkin: "★ Flip Knife | Doppler", sortOrder: 1 },
    { slug: "neon-edge-knives", name: "Kukri & Talon", subtitle: "Ножевой кейс", price: 95.0, oldPrice: 110.0, accentColor: "#EC4899", badge: "НОЖИ", categorySlug: "blade-glove-vaults", heroSkin: "★ Kukri Knife | Fade", sortOrder: 2 },
    { slug: "cyber-silk-gloves", name: "Vice Gloves", subtitle: "Перчаточный кейс", price: 135.0, oldPrice: null, accentColor: "#D946EF", badge: "ПЕРЧАТКИ", categorySlug: "blade-glove-vaults", heroSkin: "★ Sport Gloves | Vice", sortOrder: 3 },
    { slug: "karambit-syndicate", name: "Karambit Sapphire", subtitle: "Охота на Керамбит", price: 195.0, oldPrice: 225.0, accentColor: "#6366F1", badge: "ХИТ", categorySlug: "blade-glove-vaults", heroSkin: "★ Karambit | Doppler", sortOrder: 4 },
    { slug: "emerald-butterfly", name: "Butterfly Emerald", subtitle: "Топовые бабочки", price: 340.0, oldPrice: null, accentColor: "#10B981", badge: "ТОП", categorySlug: "blade-glove-vaults", heroSkin: "★ Butterfly Knife | Gamma Doppler", sortOrder: 5 },

    // 6. Коллекционный тир (4 cases)
    { slug: "serpent-bravo", name: "Fire Serpent", subtitle: "Операция Браво", price: 160.0, oldPrice: null, accentColor: "#10B981", badge: "ОЛД", categorySlug: "mythic-archives", heroSkin: "AK-47 | Fire Serpent", sortOrder: 1 },
    { slug: "norse-gungnir-relic", name: "Gungnir & Medusa", subtitle: "Скандинавский тир", price: 260.0, oldPrice: 299.0, accentColor: "#3B82F6", badge: "РЕДКИЙ", categorySlug: "mythic-archives", heroSkin: "AWP | Gungnir", sortOrder: 2 },
    { slug: "contraband-lotus", name: "Wild Lotus & Howl", subtitle: "Элита коллекций", price: 380.0, oldPrice: null, accentColor: "#EF4444", badge: "ЛИМИТ", categorySlug: "mythic-archives", heroSkin: "AK-47 | Wild Lotus", sortOrder: 3 },
    { slug: "dragon-lore-citadel", name: "Dragon Lore", subtitle: "Легенда Cobblestone", price: 420.0, oldPrice: 480.0, accentColor: "#F59E0B", badge: "ЛЕГЕНДА", categorySlug: "mythic-archives", heroSkin: "AWP | Dragon Lore", sortOrder: 4 },

    // 7. Хайроллер & VIP (4 cases)
    { slug: "arabesque-gold", name: "Gold Arabesque", subtitle: "Золотой резерв", price: 290.0, oldPrice: null, accentColor: "#F59E0B", badge: "GOLD", categorySlug: "highroller-vip", heroSkin: "AK-47 | Gold Arabesque", sortOrder: 1 },
    { slug: "pandora-royale", name: "Pandora's Box", subtitle: "Ультра-перчатки", price: 450.0, oldPrice: 510.0, accentColor: "#A855F7", badge: "VIP", categorySlug: "highroller-vip", heroSkin: "★ Sport Gloves | Pandora's Box", sortOrder: 2 },
    { slug: "ruby-sapphire-gem", name: "Ruby vs Sapphire", subtitle: "Драгоценные камни", price: 590.0, oldPrice: null, accentColor: "#EF4444", badge: "GEM", categorySlug: "highroller-vip", heroSkin: "★ M9 Bayonet | Doppler", sortOrder: 3 },
    { slug: "sovereign-millionaire", name: "Millionaire Vault", subtitle: "Только ультра-хай-тир", price: 850.0, oldPrice: 990.0, accentColor: "#D4FF00", badge: "MAX BET", categorySlug: "highroller-vip", heroSkin: "AWP | Dragon Lore", sortOrder: 4 },
  ];

  const createdCases = [];

  for (const c of casesBlueprint) {
    const heroSkinRecord = getSkin(c.heroSkin);
    const categoryId = categories.get(c.categorySlug)!;

    const createdCase = await prisma.case.create({
      data: {
        slug: c.slug,
        name: c.name,
        subtitle: c.subtitle,
        price: c.price,
        oldPrice: c.oldPrice,
        imageUrl: heroSkinRecord.imageUrl,
        accentColor: c.accentColor,
        badge: c.badge,
        openCount: Math.floor(8000 + Math.random() * 45000),
        sortOrder: c.sortOrder,
        categoryId,
      },
    });

    createdCases.push(createdCase);

    const balancedItems = buildBalancedItems(c.heroSkin, c.price);
    for (const item of balancedItems) {
      await prisma.caseItem.create({
        data: {
          caseId: createdCase.id,
          skinId: item.skinId,
          dropChance: item.chance,
          weight: Math.round(item.chance * 100),
        },
      });
    }
  }

  console.log(`✅ Created ${createdCases.length} unique cases across ${categories.size} categories!`);

  // 5. Seed User & Starter Inventory
  const user = await prisma.user.create({
    data: {
      id: "default-operative",
      username: "Viperr",
      avatar: "/avatars/operative.svg",
      balance: 1000.0,
      level: 15,
      xp: 5250,
      totalOpened: 32,
      totalUpgraded: 12,
      totalProfit: 640.0,
    },
  });

  const starterSkins = [
    { name: "M4A1-S | Printstream", wear: "FN", floatValue: 0.018421, isStatTrak: false, caseName: "Vulcan Strike" },
    { name: "AK-47 | Inheritance", wear: "MW", floatValue: 0.081204, isStatTrak: true, caseName: "Azure Royal" },
    { name: "AWP | Chrome Cannon", wear: "FN", floatValue: 0.029412, isStatTrak: false, caseName: "Только AWP" },
    { name: "Desert Eagle | Printstream", wear: "MW", floatValue: 0.094511, isStatTrak: false, caseName: "Night Pulse" },
    { name: "M4A4 | Temukau", wear: "FT", floatValue: 0.184021, isStatTrak: false, caseName: "Kukri & Talon" },
    { name: "AK-47 | Ice Coaled", wear: "FN", floatValue: 0.011094, isStatTrak: true, caseName: "Ice Coaled" },
    { name: "USP-S | Jawbreaker", wear: "MW", floatValue: 0.091204, isStatTrak: false, caseName: "Night Pulse" },
    { name: "AWP | Atheris", wear: "FN", floatValue: 0.032114, isStatTrak: true, caseName: "Venom Strike" },
  ];

  for (const st of starterSkins) {
    const sk = getSkin(st.name);
    await prisma.inventoryItem.create({
      data: {
        userId: user.id,
        skinId: sk.id,
        wear: st.wear,
        floatValue: st.floatValue,
        isStatTrak: st.isStatTrak,
        price: sk.basePrice,
        status: "IN_INVENTORY",
        obtainedFrom: "CASE",
        caseName: st.caseName,
      },
    });
  }

  const liveDropSamples = [
    { skin: "★ Butterfly Knife | Gamma Doppler", caseSlug: "emerald-butterfly", wear: "FN", isStatTrak: false },
    { skin: "AWP | Gungnir", caseSlug: "norse-gungnir-relic", wear: "FN", isStatTrak: false },
    { skin: "M4A1-S | Blue Phosphor", caseSlug: "cobalt-overdrive", wear: "FN", isStatTrak: false },
    { skin: "★ Sport Gloves | Amphibious", caseSlug: "azure-sovereign", wear: "MW", isStatTrak: false },
    { skin: "AK-47 | Vulcan", caseSlug: "zero-kelvin", wear: "FN", isStatTrak: true },
    { skin: "★ Karambit | Doppler", caseSlug: "karambit-syndicate", wear: "FN", isStatTrak: false },
    { skin: "AWP | Chrome Cannon", caseSlug: "awp-hyper-sniper", wear: "MW", isStatTrak: false },
    { skin: "Desert Eagle | Blaze", caseSlug: "quantum-breach", wear: "FN", isStatTrak: false },
    { skin: "M4A1-S | Printstream", caseSlug: "m4-silencer-phantom", wear: "FN", isStatTrak: true },
    { skin: "AK-47 | Inheritance", caseSlug: "kalashnikov-dynasty", wear: "FN", isStatTrak: false },
    { skin: "USP-S | Kill Confirmed", caseSlug: "zero-kelvin", wear: "MW", isStatTrak: true },
    { skin: "★ Kukri Knife | Fade", caseSlug: "neon-edge-knives", wear: "FN", isStatTrak: false },
  ];

  for (const sample of liveDropSamples) {
    const sk = getSkin(sample.skin);
    const cs = createdCases.find((c) => c.slug === sample.caseSlug) || createdCases[0];
    await prisma.openHistory.create({
      data: {
        userId: user.id,
        caseId: cs.id,
        skinName: sk.name,
        weapon: sk.weapon,
        rarity: sk.rarity,
        imageUrl: sk.imageUrl,
        wear: sample.wear,
        floatValue: 0.014285,
        isStatTrak: sample.isStatTrak,
        price: sk.basePrice,
        rollNumber: 42.1337,
      },
    });
  }

  console.log("✨ Database seeded with 320+ skins and 35 cases!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
