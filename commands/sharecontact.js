module.exports = {
  config: {
    name: "sharecontact",
    aliases: ["sc", "contactcard", "sharecard"],
    version: "1.5.0",
    author: "frnAlt",
    cooldown: 3,
    role: 0,
    description: "Share Facebook Messenger contact card in the thread using MQTT engine",
    category: "info",
    guide: {
      en: "{pn} <userID> [custom text] - Share contact card for target user\n{pn} me - Share your own contact card\n{pn} (reply to user) - Share replied user's contact card"
    }
  },

  onStart: async function ({ message, args, api, event }) {
    let targetID;
    let customText = "";

    if (event.type === "message_reply" && event.messageReply?.senderID) {
      targetID = event.messageReply.senderID;
      customText = args.join(" ").trim();
    } else if (args[0] === "me") {
      targetID = event.senderID;
      customText = args.slice(1).join(" ").trim();
    } else if (args[0] && !isNaN(args[0])) {
      targetID = args[0];
      customText = args.slice(1).join(" ").trim();
    } else if (Object.keys(event.mentions || {}).length > 0) {
      targetID = Object.keys(event.mentions)[0];
      customText = args.filter(a => !a.startsWith("@")).join(" ").trim();
    } else {
      targetID = event.senderID;
    }

    if (!targetID) {
      return message.reply("❌ Please specify a user ID, mention someone, or reply to their message!");
    }

    const cardText = customText || `Contact Profile: ${targetID}`;

    try {
      if (typeof api.shareContact === "function") {
        await new Promise((resolve, reject) => {
          api.shareContact(cardText, targetID, event.threadID, (err, res) => {
            if (err) reject(err);
            else resolve(res);
          });
        });
      } else {
        await message.reply({
          body: `📇 Contact: https://facebook.com/${targetID}\n${cardText}`,
          mentions: [{ tag: `@User`, id: targetID }]
        });
      }
    } catch (error) {
      // Fallback
      return message.reply({
        body: `📇 Contact Profile: https://facebook.com/${targetID}\n${cardText}`,
        mentions: [{ tag: `@User`, id: targetID }]
      });
    }
  }
};
