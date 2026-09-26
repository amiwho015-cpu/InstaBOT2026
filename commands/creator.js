const { writeFileSync, readFileSync } = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "creator",
    aliases: ["ctr"],
    version: "0.0.7",
    author: "Azadx69x",
    role: 6,
    shortDescription: { en: "Add, remove or view bot creators" },
    longDescription: { en: "Manage bot creators — add/remove/view" },
    category: "owner",
    guide: { en: "Usage:\n{pn} list\n{pn} add <uid|tag|reply>\n{pn} remove <uid|tag|reply>" }
  },

  langs: {
    vi: {
      added: "✅ | Added Bot Creator Successfully:\n%2",
      alreadyCreator: "\n⚠️ | %1 users already have creator role:\n%2",
      missingIdAdd: "⚠️ | Vui lòng nhập ID hoặc tag người dùng muốn thêm quyền creator",
      removed: "✅ | Removed Bot Creator Successfully:\n%2",
      notCreator: "⚠️ | %1 users don't have creator role:\n%2",
      missingIdRemove: "⚠️ | Vui lòng nhập ID hoặc tag người dùng muốn xóa quyền creator",
      listCreator: "👑 | List of creators:\n%1",
      noCreator: "📭 | No creators found.",
      notAllowed: "⛔ | You are not allowed to use this command!"
    },
    en: {
      added: "✅ | Added Bot Creator Successfully:\n%2",
      alreadyCreator: "\n⚠️ | %1 users already have creator role:\n%2",
      missingIdAdd: "⚠️ | Please enter ID or tag user to add creator role",
      removed: "✅ | Removed Bot Creator Successfully:\n%2",
      notCreator: "⚠️ | %1 users don't have creator role:\n%2",
      missingIdRemove: "⚠️ | Please enter ID or tag user to remove creator role",
      listCreator: "👑 | List of creators:\n%1",
      noCreator: "📭 | No creators found.",
      notAllowed: "⛔ | You are not allowed to use this command!"
    }
  },

  onStart: async function ({ message, args, event, api, getLang }) {
    const senderID = event.senderID;
    const prefix = global.GoatBot.config.prefix || "/";

    const configPath = global.client.dirConfig || path.join(process.cwd(), "config.json");
    let configData;

    try {
      configData = JSON.parse(readFileSync(configPath, "utf8"));
    } catch (e) {
      configData = {};
    }

    if (!configData.creator) configData.creator = [];

    const getName = async (uid) => {
      uid = uid.toString();
      try {
        const userInfo = await api.getUserInfo(uid);
        return userInfo[uid]?.name || "Unknown";
      } catch {
        return "Unknown";
      }
    };

    const formatCreator = async (uid) => {
      const name = await getName(uid);
      return `${name}, ${uid}`;
    };

    if (args[0] === "list" || args[0] === "-l") {
      if (!configData.creator.length) return message.reply(getLang("noCreator"));
      const creatorList = await Promise.all(configData.creator.map(formatCreator));
      return message.reply(getLang("listCreator", creatorList.join("\n")));
    }

    if (!configData.creator.includes(senderID) && ["add", "-a", "remove", "-r"].includes(args[0]))
      return message.reply(getLang("notAllowed"));

    let uids = [];
    if (event.mentions && Object.keys(event.mentions).length) {
      uids = Object.keys(event.mentions);
    } else if (event.type === "message_reply" && event.messageReply?.senderID) {
      uids = [event.messageReply.senderID];
    } else {
      uids = args.slice(1).filter(a => !isNaN(a));
    }
    uids = uids.map(u => u.toString());

    if (args[0] === "add" || args[0] === "-a") {
      if (!uids.length) return message.reply(getLang("missingIdAdd"));

      const newCreators = [];
      const alreadyCreators = [];

      for (const uid of uids) {
        if (configData.creator.includes(uid)) alreadyCreators.push(uid);
        else newCreators.push(uid);
      }

      configData.creator.push(...newCreators);
      writeFileSync(configPath, JSON.stringify(configData, null, 2));

      const newList = await Promise.all(newCreators.map(formatCreator));
      const alreadyList = await Promise.all(alreadyCreators.map(formatCreator));

      let msg = "";
      if (newList.length) {
        msg += getLang("added", newList.length, newList.join("\n"));
      }
      if (alreadyList.length) {
        if (msg) msg += "\n";
        msg += getLang("alreadyCreator", alreadyList.length, alreadyList.join("\n"));
      }

      return message.reply(msg || getLang("missingIdAdd"));
    }

    if (args[0] === "remove" || args[0] === "-r") {
      if (!uids.length) return message.reply(getLang("missingIdRemove"));

      const removed = [];
      const notCreators = [];

      for (const uid of uids) {
        if (configData.creator.includes(uid)) {
          removed.push(uid);
          configData.creator.splice(configData.creator.indexOf(uid), 1);
        } else notCreators.push(uid);
      }

      writeFileSync(configPath, JSON.stringify(configData, null, 2));

      const removedList = await Promise.all(removed.map(formatCreator));
      const notList = await Promise.all(notCreators.map(formatCreator));

      let msg = "";
      if (removedList.length) {
        msg += getLang("removed", removedList.length, removedList.join("\n"));
      }
      if (notList.length) {
        if (msg) msg += "\n";
        msg += getLang("notCreator", notList.length, notList.join("\n"));
      }

      return message.reply(msg || getLang("missingIdRemove"));
    }

    return message.reply(
`📋 CREATOR COMMANDS
${prefix}creator list - View all creators
${prefix}creator add - Add a creator
${prefix}creator remove - Remove a creator
💡 Tag, reply or provide UID`
    );
  }
};
