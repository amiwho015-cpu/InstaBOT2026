// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "littlejohn",
  description:
    "Collect and trade materials to build structures out of 0.0001m² apartment and earn rewards!",
  version: "1.0.0",
  author: "frnAlt",
  usage: "{prefix}littlejohn",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  requirement: "3.0.0",
  icon: "🏗️",
  requiredLevel: 3,
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Little John 🏗️",
  contentFont: /* "elegant" */ "fancy",
  titleFont: "bold",
};

const littlejohnSimulation = {
  key: "littlejohn",
  verb: "collect",
  verbing: "collecting",
  pastTense: "collected",
  checkIcon: "✓",
  initialStorage: 20,
  itemData: [
    {
      icon: "🔩",
      delay: 5,
      priceA: 10,
      priceB: 15,
      name: "Galvanized Square Steel",
      chance: 0.8,
    },
    {
      icon: "🪵",
      delay: 7,
      priceA: 5,
      priceB: 10,
      name: "Eco Friendly Wood Veneers",
      chance: 0.9,
    },
    {
      icon: "🔧",
      delay: 3,
      priceA: 2,
      priceB: 5,
      name: "Screws borrowed from aunt",
      chance: 0.95,
    },
    {
      icon: "🪟",
      delay: 8,
      priceA: 12,
      priceB: 18,
      name: "Aluminum Alloy Windows",
      chance: 0.75,
    },
  ],
  actionEmoji: "🏗️",
  stoData: {
    price: 20,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(littlejohnSimulation);
  await simu.simulateAction();
}
