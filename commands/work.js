// @ts-check
const _6HOURS = 6 * 60 * 60 * 1000;
const _2HOURS = 2 * 60 * 60 * 1000;
const _3HOURS = 3 * 60 * 60 * 1000;
const _1HOURS = 1 * 60 * 60 * 1000;
const _30MINUTES = 30 * 60 * 1000;

const extra = {
  min: 20,
  max: 100,
  delay: [_30MINUTES, _1HOURS, _3HOURS, _2HOURS, _6HOURS],
};

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "work",
  aliases: ["wk"],
  version: "1.0.0",
  description: "Work to earn money",
  author: "frnAlt",
  waitingTime: 10,
  category: "Chance Games",
  cmdType: "arl_g",
  icon: "💼",
  isGame: true,
};

export const style = {
  title: "Xavia Work 💼",
  titleFont: "bold",
  contentFont: "fancy",
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ output, input, money, getInflationRate }) {
  const { min, max, delay } = extra;
  const rate = await getInflationRate();
  try {
    const userData = await money.getItem(input.senderID);
    if (!userData) return output.reply("Your data is not ready");

    if (!userData.hasOwnProperty("work") || typeof userData.work !== "object")
      userData.work = { lastWorked: 0, delay: 0 };
    if (!userData.work.hasOwnProperty("lastWorked"))
      userData.work.lastWorked = 0;
    if (!userData.work.hasOwnProperty("delay")) userData.work.delay = 0;

    if (Date.now() - userData.work.lastWorked < userData.work.delay) {
      const remainingTimeMs =
        userData.work.delay - (Date.now() - userData.work.lastWorked);
      const remainingTimeMinutes = Math.floor(remainingTimeMs / 60000);

      return output.reply(
        `You have already worked, you can work again in ${remainingTimeMinutes} minute(s).`
      );
    }

    userData.work.lastWorked = Date.now();
    userData.work.delay = delay[Math.floor(Math.random() * delay.length)];
    let amount = Math.floor(Math.random() * (max - min + 1)) + min;
    amount += Math.round(rate * amount);
    await money.setItem(input.senderID, {
      work: userData.work,
      money: userData.money + amount,
    });

    output.reply(`You have worked and earned ${amount.toLocaleString()}XC`);
  } catch (error) {
    console.error(error);
    output.error(error);
  }
}
