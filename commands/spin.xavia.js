function getRandomValue(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const config = {
  name: "spinthewheel",
  aliases: ["spin"],
  description: "Spin the wheel game",
  usage: "#spin start",
  cooldown: 10,
  credits: "frnAlt",
  category: "Xavia Economy",
  isGame: true,
};

const langData = {
  en_US: {
    "spinthewheel.spin": "🎡𝚂𝚙𝚒𝚗𝚗𝚒𝚗𝚐 𝚝𝚑𝚎 𝚠𝚑𝚎𝚎𝚕...",
    "spinthewheel.win": "🎉𝘾𝙤𝙣𝙜𝙧𝙖𝙩𝙪𝙡𝙖𝙩𝙞𝙤𝙣𝙨! 𝙔𝙤𝙪 𝙫𝙚 𝙬𝙤𝙣 ${amount}!",
    "spinthewheel.jackpot":
      "🎉 𝐉𝐀𝐂𝐊𝐏𝐎𝐓! 𝐂𝐨𝐧𝐠𝐫𝐚𝐭𝐮𝐥𝐚𝐭𝐢𝐨𝐧𝐬! 𝐘𝐨𝐮 𝐡𝐚𝐯𝐞 𝐰𝐨𝐧 𝐭𝐡𝐞 𝐣𝐚𝐜𝐤𝐩𝐨𝐭 𝐰𝐨𝐫𝐭𝐡 ${amount}!",
    "spinthewheel.cooldown":
      "⏳𝚈𝚘𝚞 𝚖𝚞𝚜𝚝 𝚠𝚊𝚒𝚝 𝚋𝚎𝚏𝚘𝚛𝚎 𝚜𝚙𝚒𝚗𝚗𝚒𝚗𝚐 𝚝𝚑𝚎 𝚠𝚑𝚎𝚎𝚕 𝚊𝚐𝚊𝚒𝚗. 𝙽𝚎𝚡𝚝 𝚊𝚟𝚊𝚒𝚕𝚊𝚋𝚕𝚎: \n{nextSpinStart} 𝚜𝚎𝚌𝚘𝚗𝚍𝚜",
    "spinthewheel.nextStart": "Next spin available in {seconds} seconds.",
    "spinthewheel.menuOptions":
      "◦❭❯❱【Spin the Wheel】❰❮❬◦\n\n" +
      "𝐏𝐎𝐒𝐒𝐈𝐁𝐋𝐄 𝐑𝐄𝐖𝐀𝐑𝐃𝐒:\n" +
      "1. 1,000,000 credits (30%)\n" +
      "2. 4,000,000 credits (23%)\n" +
      "3. 8,000,000 credits (18%)\n" +
      "4. 10,000,000 credits (13%)\n" +
      "5. 100,000,000 credits (10%)\n" +
      "6. 300,000,000 credits (3%)\n" +
      "7. Jackpot! 100,000,000,000,000 credits (3%)\n" +
      "\n𝚃𝚘 𝚜𝚝𝚊𝚛#𝚜𝚙𝚒𝚗 𝚜𝚝𝚊𝚛𝚝𝚜𝚎 `#𝚜𝚙𝚒𝚗 𝚜𝚝𝚊𝚛𝚝`.\n Next available: {nextSpinStart} 𝚜𝚎𝚌𝚘𝚗𝚍𝚜",
  },
};

const lastSpinStartTimes = new Map();
const playerCooldowns = new Map();

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getNextSpinStart(userID) {
  const lastSpinTime = lastSpinStartTimes.get(userID) || 0;
  const currentTime = Date.now();
  const nextStart = lastSpinTime + 3 * 60 * 60 * 1000;

  const secondsUntilNextStart = Math.max(
    0,
    Math.floor((nextStart - currentTime) / 1000)
  );

  return secondsUntilNextStart === 0 ? "Now" : secondsUntilNextStart;
}

/**
 * @type {TOnCallCommand}
 */
async function onCall({ message, getLang, args }) {
  if (!message || !message.body) {
    console.error("Invalid message object!");
    return;
  }

  const { senderID } = message;

  if (args.length === 0 || args[0] === "menu") {
    const nextSpinStart = getNextSpinStart(senderID);
    const menuOptions = getLang("spinthewheel.menuOptions").replace(
      "{nextSpinStart}",
      nextSpinStart
    );
    return message.reply(menuOptions);
  }

  if (args[0] === "start") {
    if (!isEligibleToSpin(senderID)) {
      const nextSpinStart = getNextSpinStart(senderID);
      return message.reply(
        getLang("spinthewheel.cooldown").replace(
          "{nextSpinStart}",
          nextSpinStart
        )
      );
    }

    const spinningMessage = getLang("spinthewheel.spin");
    const spinning = await message.reply(spinningMessage);

    await delay(5000);

    if (global.api && global.api.unsendMessage) {
      await global.api.unsendMessage(spinning.messageID);
    }

    const spinResult = spinWheel();
    const resultMessage = getResultMessage(spinResult, getLang);

    if (spinResult.type === "win") {
      const { Users } = global.controllers;
      Users.increaseMoney(senderID, spinResult.amount);
    }

    updateLastSpinStartTime(senderID);

    return message.reply(resultMessage);
  }

  const nextSpinStart = getNextSpinStart(senderID);
  const menuOptions = getLang("spinthewheel.menuOptions").replace(
    "{nextSpinStart}",
    nextSpinStart
  );
  return message.reply(menuOptions);
}

function getResultMessage(spinResult, getLang) {
  if (spinResult.type === "win") {
    if (spinResult.jackpot) {
      return getLang("spinthewheel.jackpot").replace(
        "{amount}",
        spinResult.amount
      );
    } else {
      return getLang("spinthewheel.win").replace("{amount}", spinResult.amount);
    }
  }
}

function spinWheel() {
  const randomValue = Math.random();

  if (randomValue < 0.3) {
    return { type: "win", amount: 1000000 };
  } else if (randomValue < 0.53) {
    return { type: "win", amount: 4000000 };
  } else if (randomValue < 0.76) {
    return { type: "win", amount: 8000000 };
  } else if (randomValue < 0.94) {
    return { type: "win", amount: 10000000 };
  } else if (randomValue < 0.97) {
    return { type: "win", amount: 100000000 };
  } else {
    return { type: "win", amount: 100000000000000, jackpot: true };
  }
}

function isEligibleToSpin(userID) {
  const lastSpinTime = lastSpinStartTimes.get(userID) || 0;
  const currentTime = Date.now();
  const nextStart = lastSpinTime + 3 * 60 * 60 * 1000;

  return nextStart <= currentTime && isPlayerCooldownElapsed(userID);
}

function isPlayerCooldownElapsed(userID) {
  const currentTime = Date.now();
  const playerCooldownTime = playerCooldowns.get(userID) || 0;
  return currentTime >= playerCooldownTime;
}

function updateLastSpinStartTime(userID) {
  lastSpinStartTimes.set(userID, Date.now());
  const cooldownTime = Date.now() + config.cooldown * 1000;
  playerCooldowns.set(userID, cooldownTime);
}

export default {
  config,
  langData,
  onCall,
};
