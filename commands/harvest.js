// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "harvest",
  description: "Harvest crops and earn money!",
  version: "2.5.0",
  author: "frnAlt",
  usage: "{prefix}harvest",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  shopPrice: 100,
  requirement: "3.0.0",
  icon: "🌾",
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Harvest 🌾",
  contentFont: "fancy",
  titleFont: "bold",
};

const crops = [
  {
    name: "Wheat",
    priceA: 3,
    priceB: 7,
    delay: 0.5,
    icon: "🌾",
    chance: 0.2,
  },
  {
    name: "Rice",
    priceA: 5,
    priceB: 10,
    delay: 0.5,
    icon: "🌾",
    chance: 0.2,
  },
  {
    name: "Corn",
    priceA: 2,
    priceB: 4,
    delay: 0.4,
    icon: "🌽",
    chance: 0.25,
  },
  {
    name: "Banana",
    priceA: 5,
    priceB: 25,
    delay: 2,
    icon: "🍌",
    chance: 0.3,
  },
  {
    name: "Tomato",
    priceA: 7,
    priceB: 15,
    delay: 1.5,
    icon: "🍅",
    chance: 0.4,
  },
  {
    name: "Carrot",
    priceA: 30,
    priceB: 40,
    delay: 2.5,
    icon: "🥕",
    chance: 0.5,
  },
  {
    name: "Potato",
    priceA: 60,
    priceB: 150,
    delay: 7,
    icon: "🥔",
    chance: 0.7,
  },
  {
    name: "Kiwi",
    priceA: 100,
    priceB: 200,
    delay: 1,
    icon: "🥝",
    chance: 0.005,
  },
];

const harv = {
  key: "plant",
  verb: "harvest",
  verbing: "harvesting",
  pastTense: "harvested",
  checkIcon: "✓",
  initialStorage: 30,
  itemData: crops,
  actionEmoji: "🌱",
  stoData: {
    price: 50,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(harv);
  await simu.simulateAction();
}
