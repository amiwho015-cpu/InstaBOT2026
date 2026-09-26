// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "kateshop",
  description:
    "A whimsical shop run by the enigmatic Kate, offering rare and enchanting items.",
  version: "1.0.3",
  author: "frnAlt",
  usage: "{prefix}kateshop",
  category: "Shopping",
  permissions: [0],
  noPrefix: false,
  cmdType: "cplx_g",
  icon: "✨",
  isGame: true,
};

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "✨ Kate Shop",
  titleFont: "bold",
  contentFont: "fancy",
};

const kateShop = {
  key: "kateShop",
  itemData: [
    {
      icon: "🍷",
      name: "Stardust Nectar",
      key: "stardustNectar",
      type: "food",
      flavorText: "A sparkling nectar that restores 50 HP.",
      price: 800,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Stardust Nectar",
          key: "stardustNectar",
          flavorText: "A sparkling nectar that restores 50 HP.",
          icon: "🍷",
          type: "food",
          heal: 50,
          sellPrice: 400,
        });
      },
    },
    {
      icon: "🛡️",
      name: "Aurora Shield",
      key: "auroraShield",
      type: "armor",
      flavorText:
        "A shield forged from the light of the northern skies. Boosts DEF by 10.",
      price: 2000,
      def: 10,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Aurora Shield",
          key: "auroraShield",
          flavorText:
            "A shield forged from the light of the northern skies. Boosts DEF by 10.",
          icon: "🛡️",
          type: "armor",
          def: 10,
          sellPrice: 1000,
        });
      },
    },
    {
      icon: "⚔️",
      name: "Phantom Blade",
      key: "phantomBlade",
      type: "weapon",
      flavorText: "A spectral sword that ignores enemy defenses. ATK +15.",
      price: 3500,
      atk: 15,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Phantom Blade",
          key: "phantomBlade",
          flavorText: "A spectral sword that ignores enemy defenses. ATK +15.",
          icon: "⚔️",
          type: "weapon",
          atk: 15,
          sellPrice: 1750,
        });
      },
    },

    // New Items
    {
      icon: "🔮",
      name: "Mystic Orb",
      key: "mysticOrb",
      type: "armor",
      flavorText:
        "An orb that glows with otherworldly light. No one knows its true purpose.",
      price: 15000,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Mystic Orb",
          key: "mysticOrb",
          flavorText:
            "An orb that glows with otherworldly light. No one knows its true purpose.",
          icon: "🔮",
          type: "armor",
          sellPrice: 7500,
        });
      },
    },
    {
      icon: "🛡️",
      name: "Ethereal Shield",
      key: "etherealShield",
      type: "armor",
      flavorText:
        "A translucent shield that hums with energy. Defends against unseen forces.",
      price: 50000,
      def: 20,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Ethereal Shield",
          key: "etherealShield",
          flavorText:
            "A translucent shield that hums with energy. Defends against unseen forces.",
          icon: "🛡️",
          type: "armor",
          def: 20,
          sellPrice: 25000,
        });
      },
    },
    {
      icon: "⚗️",
      name: "Elixir of Time",
      key: "elixirOfTime",
      type: "food",
      flavorText:
        "A potion said to briefly slow the passage of time. Restores 70 HP.",
      price: 8000,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Elixir of Time",
          key: "elixirOfTime",
          flavorText:
            "A potion said to briefly slow the passage of time. Restores 70 HP.",
          icon: "⚗️",
          type: "food",
          heal: 70,
          sellPrice: 4000,
        });
      },
    },
    {
      icon: "🌟",
      name: "Celestial Fragment",
      key: "celestialFragment",
      type: "food",
      flavorText:
        "A shard of a fallen star. Said to bring luck. Restores 90 HP.",
      price: 20000,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Celestial Fragment",
          key: "celestialFragment",
          flavorText:
            "A shard of a fallen star. Said to bring luck. Restores 90 HP.",
          icon: "🌟",
          type: "food",
          heal: 90,
          sellPrice: 10000,
        });
      },
    },
    {
      icon: "⚔️",
      name: "Blade of Whispers",
      key: "bladeOfWhispers",
      type: "weapon",
      flavorText:
        "A dagger that seems to whisper secrets as it moves. ATK +25.",
      price: 35000,
      atk: 25,
      onPurchase({ moneySet }) {
        moneySet.inventory.push({
          name: "Blade of Whispers",
          key: "bladeOfWhispers",
          flavorText:
            "A dagger that seems to whisper secrets as it moves. ATK +25.",
          icon: "⚔️",
          type: "weapon",
          atk: 25,
          sellPrice: 17500,
        });
      },
    },
  ],
  // Shop Dialogues (unchanged)
  sellTexts: [
    "✨ I’m here to sell magic, not to buy trinkets. Browse at your leisure!",
    "✨ My items are rare, and my stock is unique. What catches your eye?",
  ],
  talkTexts: [
    {
      name: "Kate’s Origins",
      responses: [
        "✨ Ah, you wish to know about me? I’ve traveled across worlds to bring these treasures.",
        "✨ My journey began when the stars whispered secrets to me, guiding me to this place.",
      ],
      icon: "🌌",
    },
    {
      name: "Item Lore",
      responses: [
        "✨ The Stardust Nectar is said to be distilled from the dew of a shooting star.",
        "✨ The Phantom Blade? It was wielded by a hero who vanished into the void.",
      ],
      icon: "📖",
    },
  ],
  buyTexts: [
    "✨ Choose wisely, adventurer.",
    "✨ A fine choice! May it serve you well.",
  ],
  welcomeTexts: [
    "✨ Welcome, traveler, to Kate’s Shop of Enchantment!",
    "✨ Step into a realm of wonders. What treasures do you seek?",
  ],
  goBackTexts: [
    "✨ Changed your mind? Take your time.",
    "✨ Return when you’re ready to embrace the magic.",
  ],
  askTalkTexts: [
    "✨ Curious about the stories behind these treasures?",
    "✨ Let’s dive into the tales of wonder and adventure.",
  ],
  thankTexts: [
    "✨ Thank you for visiting! May your journey be extraordinary.",
    "✨ Farewell, brave soul. Return when you seek more magic.",
  ],
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ UTShop, ctx }) {
  const shop = new UTShop(kateShop);
  return shop.onPlay(ctx);
}
