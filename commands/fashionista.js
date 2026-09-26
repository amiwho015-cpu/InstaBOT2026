// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "fashionista",
  description: "Build your dream boutique and collect stylish outfits! 👗✨",
  version: "1.0.2",
  author: "frnAlt",
  usage: "{prefix}fashionista",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  otherNames: ["runway", "fashion"],
  shopPrice: 200,
  requirement: "1.0.2",
  icon: "🛍️",
  waitingTime: 0.01,
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Fashion Boutique 💖",
  contentFont: "fancy",
  titleFont: "fancy",
};

const fashionItems = [
  {
    name: "Trendy Sunglasses",
    priceA: 5,
    priceB: 15,
    delay: 0.5,
    icon: "🕶️",
    chance: 0.3,
  },
  {
    name: "Designer Handbag",
    priceA: 10,
    priceB: 25,
    delay: 1,
    icon: "👜",
    chance: 0.2,
  },
  {
    name: "Elegant Dress",
    priceA: 20,
    priceB: 50,
    delay: 2,
    icon: "👗",
    chance: 0.15,
  },
  {
    name: "Luxury Heels",
    priceA: 40,
    priceB: 80,
    delay: 13,
    icon: "👠",
    chance: 0.1,
  },
  {
    name: "Diamond Tiara",
    priceA: 100,
    priceB: 300,
    delay: 15,
    icon: "👑",
    chance: 0.05,
  },
];

const fashionista = {
  key: "fashionista",
  verb: "shop",
  verbing: "shopping",
  pastTense: "shopped",
  checkIcon: "💎",
  initialStorage: 30,
  itemData: fashionItems,
  actionEmoji: "🛍️",
  stoData: {
    price: 50,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(fashionista);
  await simu.simulateAction();
}
