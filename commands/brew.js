// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "brew",
  description: "Brew potions and sell them for gold!",
  version: "1.0.0",
  author: "frnAlt",
  usage: "{prefix}brew",
  category: "Idle Accumulation Games",
  role: 0,
  noPrefix: false,
  otherNames: ["potion"],
  shopPrice: 200,
  requirement: "1.0.0",
  icon: "☕",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Brewing ☕",
  contentFont: "fancy",
  titleFont: "bold",
};

const potions = [
  {
    name: "Health Potion",
    priceA: 5,
    priceB: 10,
    delay: 1,
    icon: "🧪",
    chance: 0.3,
  },
  {
    name: "Mana Elixir",
    priceA: 10,
    priceB: 20,
    delay: 2,
    icon: "🔵",
    chance: 0.25,
  },
  {
    name: "Strength Brew",
    priceA: 20,
    priceB: 40,
    delay: 3,
    icon: "💪",
    chance: 0.2,
  },
  {
    name: "Phoenix Tear",
    priceA: 50,
    priceB: 100,
    delay: 20,
    icon: "🔥",
    chance: 0.1,
  },
  {
    name: "Mystic Draught",
    priceA: 200,
    priceB: 500,
    delay: 60,
    icon: "🧙‍♂️",
    chance: 0.05,
  },
];

const brew = {
  key: "mix",
  verb: "brew",
  verbing: "brewing",
  pastTense: "brewed",
  checkIcon: "✓",
  initialStorage: 20,
  itemData: potions,
  actionEmoji: "☕",
  stoData: {
    price: 1000,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(brew);
  await simu.simulateAction();
}
