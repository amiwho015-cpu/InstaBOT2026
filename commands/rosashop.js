// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "rosashop",
  description:
    "A charming shop run by Rosa, sister of Missy Kitty, selling adorable items and sharing delightful stories.",
  version: "1.0.8",
  author: "frnAlt",
  usage: "{prefix}rosashop",
  category: "Shopping",
  permissions: [0],
  noPrefix: false,
  otherNames: ["cuteshop", "adorablestore"],
  requirement: "3.0.0",
  icon: "🌹",
  requiredLevel: 3,
  cmdType: "cplx_g",
  isGame: true,
};

const rosaShop = {
  key: "rosaShop",
  itemData: [
    {
      icon: "🌹",
      name: "Rose Bouquet",
      flavorText:
        "A beautifully arranged bouquet of roses, each petal exuding a soothing fragrance, the more you purchase, the more you feel your plants are getting lighter.",
      key: "roseBouquet",
      price: 120,
      async onPurchase({ moneySet, money, input }) {
        const { plantMax, plantitaMax } = await money.get(input.senderID);
        if (plantMax) {
          moneySet.plantMax = plantMax + 5;
        }
        if (plantitaMax) {
          moneySet.plantitaMax = plantitaMax + 5;
        }
        moneySet.inventory.push({
          name: "Rose Bouquet",
          key: "roseBouquet",
          flavorText:
            "A bouquet handcrafted by Rosa herself, each rose symbolizing love and beauty, each purchase adds +5 more permanent storage for every plant related games, it is best to purchase this while the storage was currently low so it will double every normal upgrade.",
          icon: "🌹",
          type: "food",
          heal: 12,
          //cannotToss: true,
          sellPrice: 20,
        });
      },
    },
    {
      name: "Bamboo Boquet",
      key: "bambooSticks",
      flavorText:
        "A bouquet of bamboo sticks, each one bearing a warmth and a sense of nourishment.",
      icon: "🎍",

      price: 1500,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Bamboo Boquet",
          key: "bambooSticks",
          flavorText:
            "Freshly grown green bamboos that good for pandas. If you wonder what's inside the belly of the pandas, this is what it is.",
          icon: "🎍",
          type: "panda_food",
          sellPrice: 550,
          saturation: 6000000,
          cannotToss: false,
        });
      },
    },
    {
      icon: "🐈",
      key: "cat",
      name: "Cat as ***PET***",
      flavorText: "A curious and independent feline.",
      price: 400,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Cat",
          key: "cat",
          flavorText: "A curious pet from the Rosa Shop. Loves to explore.",
          icon: "🐈",
          type: "pet",
          sellPrice: 200,
        });
      },
    },
    {
      icon: "🍪",
      name: "Sweet Treats",
      flavorText: "Homemade cookies that melt in your mouth with every bite.",
      key: "sweetTreats",
      price: 500,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Sweet Treats+",
          key: "sweetTreats",
          flavorText:
            "Delicious cookies baked by Rosa, each one filled with warmth and sweetness.",
          icon: "🍪",
          type: "cat_food",
          saturation: 50 * 60 * 1000,
          heal: 30,
          sellPrice: 250,
        });
      },
    },
    {
      icon: "🎀",
      name: "Silk Ribbon",
      key: "silkRibbon",
      flavorText:
        "A soft and silky ribbon that adds a touch of elegance to any gift, this item might be useful when it comes to storage.",
      def: 5,
      type: "armor",
      price: 20000,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Silk Ribbon",
          key: "silkRibbon",
          flavorText:
            "A ribbon delicately crafted by Rosa, known for its smooth texture and vibrant colors, this ribbon allows you to get 25% discount when upgrading your storage.",
          icon: "🎀",
          type: "armor",
          def: 5,
          sellPrice: 5000,
        });
      },
    },
    {
      icon: "📖",
      name: "Storybook",
      key: "storybook",
      flavorText:
        "A whimsical storybook filled with tales of magical adventures.",
      price: 40,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Storybook",
          key: "storybook",
          flavorText:
            "A delightful storybook written and illustrated by Rosa herself, each tale filled with wonder and magic.",
          icon: "📖",
          type: "key",
          sellPrice: 40,
        });
      },
    },
    {
      icon: "⏱️",
      name: "Time Pendant",
      flavorText:
        "A shimmering pendant that reflects the light with every ticks.",
      key: "timePendant",
      price: 1000,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Time Pendant",
          key: "timePendant",
          flavorText:
            "An exquisite clock-shaped pendant crafted by Rosa, symbolizing love and devotion. This clock is able to skip specific waiting times in a specific genre of game.",
          icon: "⏱️",
          type: "key",
          sellPrice: 500,
        });
      },
    },
  ],
  sellTexts: [
    "😻 I can't buy items right now, but I'd love to show you what I have!",
    "😿 I'm sorry, I can't buy items from you, but I hope you find something you love here.",
    "😽 My shop is full of treasures, but I'm afraid I can't buy anything from you.",
  ],
  tradeRefuses: [
    "😽 I'm sorry, I can't trade items with you despite wanting to.",
  ],
  talkTexts: [
    {
      name: "Sisterly Rivalry",
      responses: [
        "😻 Oh, Missy Kitty? She's my sister!\n😽 We've always been competitive, but we share a love for making others happy.",
        "😽 Missy Kitty and I have our differences, but we both run shops filled with love.\n😻 Our rivalry keeps us sharp!",
        "😻 Missy Kitty might be popular, but my shop has its own charm.\n😽 We each bring something unique to our customers.",
      ],
      icon: "🐾",
    },
    {
      name: "Shopkeeper's Story",
      responses: [
        "😽 Oh, my story?\n😻 I've always loved crafting and creating beautiful things.\n😻 This shop is my dream come true, filled with love and happiness.",
        "😻 I started this shop to share joy and spread smiles.\n😽 Each item here has a story to tell, just like the stories I love.",
        "😻 Every day is an adventure in this shop.\n😽 I cherish the moments spent with my customers, sharing laughter and warmth.",
      ],
      icon: "🌸",
    },
    {
      name: "Favorite Items",
      responses: [
        "😻 My favorite item is the Rose Bouquet.\n😽 Each rose reminds me of the beauty in simplicity.",
        "😽 I adore the Sweet Treats!\n😻 They're a little piece of happiness in every bite.",
        "😻 The Silk Ribbon is my favorite.\n😽 It adds a touch of magic to any gift.",
      ],
      icon: "🎈",
    },
    {
      name: "Customer Stories",
      responses: [
        "😻 I've met so many wonderful people here.\n😽 Each customer brings a new story and a new smile.",
        "😽 One customer gifted a bouquet to their loved one.\n😻 It was a moment filled with love and gratitude.",
        "😻 Every customer leaves with a piece of my heart.\n😽 I'm grateful for each and every one of them.",
      ],
      icon: "💌",
    },
    {
      name: "Future Plans",
      responses: [
        "😽 I dream of expanding my shop one day.\n😻 New items and surprises await!",
        "😻 I hope to create more magical experiences for my customers.\n😽 The future is bright for my little shop.",
      ],
      icon: "🎈",
    },
    {
      name: "Shop Events",
      responses: [
        "😻 We celebrate special events with discounts and surprises.\n😽 It's a joyous time filled with laughter and fun.",
        "😽 Keep an eye out for our seasonal celebrations!\n😻 You never know what treasures you'll find.",
      ],
      icon: "🎊",
    },
    {
      name: "Local Legends",
      responses: [
        "😽 Our town is filled with enchanting legends.\n😻 There's a tale of a magical rose garden that blooms only at midnight.",
        "😻 Legends of heroes and heroines fill the air.\n😽 It's said that kindness and courage are our town's greatest treasures.",
      ],
      icon: "📚",
    },
    {
      name: "Personal Favorites",
      responses: [
        "😻 My favorite moment is opening the shop each day.\n😽 It's a new beginning filled with endless possibilities.",
        "😽 Meeting new customers is my favorite part.\n😻 Each interaction is a chance to make someone's day brighter.",
      ],
      icon: "🎵",
    },
    {
      name: "Seasonal Changes",
      responses: [
        "😻 The shop transforms with each season.\n😽 Spring brings a burst of colors and fragrances.",
        "😽 Summer is a time of warmth and joy in the shop.\n😻 Autumn brings cozy vibes and new discoveries.",
      ],
      icon: "🍂",
    },
    {
      name: "Advice for Visitors",
      responses: [
        "😻 Take your time and enjoy the little moments.\n😽 Each item here is crafted with love and care.",
        "😽 Building connections is key to finding happiness.\n😻 I'm here to help you find the perfect treasure.",
      ],
      icon: "💖",
    },
    {
      name: "Your Name?",
      responses: [
        "😻 My name? I've been called Rosa, the Keeper of Smiles.\n😽 It's a name that reflects my love for spreading joy.",
        "😽 Rosa is the name I cherish.\n😻 It reminds me of the beauty in simplicity and kindness.",
      ],
      icon: "🌟",
    },
  ],
  buyTexts: [
    "😽 Which treasure catches your eye?",
    "😻 Take your time choosing the perfect treasure.",
    "😽 Every item here is filled with love and happiness.",
  ],
  welcomeTexts: [
    "😽 Welcome to my shop!",
    "😻 Hello! Step into a world of smiles and treasures.",
    "😽 Hi there! Let's find something special for you today.",
  ],
  goBackTexts: [
    "😿 It's alright, take your time.",
    "😿 Don't worry, I'm here whenever you're ready.",
    "😿 Take a deep breath, and let's find the perfect treasure together.",
  ],
  askTalkTexts: [
    "😽 What would you like to chat about?",
    "😻 Let's chat! I love hearing from my visitors.",
    "😽 I'm all ears! Ask me anything.",
  ],
  thankTexts: [
    "😻 Thank you for bringing joy to my shop!",
    "😽 Your smile brightens my day! Thank you.",
    "😻 I appreciate your visit. Come back soon!",
  ],
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ UTShop, ctx }) {
  const shop = new UTShop(rosaShop);
  return shop.onPlay(ctx);
}

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "🌹 Rosa's Shop",
  titleFont: "bold",
  contentFont: "fancy",
  lineDeco: "altar",
};
