// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "meowshop",
  description:
    "A whimsical shop run by a cat, selling items and sharing stories.",
  version: "1.1.2",
  author: "frnAlt",
  usage: "{prefix}meowshop",
  category: "Shopping",
  permissions: [0],
  noPrefix: false,
  otherNames: ["catshop", "felinestore"],
  requirement: "3.0.0",
  icon: "😺",
  requiredLevel: 5,
  cmdType: "cplx_g",
  isGame: true,
};

const meowShop = {
  key: "meowShop",
  tradeRefuses: [
    "😺 Trade? What the hell was that for? I don't think I could do that.",
  ],
  itemData: [
    {
      icon: "🎟️",
      name: "Name Changer",
      flavorText:
        "A ticket that lets you change your name, but we don't know who accepts it.",
      key: "nameChanger",
      price: 2,
      isDiamond: true,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Name Changer",
          key: "nameChanger",
          flavorText:
            "A ticket bought from the Meow Shop. You aren't sure how it works.",
          icon: "🎟️",
          type: "key",
          sellPrice: 50,
        });
      },
    },
    {
      icon: "🔖",
      name: "Lotto Ticket",
      flavorText: "A ticket of chance, filled with dreams and possibilities.",
      key: "lottoTicket",
      price: 1000,
      isDiamond: false,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Lotto Ticket",
          key: "lottoTicket",
          flavorText:
            "A mysterious ticket purchased from the Meow Shop. Its purpose remains unclear, but it brims with potential.",
          icon: "🔖",
          type: "key",
          sellPrice: 5,
        });
      },
    },
    {
      icon: "📚",
      name: "Card Book",
      key: "cardBook",
      flavorText: "A helpful book worthy of buying.",
      price: 100000,
      atk: 9,
      type: "weapon",
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Card Book",
          key: "cardBook",
          flavorText:
            "A book bought from the Meow Shop. It hints at a mysterious item, the HighRoll Pass, that allows bets higher than 100000. To obtain it, win 7 times in a row in slots. Losing resets the streak, but once unlocked, it’s yours forever.",
          icon: "📚",
          sellPrice: 50000,
          type: "weapon",
          atk: 9,
        });
      },
    },
    {
      icon: "🌑",
      name: "Shadow Coin",
      flavorText:
        "Whispers of wealth slip through the veil of shadows, use it wisely.",
      key: "shadowCoin",
      price: 5000,
      onPurchase({ moneySet }) {
        const data = {
          name: "Shadow Coin",
          key: "shadowCoin",
          flavorText:
            "A coin rumored to have been forged in the depths of a forgotten realm, carrying with it the clandestine power to transfer fortunes unseen.",
          icon: "🌑",
          type: "food",
          heal: 120,
          sellPrice: 1000,
          healParty: true,
        };
        moneySet.inventory.push({ ...data });
      },
    },
    {
      icon: "🍣",
      name: "Baked Sushi",
      flavorText: "Freshly-baked sushi, but you cannot eat it",
      price: 100,
      key: "bakedSushi",
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Baked Sushi",
          key: "bakedSushi",
          flavorText:
            "A baked sushi. Despite being unedible, any non human can eat it and gain some HP.",
          type: "food",
          heal: 10,
          icon: "🍣",
          sellPrice: 50,
          noSolo: true,
        });
      },
    },
    {
      icon: "🃏",
      name: "HighRoll Pass",
      flavorText: "Made in China",
      key: "highRollPass",
      price: 1,
      type: "armor",
      def: 2,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Fake HighRoll Pass",
          key: "highRollpass",
          flavorText: "It doesn't work either way.",
          icon: "🃏",
          type: "armor",
          def: 2,
          sellPrice: 0,
        });
      },
    },
  ],
  sellTexts: [
    "😸 I would be in bankrupt if I started buying these.\n😾 Don't expect me to give you money.",
    "😾 I'm not a bank, I'm a shop!\n🐱 Go find another shopkeeper that will buy your stuff.",
  ],
  talkTexts: [
    {
      name: "History of the Shop",
      responses: [
        "😺 This shop has been around for 100 years.\n😺 The founder was a legendary merchant.\n😺 Many travelers have visited us over the years.",
        "😺 We have a rich history of trade and commerce.\n😺 The shop has seen many changes over time.\n😺 It's one of the oldest shops in the region.",
        "😺 Every corner of this shop has a story to tell.\n😺 We've survived through thick and thin.",
        "😺 The legacy of the shop is well-known.\n😺 Many generations have worked here.",
      ],
      icon: "📜",
    },
    {
      name: "Shopkeeper's Story",
      responses: [
        "🐱 Oh, my story?\n😸 I started this shop from scratch.\n😸 It's been a labor of love and hard work.",
        "😸 I have a passion for trading and commerce.\n😸 Every item here has been chosen with care.\n😸 I enjoy meeting new customers every day.",
        "😸 Running this shop is my life's work.\n😸 The joy of helping others is my reward.\n😸 I've learned so much from my customers.",
        "😸 Every day brings new challenges and opportunities.\n😸 I'm proud of what this shop has become.",
      ],
      icon: "👨‍💼",
    },
    {
      name: "Favorite Items",
      responses: [
        "😺 My favorite item is a rare item, it's exquisite.\n😸 I love the craftsmanship of the **Baked Sushi**",
        "😺 Each item here has a special place in my heart.\n😸 The **Name Changer** reminds me of ancient treasures.",
        "😺 I take pride in offering the best items.\n😿 Even if I don't know how they work.",
      ],
      icon: "⭐",
    },
    {
      name: "Customer Stories",
      responses: [
        "🐱 About the customer?\n😺 We've had some interesting customers over the years.",
        "😸 One customer once traded a legendary item.\n😺 Every customer leaves with a smile.",
        "😸 I've heard so many fascinating tales from travelers.\n😺 One time, a customer bought every item in the shop!",
      ],
      icon: "🗣️",
    },
    {
      name: "Future Plans",
      responses: [
        "😺 I'm planning to expand the shop soon.\n😸 New items will be arriving next season.",
        "😺 I dream of turning this shop into a franchise.\n😸 The future is bright for our little shop.\n😺 I always look forward to what's next.",
      ],
      icon: "🔮",
    },
    {
      name: "Shop Events",
      responses: [
        "😺 We hold special sales during the holidays.\n😸 There's an annual event where rare items are auctioned.",
        "😺 We celebrate the shop's anniversary every year.\n😸 Special events bring in a lot of new customers.\n😺 Keep an eye out for our upcoming events!",
      ],
      icon: "🎉",
    },
    {
      name: "Local Legends",
      responses: [
        "😺 The town has many fascinating legends.\n😸 There's a legend about a hidden treasure nearby.",
        "😺 Stories of heroes and villains fill the air.\n😸 One legend says a great warrior once lived here.",
        "😺 The local legends add to the charm of this place.",
        "😹 Just kidding, It's all just about how cats formed and some absurd stories.",
      ],
      icon: "📖",
    },
    {
      name: "Divine Purr Legend",
      responses: [
        "🐱 Did you know? Our town has the most enchanting legend about the origin of cats.",
        "🐱 Long ago, there was a celestial lioness named Luna, the goddess of tranquility.\n😸 One night, feeling lonely, Luna began to purr—a divine purr filled with celestial magic.",
        "😸 The purr's sound materialized into tiny, shimmering kittens, full of grace and curiosity.\n🐱 Luna sent these kittens to Earth, bringing peace and joy to all who met them.",
        "😸 So, whenever you hear a cat purr, remember it's a fragment of Luna's divine purr echoing through the cosmos.",
      ],
      icon: "🌌",
    },
    {
      name: "Why No Sells?",
      responses: [
        "😸 Ah, you see, business has been tough lately. Long ago, this shop was bustling with customers and trades.",
        "🐱 But over time, I found myself with more items than I could sell. Now, I'm careful not to buy more than I can manage.",
        "😾 I'm not a bank, I'm a shop! I need to keep a balance between buying and selling to stay afloat.",
        "🐱 So, unless it's a rare find or something truly unique, I'm afraid I can't accept any new items right now.",
      ],
      icon: "💰",
    },
    {
      name: "Personal Favorites",
      responses: [
        "😺 I love the quiet moments in the shop.\n😸 My favorite time is just after opening.",
        "😺 Watching customers find what they need is fulfilling.\n😸 I enjoy chatting with regular customers.\n😺 The shop is my sanctuary.",
      ],
      icon: "❤️",
    },
    {
      name: "Seasonal Changes",
      responses: [
        "😺 The shop feels different with each season.\n😸 Spring brings a fresh energy to the shop.",
        "😺 I love the festive feel of winter here.\n😸 Summer is the busiest time for us.\n😺 and Autumn is a time for new arrivals and change.",
      ],
      icon: "🍂",
    },
    {
      name: "Advice for Newcomers",
      responses: [
        "😺 Always keep an eye out for the best deals.\n😸 Building relationships is key to success.",
        "😺 Patience and persistence pay off.\n😸 Never be afraid to ask questions.\n😺 Every purchase should be thoughtful.",
      ],
      icon: "💡",
    },
    {
      name: "Your Name?",
      responses: [
        "😺 Oh, my name? Well, I've been known by many names over the years.\n😸 Some call me Meowster Merchant, others simply know me as the Cat Keeper.",
        "😺 But my favorite, and the one that stuck, is Missy Kitty. Quite a curious name, isn't it?\n😸 As for how I got the name... well, that's a tale as whimsical as the shop itself!\n🐾 Let's just say, it adds to the charm.",
        "😺 Names have a way of finding us, don't they? Missy Kitty suits me just fine.\n😸 It's a reminder that even in a world of mystery, there's always room for a bit of whimsy.",
        "😺 So, whether you call me Missy, Kitty, or even Meowster, I'm here to help you find what you need.",
      ],
      icon: "🐾",
    },
  ],
  buyTexts: [
    "😺 Which do you want?",
    "😸 Take your time, which one catches your eye?",
    "😺 Let me know if you need any help choosing.",
    "😺 All items are top quality, take your pick!",
    "😸 You have great taste, which item will it be?",
  ],
  welcomeTexts: [
    "😺 Welcome to the shop!",
    "😸 Hello! Feel free to browse our items.",
    "😺 Hi there! How can I assist you today?",
    "😸 Welcome! We have the best items in town.",
    "😺 Greetings! What are you looking for today?",
  ],
  goBackTexts: [
    "😿 Oh it's okay, what do you want?",
    "😿 No worries, take your time.",
    "😿 It's alright, let me know if you need anything.",
    "😿 Don't stress, I'm here to help.",
    "😿 All good, what else can I do for you?",
  ],
  askTalkTexts: [
    "😺 What do you want to talk about?",
    "😸 I'm all ears, what do you want to discuss?",
    "😺 Let's chat! What's on your mind?",
    "😺 Feel free to ask me anything.",
    "😸 What would you like to know?",
  ],
  thankTexts: [
    "😺 Thanks for buying!",
    "😸 Thank you for your purchase!",
    "😺 We appreciate your business!",
    "😸 Thanks! Come again soon!",
    "😺 Enjoy your new item!",
  ],
  notScaredGeno: true,
};
const closeTexts = [
  "😺 Oh dear, it seems my whiskers are resting right now. Fear not! My shop reopens its doors at 12 PM sharp and stays purring until 5 PM. Come back then, and we'll have a meow-velous time exploring treasures together!",
  "😺 Meowza! The shop's pawsitively closed at the moment. Don't fret, my furry friend! I'm here bright-eyed and bushy-tailed from 12 PM to 5 PM, ready to whisker you away on an adventure through all things delightful!",
  "😺 Alas, my shop is taking a catnap at the moment. But fret not, for I'll be stretching my paws and reopening from 12 PM to 5 PM. Swing by then, and let's paw-sitively enjoy some tail-waggingly good finds!",
  "😺 Ah, it's nap time for this curious kitty's shop right now. I'll be wide awake and ready to purr-serve you from 12 PM to 5 PM. Mark your calendars and come back for a whisker-tastic shopping spree!",
  "😺 My shop's door is currently paw-sitively closed. Fear not, though! I'll be back in action from 12 PM to 5 PM, ready to whisker you away into a world of purr-fection. See you then!",
];

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ UTShop, isTimeAvailable, output, ctx }) {
  const a = 12 * 60 * 60 * 1000;
  const b = (5 + 12) * 60 * 60 * 1000;
  let isAvailable = isTimeAvailable(a, b);
  if (!isAvailable) {
    return output.reply(`✦ ${
      closeTexts[Math.floor(Math.random() * closeTexts.length)]
    }

**Go back next time**`);
  }
  const shop = new UTShop(meowShop);
  return shop.onPlay(ctx);
}

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "😺 Meow Shop",
  titleFont: "bold",
  contentFont: "fancy",
  lineDeco: "altar",
};
