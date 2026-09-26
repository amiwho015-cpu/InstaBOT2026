// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "bakery",
  description:
    "A bakery run by the sly Baker Bob, known for selling baked goods with misleading qualities and deceptive stats.",
  version: "1.0.0",
  author: "frnAlt",
  usage: "{prefix}bakery",
  category: "Shopping",
  role: 0,
  noPrefix: false,
  requirement: "3.0.0",
  icon: "🍰",
  cmdType: "cplx_g",
  isGame: true,
};

const bakery = {
  key: "bakery",
  itemData: [
    {
      icon: "🍰",
      name: "Gourmet Chocolate Cake",
      flavorText:
        "This cake is said to be gourmet, but the taste might leave you wondering about its quality.",
      key: "chocCake",
      heal: 40,
      price: 600,
      async onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Gourmet Chocolate Cake",
          key: "chocCake",
          flavorText:
            "Marketed as a high-end chocolate cake, but it's just as stale as any ordinary cake.",
          icon: "🍰",
          type: "food",
          heal: 40,
          sellPrice: 90,
        });
      },
    },
    {
      icon: "🍪",
      name: "Exquisite Cookies",
      flavorText:
        "These cookies are advertised as exquisite, but they might be nothing more than average.",
      key: "cookies",
      heal: 15,
      price: 225,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Exquisite Cookies",
          key: "cookies",
          flavorText:
            "Claimed to be luxurious, but they're just ordinary cookies with an inflated price.",
          icon: "🍪",
          type: "food",
          heal: 15,
          sellPrice: 45,
        });
      },
    },
    {
      icon: "🍩",
      name: "Special Donuts",
      flavorText:
        "These donuts are promoted as special, but they might not live up to the hype.",
      key: "donuts",
      heal: 25,
      price: 375,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Special Donuts",
          key: "donuts",
          flavorText:
            "Advertised as special, but they're just ordinary donuts with a flashy name.",
          icon: "🍩",
          type: "food",
          heal: 25,
          sellPrice: 60,
        });
      },
    },
    {
      icon: "🥠",
      name: "Fortune Cookie",
      flavorText:
        "These cookies are filled with randomness and uncertainty, make sure to **open** it.",
      key: "fortCookie",
      price: 500,
      onPurchase({ moneySet, generateGift }) {
        moneySet.inventory.push({
          ...generateGift(),
          name: "Fortune Cookie",
          key: "fortCookie",
          flavorText:
            "These cookies are filled with randomness and uncertainty, make sure NOT to **open** it.",
          icon: "🥠",
          type: "treasure",
          treasureKey: "randomGrouped_unlucky",
          sellPrice: 100,
        });
      },
    },
  ],
  sellTexts: [
    "🍰 I can’t buy anything right now, but check out my items!",
    "🍪 Sorry, I can’t buy from you, but my goods are here.",
    "🍩 I have lots of baked goods, but no room to buy from you.",
  ],
  tradeRefuses: ["🍪 I’m afraid I can’t trade with you, despite wanting to."],
  talkTexts: [
    {
      name: "Baker's Trick",
      responses: [
        "🍰 Oh, you think my treats are special?\n🍪 They might just be ordinary with a fancy name.",
        "🍩 Some say my items are deceivingly good, but that's just part of the charm.",
        "🍪 The real trick is making you think you're getting something exceptional.",
      ],
      icon: "🎂",
    },
    {
      name: "Bakery Story",
      responses: [
        "🍰 I started this bakery with the idea of creating unique treats.\n🍪 Sometimes, the uniqueness is just in the name.",
        "🍩 Each item here is crafted with a touch of mystery.\n🍰 What’s inside might surprise you!",
      ],
      icon: "🍰",
    },
    {
      name: "Favorite Bakes",
      responses: [
        "🍪 My favorite is the Gourmet Chocolate Cake.\n🍩 It’s quite the classic, even if it’s not as special as it sounds.",
        "🍩 I’d say the Exquisite Cookies are top-notch.\n🍰 Just don’t expect anything extraordinary.",
      ],
      icon: "🍪",
    },
    {
      name: "Customer Tales",
      responses: [
        "🍰 I've had many customers who were surprised by the taste.\n🍪 The best part is seeing their reactions!",
        "🍩 Some come for the names, others for the treats.\n🍰 Each visit is a new experience.",
      ],
      icon: "🍰",
    },
    {
      name: "Future Bakes",
      responses: [
        "🍪 I plan to expand my bakery with more intriguing items.\n🍰 Keep an eye out for new, mysteriously named treats!",
        "🍩 There’s always room for more creative bakes in my shop.\n🍪 The future looks deliciously deceptive!",
      ],
      icon: "🍰",
    },
  ],
  buyTexts: [
    "🍪 Which treat would you like to try today?",
    "🍰 Take your time and choose wisely.",
    "🍩 Each item here has its own little twist.",
  ],
  welcomeTexts: [
    "🍰 Welcome to my bakery!",
    "🍪 Step into a world of uniquely named treats.",
    "🍩 Hi there! Find something special and maybe a bit misleading.",
  ],
  goBackTexts: [
    "🍪 No worries, take your time.",
    "🍰 I’m here when you’re ready to decide.",
    "🍩 Feel free to look around and come back when you’re ready.",
  ],
  askTalkTexts: [
    "🍰 What would you like to chat about?",
    "🍪 Let’s talk! I’m always up for a chat.",
    "🍩 Ask me anything about my treats or bakery.",
  ],
  thankTexts: [
    "🍰 Thanks for visiting! Hope you enjoyed the treats.",
    "🍪 Your visit brightened my day. Come back soon!",
    "🍩 I appreciate your stop by. See you again!",
  ],
};

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "🍰 Bakery",
  titleFont: "bold",
  contentFont: "fancy",
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ UTShop, ctx }) {
  const shop = new UTShop(bakery);
  return shop.onPlay(ctx);
}
