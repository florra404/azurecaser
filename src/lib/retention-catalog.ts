export interface MissionDef {
  id: string;
  title: string;
  desc: string;
  category: "GRIND" | "CASES" | "UPGRADER" | "ELITE";
  target: number;
  rewardUsd: number;
  rewardXp: number;
}

export const MISSIONS_CATALOG: MissionDef[] = [
  {
    id: "open_3_cases",
    title: "Первая распаковка",
    desc: "Открой 3 любых кейса на сайте",
    category: "GRIND",
    target: 3,
    rewardUsd: 0.45,
    rewardXp: 150,
  },
  {
    id: "open_15_cases",
    title: "Охотник за дропом",
    desc: "Открой 15 кейсов в любых категориях",
    category: "CASES",
    target: 15,
    rewardUsd: 1.85,
    rewardXp: 400,
  },
  {
    id: "open_50_cases",
    title: "Конвейер Арсенала",
    desc: "Открой 50 кейсов за всё время",
    category: "CASES",
    target: 50,
    rewardUsd: 6.5,
    rewardXp: 1100,
  },
  {
    id: "open_150_cases",
    title: "Барон Кейсов CS2",
    desc: "Открой 150 кейсов за всё время",
    category: "ELITE",
    target: 150,
    rewardUsd: 24.0,
    rewardXp: 3000,
  },
  {
    id: "inv_5_skins",
    title: "Склад Наёмника",
    desc: "Собери одновременно 5 скинов в своём инвентаре",
    category: "GRIND",
    target: 5,
    rewardUsd: 0.65,
    rewardXp: 200,
  },
  {
    id: "inv_20_skins",
    title: "Коллекционер Оружия",
    desc: "Держи одновременно 20 активных скинов в инвентаре",
    category: "CASES",
    target: 20,
    rewardUsd: 3.5,
    rewardXp: 650,
  },
  {
    id: "upg_1_win",
    title: "Первый Апгрейд",
    desc: "Сделай 1 успешный апгрейд скина в Апгрейдере PRO",
    category: "UPGRADER",
    target: 1,
    rewardUsd: 0.9,
    rewardXp: 250,
  },
  {
    id: "upg_5_wins",
    title: "Мастер Калибровки",
    desc: "Одержи 5 побед в Апгрейдере PRO",
    category: "UPGRADER",
    target: 5,
    rewardUsd: 4.5,
    rewardXp: 850,
  },
  {
    id: "contract_1",
    title: "Алхимия Контрактов",
    desc: "Скрафти скин через Контракты Обмена",
    category: "GRIND",
    target: 1,
    rewardUsd: 0.8,
    rewardXp: 220,
  },
  {
    id: "reach_lvl_10",
    title: "Ветеран Полигона",
    desc: "Прокачай уровень своего аккаунта до LVL 10",
    category: "CASES",
    target: 10,
    rewardUsd: 2.2,
    rewardXp: 500,
  },
  {
    id: "reach_lvl_30",
    title: "Элита Сервера",
    desc: "Достигни 30 уровня профиля",
    category: "ELITE",
    target: 30,
    rewardUsd: 12.0,
    rewardXp: 1800,
  },
  {
    id: "pull_gold_or_covert",
    title: "Красная или Золотая Легенда",
    desc: "Выбей скин редкости Тайное или Особый предмет (Нож/Перчатки)",
    category: "ELITE",
    target: 1,
    rewardUsd: 8.5,
    rewardXp: 1500,
  },
];

export interface WheelSector {
  index: number;
  label: string;
  sub: string;
  type: "CASH" | "XP" | "SKIN" | "JACKPOT";
  amount: number;
  color: string;
  weight: number;
}

export const WHEEL_SECTORS: WheelSector[] = [
  {
    index: 0,
    label: "+$0.18",
    sub: "На ржавый кейс",
    type: "CASH",
    amount: 0.18,
    color: "#38BDF8",
    weight: 26,
  },
  {
    index: 1,
    label: "+120 XP",
    sub: "Опыт ранга",
    type: "XP",
    amount: 120,
    color: "#A855F7",
    weight: 22,
  },
  {
    index: 2,
    label: "+$0.42",
    sub: "Гринд-бонус",
    type: "CASH",
    amount: 0.42,
    color: "#10B981",
    weight: 18,
  },
  {
    index: 3,
    label: "СКИН CS2",
    sub: "Прямо в инвентарь",
    type: "SKIN",
    amount: 1,
    color: "#EC4899",
    weight: 14,
  },
  {
    index: 4,
    label: "+$1.10",
    sub: "Банк наёмника",
    type: "CASH",
    amount: 1.1,
    color: "#F59E0B",
    weight: 9,
  },
  {
    index: 5,
    label: "+350 XP",
    sub: "Буст уровня",
    type: "XP",
    amount: 350,
    color: "#06B6D4",
    weight: 6,
  },
  {
    index: 6,
    label: "РЕДКИЙ СКИН",
    sub: "Засекреченный+",
    type: "SKIN",
    amount: 2,
    color: "#EF4444",
    weight: 3.5,
  },
  {
    index: 7,
    label: "$6.50 ДЖЕКПОТ",
    sub: "Сектор Удачи",
    type: "JACKPOT",
    amount: 6.5,
    color: "#D4FF00",
    weight: 1.5,
  },
];
