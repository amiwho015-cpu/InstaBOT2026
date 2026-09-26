// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "farm",
  description: "Raise livestock and sell produce!",
  version: "1.0.0",
  author: "frnAlt",
  usage: "{prefix}farm",
  category: "Idle Accumulation Games",
  role: 0,
  noPrefix: false,
  otherNames: ["livestock"],
  shopPrice: 200,
  requirement: "1.0.0",
  icon: "🚜",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Farming 🚜",
  contentFont: "fancy",
  titleFont: "bold",
};

const farmAnimals = [
  {
    name: "Chicken",
    priceA: 5,
    priceB: 12,
    delay: 1,
    icon: "🐔",
    chance: 0.3,
  },
  { name: "Cow", priceA: 150, priceB: 300, delay: 2, icon: "🐄", chance: 0.2 },
  {
    name: "Sheep",
    priceA: 10,
    priceB: 25,
    delay: 2,
    icon: "🐑",
    chance: 0.2,
  },
  { name: "Pig", priceA: 200, priceB: 450, delay: 3, icon: "🐖", chance: 0.1 },
  {
    name: "Golden Egg",
    priceA: 10,
    priceB: 25,
    delay: 6,
    icon: "🥚",
    chance: 0.05,
  },
];

const farm = {
  key: "raise",
  verb: "farm",
  verbing: "farming",
  pastTense: "farmed",
  checkIcon: "✓",
  initialStorage: 30,
  itemData: farmAnimals,
  actionEmoji: "🚜",
  stoData: {
    price: 1000,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(farm);
  await simu.simulateAction();
}
