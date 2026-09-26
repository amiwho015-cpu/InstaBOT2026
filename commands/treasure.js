// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "treasure",
  description: "Dig for treasure chests and riches!",
  version: "1.0.0",
  author: "frnAlt",
  usage: "{prefix}treasure",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  otherNames: ["treasurehunt", "thunt"],
  shopPrice: 300,
  requirement: "1.0.0",
  icon: "🏴‍☠️",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Treasure Hunting 🏴‍☠️",
  contentFont: "fancy",
  titleFont: "bold",
};

const treasures = [
  {
    name: "Rusty Coin",
    priceA: 2,
    priceB: 5,
    delay: 1,
    icon: "🪙",
    chance: 0.3,
  },
  {
    name: "Silver Chest",
    priceA: 10,
    priceB: 3,
    delay: 2,
    icon: "🎁",
    chance: 0.2,
  },
  {
    name: "Pirate Gold",
    priceA: 50,
    priceB: 100,
    delay: 3,
    icon: "🏴‍☠️",
    chance: 0.15,
  },
  {
    name: "Ancient Relic",
    priceA: 100,
    priceB: 300,
    delay: 20,
    icon: "⚱️",
    chance: 0.1,
  },
  {
    name: "Cursed Treasure",
    priceA: 500,
    priceB: 1000,
    delay: 80,
    icon: "💀",
    chance: 0.05,
  },
];

const treasure = {
  key: "dig",
  verb: "search",
  verbing: "searching",
  pastTense: "found",
  checkIcon: "✓",
  initialStorage: 25,
  itemData: treasures,
  actionEmoji: "🏴‍☠️",
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(treasure);
  await simu.simulateAction();
}
