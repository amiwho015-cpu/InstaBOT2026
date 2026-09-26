// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "recycle",
  description: "Recycle items and earn rewards!",
  version: "1.0.5",
  author: "frnAlt",
  usage: "{prefix}recycle",
  category: "Idle Accumulation Games",
  permissions: [0],
  noPrefix: false,
  otherNames: [],
  requirement: "3.0.0",
  icon: "♻️",
  requiredLevel: 3,
  cmdType: "cplx_g",
  isGame: true,
};

export const style = {
  title: "Recycling ♻️",
  contentFont: "fancy",
  titleFont: "bold",
};

const recyclableItems = [
  {
    name: "Glass Shard",
    priceA: 20,
    priceB: 30,
    delay: 0.5,
    icon: "🔮",
    chance: 0.2,
  },
  {
    name: "Plastic Bottle",
    priceA: 30,
    priceB: 80,
    delay: 0.5,
    icon: "🧴",
    chance: 0.2,
  },
  {
    name: "Old Newspaper",
    priceA: 20,
    priceB: 80,
    delay: 0.4,
    icon: "📰",
    chance: 0.25,
  },
  {
    name: "Aluminum Can",
    priceA: 40,
    priceB: 70,
    delay: 0.4,
    icon: "🥫",
    chance: 0.15,
  },
  {
    name: "Cardboard Box",
    priceA: 30,
    priceB: 70,
    delay: 0.6,
    icon: "📦",
    chance: 0.2,
  },
  {
    name: "Plastic Utensils",
    priceA: 50,
    priceB: 90,
    delay: 0.4,
    icon: "🍴",
    chance: 0.3,
  },
  {
    name: "Glass Bottle",
    priceA: 40,
    priceB: 80,
    delay: 0.6,
    icon: "🍾",
    chance: 0.25,
  },
  {
    name: "Newspaper Bundle",
    priceA: 30,
    priceB: 60,
    delay: 0.5,
    icon: "🗞️",
    chance: 0.2,
  },
  {
    name: "Plastic Bag",
    priceA: 20,
    priceB: 70,
    delay: 0.4,
    icon: "🛍️",
    chance: 0.3,
  },
  {
    name: "Metal Wire",
    priceA: 60,
    priceB: 200,
    delay: 0.6,
    icon: "🔗",
    chance: 0.15,
  },
  {
    name: "Paper Towel Roll",
    priceA: 20,
    priceB: 50,
    delay: 0.5,
    icon: "🧻",
    chance: 0.2,
  },
  {
    name: "Plastic Wrap",
    priceA: 30,
    priceB: 70,
    delay: 0.4,
    icon: "🎁",
    chance: 0.25,
  },
  {
    name: "Steel Can",
    priceA: 50,
    priceB: 90,
    delay: 0.6,
    icon: "🥫",
    chance: 0.2,
  },
  {
    name: "Magazine",
    priceA: 20,
    priceB: 50,
    delay: 0.5,
    icon: "📖",
    chance: 0.25,
  },
  {
    name: "Plastic Plate",
    priceA: 40,
    priceB: 80,
    delay: 0.4,
    icon: "🍽️",
    chance: 0.3,
  },
  {
    name: "Paper Bag",
    priceA: 30,
    priceB: 70,
    delay: 0.6,
    icon: "🛍️",
    chance: 0.2,
  },
  {
    name: "Tin Foil",
    priceA: 20,
    priceB: 60,
    delay: 0.5,
    icon: "🍽️",
    chance: 0.25,
  },
  {
    name: "Plastic Tray",
    priceA: 40,
    priceB: 70,
    delay: 0.4,
    icon: "🍽️",
    chance: 0.3,
  },
  {
    name: "Glass Bowl",
    priceA: 30,
    priceB: 50,
    delay: 0.6,
    icon: "🍲",
    chance: 0.2,
  },
  {
    name: "Paper Cup",
    priceA: 20,
    priceB: 40,
    delay: 0.5,
    icon: "🥤",
    chance: 0.25,
  },
];

const recycler = {
  key: "recycle",
  verb: "recycle",
  verbing: "recycling",
  pastTense: "recycled",
  checkIcon: "♻️",
  initialStorage: 50,
  itemData: recyclableItems,
  actionEmoji: "♻️",
  stoData: {
    price: 50,
  },
};

export async function entry({ GameSimulator }) {
  const simu = new GameSimulator(recycler);
  await simu.simulateAction();
}
