// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "trawl",
  description: "Use a fishing trawler to catch massive hauls!",
  version: "1.0.0",
  author: "frnAlt",
  usage: "{prefix}trawl",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  otherNames: ["boatfish"],
  shopPrice: 250,
  requirement: "1.0.0",
  icon: "⚓",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Fishing Trawler ⚓",
  contentFont: "fancy",
  titleFont: "bold",
};

const seaCatches = [
  {
    name: "Shrimp",
    priceA: 2,
    priceB: 6,
    delay: 0.5,
    icon: "🦐",
    chance: 0.3,
  },
  {
    name: "Octopus",
    priceA: 10,
    priceB: 30,
    delay: 2,
    icon: "🐙",
    chance: 0.2,
  },
  {
    name: "Giant Crab",
    priceA: 20,
    priceB: 50,
    delay: 3,
    icon: "🦀",
    chance: 0.15,
  },
  {
    name: "Deep-Sea Anglerfish",
    priceA: 500,
    priceB: 1000,
    delay: 40,
    icon: "🐡",
    chance: 0.1,
  },
  {
    name: "Legendary Leviathan",
    priceA: 5000,
    priceB: 10000,
    delay: 80,
    icon: "🐲",
    chance: 0.01,
  },
];

const trawl = {
  key: "catch",
  verb: "trawl",
  verbing: "trawling",
  pastTense: "trawled",
  checkIcon: "✓",
  initialStorage: 25,
  itemData: seaCatches,
  actionEmoji: "⚓",
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(trawl);
  await simu.simulateAction();
}
