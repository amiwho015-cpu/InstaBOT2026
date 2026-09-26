// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "mine",
  description: "Mine ores and earn money!",
  version: "1.2.2",
  author: "frnAlt",
  usage: "{prefix}mine",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  otherNames: [],
  shopPrice: 1000000,
  requirement: "3.0.0",
  icon: "⛏️",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Mine ⛏️",
  contentFont: "fancy",
  titleFont: "bold",
};

const ores = [
  {
    name: "Coal",
    priceA: 200,
    priceB: 1000,
    delay: 4,
    icon: "🪨",
    chance: 0.6,
  },
  { name: "Iron", priceA: 100, priceB: 400, delay: 8, icon: "⛏️", chance: 0.5 },
  {
    name: "Gold",
    priceA: 2000,
    priceB: 10000,
    delay: 16,
    icon: "🏅",
    chance: 0.4,
  },
  {
    name: "Diamond",
    priceA: 5000,
    priceB: 20000,
    delay: 24,
    icon: "💎",
    chance: 0.2,
  },
  {
    name: "Emerald",
    priceA: 8000,
    priceB: 30000,
    delay: 32,
    icon: "📿",
    chance: 0.1,
  },
];

const miner = {
  key: "mine",
  verb: "mine",
  verbing: "mining",
  pastTense: "mined",
  checkIcon: "✓",
  initialStorage: 200,
  itemData: ores,
  actionEmoji: "⛏️",
  stoData: {
    price: 500,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(miner);
  await simu.simulateAction();
}
