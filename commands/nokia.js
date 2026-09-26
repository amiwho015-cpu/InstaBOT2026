const axios = require("axios");

module.exports = {
  config: {
    name: "nokia",
    version: "0.0.7",
    author: "Azadx69x",
    cooldown: 3,
    role: 0,
    shortDescription: "Profile picture inside a Nokia phone",
    longDescription: "Shows a user's profile picture inside a Nokia phone frame",
    category: "fun",
    guide: { en: "{pn} (reply or no reply)" }
  },
  onStart: async function ({ event, message, args, usersData }) {
    try {
      const tid = (event.type === "message_reply" && event.messageReply?.senderID) ||
                  (event.mentions && Object.keys(event.mentions)[0]) ||
                  event.senderID;
      const avatar = await usersData.getAvatarUrl(tid);
      const stream = await global.utils.getStreamFromURL(`https://azadx69x.is-a.dev/api/nokia?image=${encodeURIComponent(avatar)}`);
      return message.reply({ attachment: stream });
    } catch (e) {
      console.error("NOKIA Error:", e);
      return message.reply("❌ Could not fetch the Nokia phone image.");
    }
  }
};
