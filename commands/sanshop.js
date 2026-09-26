// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "sanshop",
  description: "Welcome to Sanshop, where everything's priced with a grin!",
  version: "1.0.7",
  author: "frnAlt",
  usage: "{prefix}sanshop",
  category: "Shopping",
  permissions: [0],
  noPrefix: false,
  otherNames: ["skeletonshop", "funnystore"],
  requirement: "3.0.0",
  icon: "🕊️",
  requiredLevel: 7,
  cmdType: "cplx_g",
  isGame: true,
};

const sanshop = {
  notScaredGeno: true,
  talkTexts: [
    {
      name: "Meet Sans",
      responses: [
        "heya buddy, welcome to the sanshop. name's sans, your friendly neighborhood skeleton shopkeeper. yeah, i know, running a shop ain't my usual gig, but hey, gotta make a living somehow in this dimension, right?",
        "sup. you're in sanshop, where i sell stuff... and occasionally wonder where it all came from. don't ask me how i ended up with this stuff, sometimes yard sales happen, and next thing you know, i'm the proud owner of a dozen rubber chickens.",
        "hey there. what's with the name 'sanshop'? well, 'sansshop' sounded weird with the double 's', and you know me, i don't hop much, except maybe to dodge responsibility.",
      ],
      icon: "💀",
    },
    {
      name: "Papyrus, the Bro",
      responses: [
        "ah, my brother papyrus? he's a character, isn't he? always trying to be the best at everything, including spaghetti-making and capturing humans. me? i just sell things and dodge work. guess we balance each other out, buddy.",
        "papyrus and i? we're like the yin and yang of the skeleton world. he's all about rules and being a go-getter. me? i'm more about chilling and making bad jokes. can't complain though, life's pretty laid-back here in the shop.",
        "papyrus, the great papyrus. yeah, he's my bro. always full of energy and plans. meanwhile, i'm here, running sanshop and wondering how i got roped into this gig.",
      ],
      icon: "🍝",
    },
    {
      name: "Yard Sale Adventures",
      responses: [
        "ever been to a yard sale? let me tell ya, they can be a goldmine... or a skeleton trap. got tricked into buying a bunch of random stuff from a neighbor's yard sale. now i'm selling them here at sanshop, triple the price. gotta recoup those costs somehow, right, buddy?",
        "yard sales, huh? you never know what you'll find. one day it's a dusty old lamp, the next day it's a genuine fake sword from 'medieval times'. got a knack for finding oddities, i guess.",
        "the secret to sanshop's inventory? yard sales. lots of 'em. sometimes i wonder who buys this stuff, then i remember: someone with a sense of humor and too much gold to spare.",
      ],
      icon: "🛒",
    },
    {
      name: "Hop in, Sanshop!",
      responses: [
        "sanshop, where you don't expect sans to hop, but hey, sometimes i surprise myself. like that one time i actually did a little jig to celebrate a big sale. classic sans, am i right, buddy?",
        "hop? yeah, not my thing usually, but who knows? maybe one day i'll break out into a spontaneous dance routine just to keep things interesting.",
        "'sanshop' rolls off the tongue better than 'sansshop'. i'm all about efficiency, you know? less syllables, less effort. keeps me sane while i'm juggling this shop and wondering why i'm selling snow globes in the desert, sup.",
      ],
      icon: "🕺",
    },
    {
      name: "Skeleton Humor",
      responses: [
        "why do skeletons shop at sanshop? because we've got a bone to pick with good deals, buddy.",
        "ever wonder what a skeleton keeps in his closet? well, here at sanshop, we keep everything on display and marked up just enough to make you smile.",
        "you know what they say about skeletons and their sense of humor? it's bare-bones, but hey, it gets the job done. welcome to the pun-filled world of sanshop, heya.",
      ],
      icon: "💬",
    },
    {
      name: "Dimensional Oddities",
      responses: [
        "so, this isn't your average shop, and i'm not your average skeleton. we're talking dimensional oddities here. one minute i'm dodging bones in the underground, the next i'm selling questionable artifacts, buddy.",
        "between dimensions, yard sales, and the occasional existential crisis, running sanshop keeps life interesting. who needs stability when you can have surprises?",
        "welcome to the quirky side of reality. sanshop: where even the inventory has stories to tell, and some of them are even true, sup.",
      ],
      icon: "🌀",
    },
  ],
  welcomeTexts: [
    "heya bud, welcome to sanshop.",
    "hey there. step into the weird and wonderful world of sanshop.",
    "hey bud, come for the laughs, stay for the unexpected finds.",
  ],
  goBackTexts: [
    "it's cool, take your time.",
    "don't rush, buddy. i'm here whenever you're ready to shop.",
    "take a breather. sanshop isn't going anywhere.",
  ],
  askTalkTexts: [
    "heya, what's on your mind?",
    "let's chat bud, i've got stories and puns aplenty, buddy.",
    "got questions? i've got... well, answers might be pushing it, but i've definitely got jokes, heya.",
  ],
  thankTexts: [
    "thanks for stopping by sanshop.",
    "your gold is always welcome at sanshop.",
    "appreciate your patronage at sanshop. come back anytime.",
  ],
  buyTexts: [
    "which treasure catches your eye?",
    "take your time choosing the perfect treasure.",
    "every item here is filled with laughs and unexpected finds.",
  ],

  itemData: [
    {
      icon: "🐔",
      name: "Rubber Chicken",
      key: "rubChick",
      flavorText:
        "A classic novelty item. Perfect for pranks or just confusing your friends, or maybe for feeding your dragon.",
      price: 500,
      async onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Rubber Chicken",
          key: "rubChick",
          flavorText:
            "A quirky find from a neighborhood yard sale. Great for a laugh or a scare! This item, once a favorite among dragon pets, fueled the fire-breathing adventures of many a scaled companion.",
          icon: "🐔",
          type: "dragon_food",
          saturation: 30 * 60 * 1000,
          sellPrice: 150,
        });
      },
    },
    {
      icon: "🏺",
      name: "Antique Vase",
      key: "antiqueBase",
      flavorText:
        "An elegant vase with intricate designs, rumored to be from a lost civilization.",
      def: 10,
      type: "armor",
      price: 2000,
      async onPurchase({ moneySet }) {
        const randomNumber = Math.random();
        if (randomNumber <= 0.05) {
          moneySet.inventory.push({
            name: "Phoenix Vase",
            key: "phoenix",
            flavorText:
              "Discovered at a yard sale, this vase has a mysterious history, possibly housing a majestic Phoenix. Perfect for collectors, its enigmatic aura and potential for harboring a mythical bird add a touch of mystery and magic to any collection, but who knows?",
            icon: "🕊️",
            type: "pet",
            sellPrice: 3000,
          });
        } else {
          moneySet.inventory.push({
            name: "Antique Base",
            key: "antiqueBase",
            flavorText:
              "An old, dusty antique base from a yard sale. While it may not have any magical properties, it surprisingly offers some defense.",
            icon: "🏺",
            type: "armor",
            def: 10,
            sellPrice: 1950,
          });
        }
      },
    },
    {
      icon: "🛡️",
      name: "Medieval Shield",
      key: "medievalShield",
      flavorText:
        "A sturdy shield made of metal, possibly from the days of knights and dragons.",
      price: 3000,
      type: "armor",
      def: 20,
      async onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Medieval Shield",
          key: "medievalShield",
          flavorText:
            "Bought at a neighborhood yard sale, this shield adds a touch of medieval flair to any collection.",
          icon: "🛡️",
          type: "armor",
          def: 20,
          sellPrice: 1200,
        });
      },
    },
    {
      icon: "🌒",
      name: "Shadow Coin [Expensive]",
      key: "shadowCoin",
      flavorText:
        "Whispers of wealth slip through the veil of shadows, use it wisely.",
      price: 10000,
      onPurchase({ moneySet }) {
        const data = {
          name: "Shadow Coin",
          key: "shadowCoin",
          flavorText:
            "A coin rumored to have been forged in the depths of a forgotten realm, carrying with it the clandestine power to transfer fortunes unseen.",
          icon: "🌒",
          type: "food",
          heal: 120,
          sellPrice: 5000,
          healParty: true,
        };
        moneySet.inventory.push({ ...data });
      },
    },

    {
      icon: "🎭",
      name: "Comedy Mask",
      key: "comedyMask",
      flavorText:
        "A mask representing comedy, perfect for theater enthusiasts or costume parties.",
      price: 800,
      type: "armor",
      def: 8,
      async onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Comedy Mask",
          key: "comedyMask",
          flavorText:
            "Found at a bargain at a local yard sale. Adds a touch of humor to any collection.",
          icon: "🎭",
          type: "armor",
          def: 8,
          sellPrice: 300,
        });
      },
    },
    {
      icon: "🕰️",
      name: "Vintage Pocket Watch",
      key: "vintagePocketWatch",
      flavorText:
        "A beautifully crafted pocket watch, still ticking after many years.",
      type: "armor",
      def: 10,
      price: 4000,
      async onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Vintage Pocket Watch",
          key: "vintagePocketWatch",
          flavorText:
            "An unexpected find at a neighborhood yard sale. Perfect for collectors of vintage timepieces.",
          icon: "🕰️",
          type: "armor",
          def: 10,
          sellPrice: 1600,
        });
      },
    },
  ],
  tradeRefuses: [
    "sorry buddy, i'm not sure how that trading-trading works, just stick to my items. i'm a merchant not a trader.",
  ],
  sellTexts: [
    "sorry, can't buy items right now. sanshop's overflowing with treasures already",
    "appreciate the offer, but i'm not buying anything today. got my hands full with these goodies.",
    "my inventory's bursting with surprises. can't take anything off your hands right now, bud.",
  ],
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ UTShop, ctx }) {
  const shop = new UTShop(sanshop);
  return shop.onPlay(ctx);
}

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "🦴 Sans' Shop",
  titleFont: "bold",
  contentFont: "fancy",
};
