// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "minecraft",
  description: "Mine blocks and gather resources!",
  version: "1.0.1",
  author: "frnAlt",
  usage: "{prefix}minecraft",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  shopPrice: 250,
  icon: "⛏️",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Minecraft ⛏️",
  contentFont: "fancy",
  titleFont: "bold",
};

const minecraftSimulation = {
  key: "minecraft",
  verb: "mine",
  verbing: "mining",
  pastTense: "mined",
  checkIcon: "✓",
  initialStorage: 100,
  stoData: {
    price: 300,
  },
  itemData: [
    {
      name: "Dirt",
      priceA: 5,
      priceB: 10,
      delay: 0.5,
      icon: "🟫",
      chance: 0.5,
    },
    {
      name: "Stone",
      priceA: 10,
      priceB: 20,
      delay: 1,
      icon: "⬛",
      chance: 0.4,
    },
    {
      name: "Iron Ore",
      priceA: 30,
      priceB: 60,
      delay: 1.5,
      icon: "🪙",
      chance: 0.3,
    },
    {
      name: "Gold Ore",
      priceA: 50,
      priceB: 100,
      delay: 2,
      icon: "🥇",
      chance: 0.2,
    },
    {
      name: "Diamond Ore",
      priceA: 100,
      priceB: 200,
      delay: 2.5,
      icon: "💎",
      chance: 0.1,
    },
    {
      name: "Emerald Ore",
      priceA: 150,
      priceB: 300,
      delay: 3,
      icon: "💚",
      chance: 0.05,
    },
  ],
  actionEmoji: "🌇",
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(minecraftSimulation);
  await simu.simulateAction();
}
