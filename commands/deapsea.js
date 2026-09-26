// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "deepseadiver",
  description:
    "Dive deep into the ocean, collect rare aquatic treasures, and unlock new diving equipment for bigger finds!",
  version: "1.0.0",
  author: "frnAlt",
  usage: "{prefix}deepseadiver",
  category: "Idle Accumulation Games",
  role: 0,
  noPrefix: false,
  requirement: "3.0.0",
  icon: "🌊",
  otherNames: ["deepsea"],
  shopPrice: 1000000,
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Deep Sea Diver 🌊",
  contentFont: "fancy",
  titleFont: "bold",
};

const deepSeaDiverSimulation = {
  key: "deepseadiver",
  verb: "dive",
  verbing: "diving",
  pastTense: "dived",
  checkIcon: "✔️",
  initialStorage: 40,
  itemData: [
    {
      icon: "🐚",
      delay: 8,
      priceA: 25,
      priceB: 40,
      name: "Seashells",
      chance: 0.9,
    },
    {
      icon: "🦑",
      delay: 12,
      priceA: 50,
      priceB: 75,
      name: "Giant Squid Ink",
      chance: 0.8,
    },
    {
      icon: "🐠",
      delay: 5,
      priceA: 10,
      priceB: 20,
      name: "Tropical Fish Scales",
      chance: 0.95,
    },
    {
      icon: "⚓",
      delay: 15,
      priceA: 100,
      priceB: 150,
      name: "Shipwreck Relics",
      chance: 0.7,
    },
  ],
  actionEmoji: "🌊",
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(deepSeaDiverSimulation);
  await simu.simulateAction();
}
