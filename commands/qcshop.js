// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "qcshop",
  description: "A shop in snowdin.",
  version: "1.0.8",
  author: "frnAlt",
  usage: "{prefix}qcshop",
  category: "Shopping",
  permissions: [0],
  noPrefix: false,
  otherNames: ["snowdinshop", "bunnyshop"],
  requirement: "3.0.0",
  icon: "👒",
  cmdType: "cplx_g",
  isGame: true,
};

const qcShop = {
  key: "qcShop",
  welcomeTexts: ["👒🐇 Hello, traveller. How can I help you?"],
  goBackTexts: ["👒🐇 Take your time."],
  buyTexts: ["👒🐇 What would you like to buy?"],
  thankTexts: ["👒🐇 Thanks for your purchase. "],
  sellTexts: [
    `👒🐇 Huh? Sell somethin'? Does this look like a pawn shop?
👒🐇 I don't know how it works where you come from... but...
👒🐇 If I started spending money on old branches and used bandages, I'd be out of business in a jiffy!`,
    `👒🐇 If you're really hurtin' for cash, then maybe you could do some crowdfunding.
👒🐇 I hear people will pay for ANYTHING nowadays.`,
  ],
  askTalkTexts: ["👒🐇 Care to chat?"],
  tradeRefuses: [
    "👒🐇 Is that a thing here? Never heard of that before. Maybe you could try asking round?",
  ],
  talkTexts: [
    {
      name: "Say hello",
      icon: "👋",
      responses: [
        `👒🐇 Hiya! Welcome to Snowdin! I can't remember the last time I saw a fresh face around here.
👒🐇 Where did you come from? The capital?
👒🐇 You don't look like a tourist. Are you here by yourself?`,
      ],
    },
    {
      name: "What to do here",
      icon: "❔",
      responses: [
        `👒🐇 You want to know what to do here in Snowdin?
👒🐇 Grillby's has food, and the library has information...
👒🐇 If you're tired, you can take a nap at the inn. It's right next door - my sister runs it.
👒🐇 And if you're bored, you can sit outside and watch those wacky skeletons do their thing.`,
        `👒🐇 There's two of 'em... Brothers, I think. They just showed up one day and... ... asserted themselves.
👒🐇 The town has gotten a lot more interesting since then.`,
      ],
    },
    {
      name: "Town History",
      icon: "📜",
      responses: [
        `👒🐇 Think back to your history class...
👒🐇 A long time ago, monsters lived in the RUINS back there in the forest.
👒🐇 Long story short, we all decided to leave the ruins and head for the end of the caverns.
👒🐇 Along the way, some fuzzy folk decided they liked the cold and set up camp in Snowdin.`,
        `👒🐇 Oh, and don't think about trying to explore the RUINS...
The door's been locked for ages. 👒🐇 So unless you're a ghost or can burrow under the door, forget about it.`,
      ],
    },
    {
      name: "Your life",
      icon: "👒",
      responses: [
        `👒🐇 Life is the same as usual.
👒🐇 A little claustrophobic...
👒🐇 But... we all know deep down that freedom is coming, don't we?
👒🐇 As long as we got that hope, we can grit our teeth and face the same struggles, day after day...
👒🐇 That's life, ain't it?`,
      ],
    },
  ],
  itemData: [
    {
      key: "toughGlove",
      icon: "🥊",
      name: "Tough Glove",
      flavorText: "Weapon **3AT** **8DF**, Slap 'em",
      atk: 3,
      def: 8,
      type: "weapon",
      price: 1800,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Tough Glove",
          key: "toughGlove",
          icon: "🥊",
          sellPrice: 1300,
          type: "weapon",
          atk: 3,
          def: 8,
          flavorText: "Weapon **3AT** **8DF**, Slap 'em",
        });
      },
    },
    {
      name: "Manly Bandana",
      key: "manlyBandana",
      icon: "🎽",
      type: "armor",
      flavorText: "**9DF** it has abs on it, **5AT** too.",
      atk: 5,
      def: 9,
      price: 2500,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Manly Bandana",
          key: "manlyBandana",
          icon: "🎽",
          flavorText: "**9DF** it has abs on it, **5AT** too.",
          atk: 5,
          def: 9,
          type: "armor",
          sellPrice: 1500,
        });
      },
    },
    {
      name: "Unisicle",
      price: 450,
      flavorText: "Heals **11HP** x1, Eat it once!",
      key: "unisicle",
      icon: "🍦",
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Unisicle",
          sellPrice: 150,
          flavorText: "Heals **11HP** x1, Eat it once!",
          key: "unisicle",
          icon: "🍦",
          type: "food",
          heal: 11,
        });
      },
    },
    {
      name: "Cinnamon Bun",
      icon: "🥐",
      flavorText: "Heals **22HP** It's my own recipe",
      price: 250,
      key: "cinnamonBun",
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Cinnamon Bun",
          icon: "🥐",
          flavorText: "Heals **22HP** It's my own recipe",
          sellPrice: 100,
          key: "cinnamonBun",
          type: "food",
          heal: 22,
        });
      },
    },
  ],
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ UTShop, ctx }) {
  const shop = new UTShop(qcShop);
  return shop.onPlay(ctx);
}

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "👒 QC Shop",
  titleFont: "bold",
  contentFont: "fancy",
  lineDeco: "altar",
};
