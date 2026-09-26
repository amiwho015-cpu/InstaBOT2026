// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "seam",
  description:
    "A mysterious shop in the Dark World, selling artifacts and sharing tales.",
  version: "1.0.3",
  author: "frnAlt",
  usage: "{prefix}seam",
  category: "Shopping",
  permissions: [0],
  noPrefix: false,
  requirement: "3.0.0",
  otherNames: ["shawn"],
  icon: "🗡️",
  cmdType: "cplx_g",
  isGame: true,
};

const darkWorldShop = {
  key: "seamShop",
  itemData: [
    {
      icon: "🍬",
      name: "Dark Candy",
      key: "darkCandy",
      flavorText:
        "A mysterious candy that shimmers with dark energy. Recovers 40 HP to one ally.",
      price: 400,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Dark Candy",
          key: "darkCandy",
          flavorText:
            "A mysterious candy that shimmers with dark energy. Recovers 40 HP to one ally.",
          icon: "🍬",
          type: "food",
          heal: 40,
          sellPrice: 200,
        });
      },
    },
    {
      icon: "🧣",
      name: "Ragger",
      flavorText:
        "A ragged scarf that cuts enemies like a dagger. Increases TP by 32%.",
      price: 70,
      atk: 3,
      def: 2,
      type: "weapon",
      key: "ragger",
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Ragger",
          key: "ragger",
          flavorText:
            "A ragged scarf that cuts enemies like a dagger. Increases TP by 32%.",
          icon: "🧣",
          type: "weapon",
          atk: 3,
          def: 2,
          tpBoost: 32,
          sellPrice: 50,
        });
      },
    },
    {
      icon: "🗡️",
      name: "Spookysword",
      flavorText: "A sword with a bat design. Increases ATK by 7.",
      key: "spookySword",
      price: 1200,
      type: "weapon",
      atk: 7,
      def: 3,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Spookysword",
          key: "spookySword",
          flavorText: "A sword with a bat design. Increases ATK by 7.",
          icon: "🗡️",
          type: "weapon",
          atk: 7,
          def: 3,
        });
      },
    },
    {
      icon: "🧰",
      name: "Scrap",
      key: "scrap",
      flavorText:
        "A scrap metal that could be used as an ingredient or an armor.",
      price: 1000,
      cannotBuy: true,
    },
    {
      icon: "🗡️",
      name: "Cursed Sword",
      key: "cursedSword",
      cannotBuy: true,
      cannotBuyFlavor: "You're too weak to use this.",
      flavorText:
        "A cursed sword that was created by the witches that is made with a special ore's, best for using in PVP.",
      price: 6900,
      type: "weapon",
      def: 4,
      atk: 20,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Cursed Sword",
          key: "cursedSword",
          flavorText:
            "A sword delicately developed by the witches using the special ore's and special cursed magic, this sword allows you to get 20% atk damage to the enemies.",
          icon: "🗡️",
          type: "weapon",
          def: 4,
          atk: 20,
          sellPrice: 3000,
        });
      },
    },

    {
      icon: "🍔",
      name: "Darkburger",
      key: "darkburger",
      flavorText: "A burger from the Dark World. Restores 60 HP to one ally.",
      price: 600,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Darkburger",
          key: "darkburger",
          flavorText:
            "A burger from the Dark World. Restores 60 HP to one ally.",
          icon: "🍔",
          type: "food",
          heal: 60,
        });
      },
    },
  ],
  sellTexts: [
    "😺 I'm afraid I don't buy items from customers, but feel free to browse my selection!",
    "😸 My shop is more about selling unique items rather than buying from others.",
  ],
  talkTexts: [
    {
      name: "Dark World Tales",
      responses: [
        "😺 In the Dark World, legends tell of ancient heroes and fearsome foes.",
        "😸 The tales of knights and wizards are whispered in the shadows of the castle.",
        "😺 Many adventurers have ventured into the Dark World, seeking treasure and glory.",
      ],
      icon: "🏰",
    },
    {
      name: "Seams's Origin",
      responses: [
        "🐺 My story? I came from a distant land, drawn to the mysteries of the Dark World.",
        "🦇 Opening this shop was my way of contributing to the adventures of travelers.",
        "🌌 Each item here has a story, waiting to be discovered by those brave enough to explore.",
      ],
      icon: "🌟",
    },
    {
      name: "Favorite Items",
      responses: [
        "😺 My favorite is the Dark Candy, imbued with the essence of the Dark World's magic.",
        "😸 The Ragger has a history of aiding heroes in their battles against the Dark Knight.",
        "😺 The Spookysword, forged from rare metals, is a prized possession in my collection.",
      ],
      icon: "🎭",
    },
    {
      name: "Customer Stories",
      responses: [
        "🐺 Ah, customers? I've met travelers who've faced trials and triumphs in the Dark World.",
        "🦇 One adventurer even found a secret passage behind the waterfall, revealing hidden treasures.",
        "🌌 Every customer brings tales of courage and curiosity, enriching the lore of the Dark World.",
      ],
      icon: "📜",
    },
    {
      name: "Future Ventures",
      responses: [
        "😺 I plan to expand my shop, offering even more artifacts and curiosities.",
        "😸 New arrivals will soon grace the shelves, each with its own enchanting tale.",
        "😺 The Dark World is full of surprises, and I'm eager to share them with future visitors.",
      ],
      icon: "🔮",
    },
    {
      name: "Shop Events",
      responses: [
        "🐺 Celebrations in the Dark World are marked with grand feasts and mystical rituals.",
        "🦇 Each season brings unique festivities, from the Dance of Shadows to the Moonlight Market.",
        "🌌 Keep an eye out for special sales and rare artifacts that appear during these events.",
      ],
      icon: "🌙",
    },
    {
      name: "Dark World Legends",
      responses: [
        "😺 The Dark World is steeped in tales of ancient ruins and forgotten kingdoms.",
        "😸 Legends speak of a hidden realm where time flows differently, guarded by mythical beasts.",
        "😺 The Dark Fountain, source of the world's chaos, holds secrets that few dare to uncover.",
      ],
      icon: "🗝️",
    },
    {
      name: "Advice for Adventurers",
      responses: [
        "🐺 Always stock up on healing items, for the Dark World's challenges are not to be underestimated.",
        "🦇 Equip yourself with equipment that enhances your abilities, as battles here can be fierce.",
        "🌌 Take time to explore every corner, for treasures and mysteries await those with a keen eye.",
      ],
      icon: "⚔️",
    },
  ],
  buyTexts: [
    "😺 Which item catches your eye?",
    "😸 Ready to embark on your next adventure with one of these treasures?",
    "😺 Take your pick and uncover its hidden powers!",
  ],
  welcomeTexts: [
    "😺 Welcome to Seam's Shop in the Dark World!",
    "😸 Greetings! Step into the realm of mystery and wonder.",
    "😺 Ah, a traveler! Come, explore the artifacts of the Dark World.",
    "😸 Welcome, welcome! Seeker of secrets and bearer of curiosity.",
    "😺 Enter, brave soul! The Dark World awaits your discovery.",
  ],
  goBackTexts: [
    "😿 No worries, take your time to decide.",
    "😿 Feel free to browse, adventurer.",
    "😿 Take a moment to ponder your choice.",
    "😿 Don't hesitate to return if you change your mind.",
    "😿 Explore at your own pace.",
  ],
  askTalkTexts: [
    "😺 Interested in hearing tales of the Dark World?",
    "😸 Let's delve into the mysteries hidden within these walls.",
    "😺 What stories intrigue you, traveler?",
    "😺 I'm all ears for your questions and curiosities.",
    "😸 Seek knowledge and adventure? You've come to the right place.",
  ],
  thankTexts: [
    "😺 Thank you for choosing Seam's Shop!",
    "😸 May your journey through the Dark World be filled with discoveries!",
    "😺 Until we meet again, adventurer!",
    "😸 Your patronage is greatly appreciated!",
    "😺 Farewell, and may the shadows guide your path.",
  ],
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ UTShop, ctx }) {
  const shop = new UTShop(darkWorldShop);
  return shop.onPlay(ctx);
}

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "🐺 Seam's Shop",
  titleFont: "bold",
  contentFont: "fancy",
  lineDeco: "altar",
};
