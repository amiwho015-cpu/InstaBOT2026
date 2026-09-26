// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "toplosers",
  description: "Lists the top 10 unluckiest users.",
  author: "frnAlt",
  version: "1.0.0",
  noPrefix: false,
  permissions: [0, 1, 2],
  waitingTime: 3,
  requirement: "3.0.0",
  icon: "🤣",
  category: "Utilities",
  cmdType: "arl_g",
  isGame: true,
};

export class style {
  title = "Top Loosers 🤣";
  titleFont = "bold";
  contentFont = "fancy";
}
const { parseCurrency: pCy } = global.utils;

/**
 *
 * @param {CommandContext} param0
 */
export async function entry({ output, input, money, Slicer, args }) {
  const time = Date.now();
  const isLean = args.includes("--lean");
  const allUsers = await money[isLean ? "toLeanObject" : "getAll"]();

  const sortedUsers = Object.keys(allUsers).sort((a, b) => {
    allUsers[a] ??= money.defaults;
    allUsers[b] ??= money.defaults;

    const {
      slotWins: slotWinsA = 0,
      drWin: drWinsA = 0,
      slotLooses: slotLoosesA = 0,
      drLost: drLoosesA = 0,
    } = allUsers[a];

    const {
      slotWins: slotWinsB = 0,
      drWin: drWinsB = 0,
      slotLooses: slotLoosesB = 0,
      drLost: drLoosesB = 0,
    } = allUsers[b];

    const totalWinsA = slotWinsA + drWinsA;
    const totalLossesA = slotLoosesA + drLoosesA;
    const totalWinsB = slotWinsB + drWinsB;
    const totalLossesB = slotLoosesB + drLoosesB;

    return totalLossesB - totalWinsB - (totalLossesA - totalWinsA);
  });

  let i = ((isNaN(parseInt(args[0])) ? 1 : parseInt(args[0])) - 1) * 10;
  const slicer = new Slicer(sortedUsers, 10);

  let result = `Top 10 Losers: (${Date.now() - time}ms)${
    isLean ? "(lean mode)" : ""
  }\n\n`;

  for (const userID of slicer.getPage(args[0])) {
    i++;

    const data = allUsers[userID];
    const {
      slotWins = 0,
      drWin: drWins = 0,
      slotLooses = 0,
      drLost: drLooses = 0,
    } = data;
    const slot = parseInt(String(slotLooses - slotWins));
    const dr = parseInt(String(drLooses - drWins));
    result += `${i}. **${data.name}**\n🍋 Slot ${
      slot > -1 ? "Loose" : "Win"
    }(s): **$${pCy(Math.abs(slot))}**💵\n💰 Doublerisk ${
      dr > -1 ? "Loose" : "Win"
    }(s): **$${pCy(Math.abs(dr))}**💵\n\n`;
  }

  output.reply(result + `\n\n${input.words[0]} <page> - View a specific page.`);
}
