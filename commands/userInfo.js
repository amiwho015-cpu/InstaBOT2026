// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "userInfo",
  description: "Check user's info",
  author: "frnAlt",
  version: "2.0.0",
  usage: "{prefix}{name}",
  category: "User",
  requirement: "3.0.0",
  icon: "📛",
  aliases: ["uinfo"],
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ input, output, usersDB, args }) {
  let ID = args[0] || input.detectID || input.senderID;
  if (args[0] === "raw") {
    return output.reply(`${ID}`);
  }
  if (args[0] === "tid") {
    return output.reply(`${input.threadID}`);
  }
  const udata = await usersDB.getItem(ID);
  const info = await usersDB.getUserInfo(ID);
  await output.reply(`📛 **${udata.name}**${info ? ` (${info.name})` : ""}

**ID**: ${ID}
**TID**: ${
    input.threadID
  }\n\n**FB Link**:\nhttps://facebook.com/profile.php?id=${ID}`);
}
