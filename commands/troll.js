// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "troll",
  description: "Risk your money with this stupid game.",
  version: "1.0.0",
  author: "frnAlt",
  usage: "{prefix}{name}",
  category: "Gambling Games",
  permissions: [0],
  noPrefix: false,
  waitingTime: 20,
  requirement: "3.0.0",
  icon: "🤣",
  cmdType: "arl_g",
  isGame: true,
};
const { randArrValue } = global.utils;
const winTexts = [
  "You trolled Kim jong un and won <amount>$",
  "You slapped the rich guy and got his <amount>$",
  "You told Donald Trump that you were his missing son and he gave you <amount>$",
  "You dated a gay and got his <amount>$",
  "You challenged Dwayne 'The Rock' Johnson to an arm wrestling match and won <amount>$.",
  "You convinced Oprah to share her secret to success, earning you <amount>$.",
  "You played poker with Elon Musk and won <amount>$ in Tesla stock.",
  "You serenaded Beyoncé and she rewarded you with <amount>$.",
  "You made Gordon Ramsay's favorite dish perfectly and earned <amount>$.",
  "You impressed Jeff Bezos with your business idea and received <amount>$ in funding.",
  "You taught Taylor Swift a new dance move and she paid you <amount>$ for the lesson.",
  "You challenged Cristiano Ronaldo to a soccer match and scored the winning goal, earning <amount>$.",
  "You guessed the correct answer on a game show hosted by Ellen DeGeneres, winning <amount>$.",
  "You gave a fashion tip to Lady Gaga and she gifted you <amount>$ worth of designer clothes.",
];

const looseTexts = [
  "You got caught and lost <amount>$",
  "You slipped and fell and lost <amount>$",
  "You tried to outsmart Stephen Hawking in a chess game and lost <amount>$.",
  "You challenged Jackie Chan to a martial arts duel and ended up with <amount>$ in medical bills.",
  "You attempted to race Usain Bolt and lost <amount>$.",
  "You tried to outeat Joey Chestnut in a hot dog eating contest and lost <amount>$.",
  "You challenged Simon Cowell to a singing competition and received <amount>$ for earplugs.",
  "You tried to outcook Gordon Ramsay and ended up with <amount>$ in restaurant bills.",
  "You challenged Serena Williams to a tennis match and lost <amount>$.",
  "You tried to outcode Bill Gates and ended up with <amount>$ in software bugs.",
  "You challenged LeBron James to a basketball game and ended up with <amount>$ for a broken hoop.",
  "You challenged Michael Phelps to a swimming race and ended up with <amount>$ for swim lessons.",
];

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ input, output, money, icon, getInflationRate }) {
  const { money: userMoney } = await money.getItem(input.senderID);
  const rate = await getInflationRate();
  const outcome = Math.random() < 0.5 ? "win" : "lose";
  let amount = Math.floor(Math.random() * 100) + 1;
  amount += Math.round(rate * amount);
  if (userMoney < amount && outcome === "lose") {
    amount = userMoney;
  }
  if (outcome === "win") {
    const text = randArrValue(winTexts).replace("<amount>", String(amount));
    output.reply(`${icon}\n\n${text}`);
    await money.setItem(input.senderID, {
      money: userMoney + amount,
    });
    return;
  } else {
    const text = randArrValue(looseTexts).replace("<amount>", String(amount));
    output.reply(`${icon}\n\n${text}`);
    await money.setItem(input.senderID, {
      money: userMoney - amount,
    });
    return;
  }
}
