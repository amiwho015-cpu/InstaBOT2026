// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "explorer",
  description: "Explore space and discover new planets!",
  version: "1.0.1",
  author: "frnAlt",
  usage: "{prefix}explorer",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  shopPrice: 500,
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "🚀 Space Explorer",
  contentFont: "fancy",
  titleFont: "bold",
};

const explorerSimulation = {
  key: "explorer",
  verb: "explore",
  verbing: "exploring",
  pastTense: "explored",
  checkIcon: "✓",
  initialStorage: 40,
  itemData: [
    {
      name: "Earth-like",
      priceA: 1000,
      priceB: 3000,
      delay: 30,
      icon: "🌍",
      chance: 0.4,
    },
    {
      name: "Gas Giant",
      priceA: 5000,
      priceB: 10000,
      delay: 50,
      icon: "🪐",
      chance: 0.3,
    },
    {
      name: "Ice Planet",
      priceA: 2000,
      priceB: 5000,
      delay: 70,
      icon: "❄️",
      chance: 0.2,
    },
    {
      name: "Magma World",
      priceA: 8000,
      priceB: 15000,
      delay: 100,
      icon: "🌋",
      chance: 0.1,
    },
    {
      name: "Crystal Planet",
      priceA: 10000,
      priceB: 30000,
      delay: 120,
      icon: "💎",
      chance: 0.05,
    },
  ],
  actionEmoji: "🌌",
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(explorerSimulation);
  await simu.simulateAction();
}
