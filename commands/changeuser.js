// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "changeuser",
  description: "Changes the user's display name.",
  author: "frnAlt",
  version: "1.1.1",
  usage: "{prefix}changename <newName>",
  category: "User",
  role: 0,
  noPrefix: false,
  waitingTime: 5,
  icon: "👤",
  otherNames: ["changename", "register"],
  linkTo: "identity-setname",
};

export async function entry() {}
