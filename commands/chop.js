// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "chop",
  description: "Cut trees and collect wood!",
  version: "1.0.0",
  author: "frnAlt",
  usage: "{prefix}chop",
  category: "Idle Accumulation Games",
  role: 0,
  noPrefix: false,
  otherNames: ["woodcut"],
  shopPrice: 150,
  requirement: "1.0.0",
  icon: "🌲",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Lumberjack 🌲",
  contentFont: "fancy",
  titleFont: "bold",
};

const woodTypes = [
  {
    name: "Oak Log",
    priceA: 2,
    priceB: 5,
    delay: 0.5,
    icon: "🌳",
    chance: 0.3,
  },
  {
    name: "Pine Wood",
    priceA: 5,
    priceB: 12,
    delay: 1,
    icon: "🌲",
    chance: 0.25,
  },
  {
    name: "Maple",
    priceA: 10,
    priceB: 25,
    delay: 2,
    icon: "🍁",
    chance: 0.2,
  },
  {
    name: "Redwood",
    priceA: 30,
    priceB: 60,
    delay: 3,
    icon: "🌲",
    chance: 0.1,
  },
  {
    name: "Ancient Tree Bark",
    priceA: 10,
    priceB: 25,
    delay: 6,
    icon: "🏔️",
    chance: 0.05,
  },
];

const chop = {
  key: "cut",
  verb: "chop",
  verbing: "chopping",
  pastTense: "chopped",
  checkIcon: "✓",
  initialStorage: 30,
  itemData: woodTypes,
  actionEmoji: "🪓",
  stoData: {
    price: 1000,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(chop);
  await simu.simulateAction();
}
