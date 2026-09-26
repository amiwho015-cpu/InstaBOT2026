// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "numbergame",
  author: "frnAlt",
  version: "1.0.0",
  waitingTime: 5,
  description: "Number guessing game!",
  category: "Puzzle Games",
  usage: "{prefix}{name}",
  requirement: "3.0.0",
  icon: "🔢",
  cmdType: "arl_g",
  isGame: true,
};

const initialReward = 400;
const minReward = 50;
const penaltyPerSecond = 5;

export const style = {
  title: "Number Game 🔢",
  titleFont: "bold",
  contentFont: "fancy",
};

/**
 *
 * @param {CommandContext & { detectID: string; repObj: { author: string; number: number; mid: string; timestamp: number } }} param0
 * @returns
 */
export async function reply({
  api,
  input,
  output,
  repObj: receive,
  money: moneyH,
  getInflationRate,
  detectID,
}) {
  if (!receive) return;
  const rate = await getInflationRate();
  receive.mid = detectID;

  const curr = Date.now();
  const elapsedSeconds = Math.floor((curr - receive.timestamp) / 1000);
  let currentReward = Math.max(
    initialReward - elapsedSeconds * penaltyPerSecond,
    minReward
  );
  currentReward += Math.round(rate);

  const guessedNumber = parseInt(input?.words[0]?.trim());
  if (guessedNumber === receive.number) {
    api.unsendMessage(receive.mid);
    input.delReply(receive.mid);
    const userInfo = await moneyH.getItem(input.senderID);
    const { money = 0, numberGameWins = 0, name } = userInfo;

    await moneyH.setItem(input.senderID, {
      money: money + currentReward,
      numberGameWins: numberGameWins + 1,
      lastNumberGame: null,
    });

    return output.reply(
      `✅ | Correct ${
        name?.split(" ")[0]
      }! You have been rewarded ${currentReward} coins!`
    );
  } else {
    const userInfo = await moneyH.getItem(input.senderID);
    return output.reply(
      `❌ | Wrong ${userInfo?.name?.split(" ")[0]}! Try again.`
    );
  }
}

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ input, output, prefix, money: moneyH }) {
  if (input.arguments[0] == "guide") {
    return output.reply(`𝗢𝘃𝗲𝗿𝘃𝗶𝗲𝘄
Test your luck and number-guessing skills with our Number Game! Guess the hidden number to earn rewards.

𝗛𝗼𝘄 𝘁𝗼 𝗣𝗮𝗿𝘁𝗶𝗰𝗶𝗽𝗮𝘁𝗲:
1. Type 𝚗𝚞𝚖𝚋𝚎𝚛𝚐𝚊𝚖𝚎 to start the game.
2. Guess the hidden number.
3. Answer by typing your response.

𝗖𝗼𝗻𝗱𝗶𝘁𝗶𝗼𝗻𝘀:
- You can guess the number multiple times until you get it right.
- Rewards decrease over time.

𝗥𝗲𝘄𝗮𝗿𝗱𝘀:
- Correct answers earn you coins.
- Rewards decrease if you answer late.

𝗦𝗽𝗲𝗰𝗶𝗮𝗹 𝗠𝗲𝘀𝘀𝗮𝗴𝗲𝘀:
- If you guess wrong, you'll receive a fun response. Keep trying!
- Trash talks add a humorous touch to the challenge.

𝗘𝗫𝗔𝗠𝗣𝗟𝗘 𝗨𝗦𝗔𝗚𝗘:
- Input: ${prefix}𝚗𝚞𝚖𝚋𝚎𝚛𝚐𝚊𝚖𝚎
- Hidden Number: 𝟻

- Answer: 5

𝗦𝗰𝗼𝗿𝗶𝗻𝗴:
- Each correct answer earns you coins.
- Late answers receive reduced rewards.

𝗔𝗰𝗵𝗶𝗲𝘃𝗲𝗺𝗲𝗻𝘁𝘀:
- Track your number game wins and coins earned in your profile.

𝗘𝗻𝗷𝗼𝘆 𝘁𝗵𝗲 𝗡𝘂𝗺𝗯𝗲𝗿 𝗚𝗮𝗺𝗲 𝗮𝗻𝗱 𝗛𝗮𝘃𝗲 𝗙𝘂𝗻! 🔢🌟

---
`);
  }
  let { lastNumberGame } = await moneyH.getItem(input.senderID);
  lastNumberGame ??= {
    number: null,
    timeStamp: null,
    correct: null,
  };
  let info;
  if (!input.isWeb) {
    info = await output.reply(`Fetching...`);
  }
  let hiddenNumber = lastNumberGame?.number;
  if (!hiddenNumber) {
    hiddenNumber = Math.floor(Math.random() * 100) + 1;
    lastNumberGame.number = hiddenNumber;
    lastNumberGame.timeStamp = Date.now();
    lastNumberGame.correct = hiddenNumber;
  }

  const str = `🔢 Guess the hidden number (between 1 and 100):\n\nYou can type 'numbergame guide' if you need help.`;

  if (info) {
    output.edit(str, info.messageID);
  } else {
    info = await output.reply(str);
  }
  await moneyH.setItem(input.senderID, {
    lastNumberGame,
  });
  input.setReply(info.messageID, {
    key: "numbergame",
    author: input.senderID,
    number: lastNumberGame.correct,
    mid: info.messageID,
    timestamp: lastNumberGame.timeStamp,
  });
}
