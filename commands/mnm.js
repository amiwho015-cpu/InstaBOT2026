const axios = require("axios");

module.exports = {
  config: {
    name: "mnm",
    version: "0.0.7",
    author: "Azadx69x",
    cooldown: 3,
    role: 0,
    shortDescription: "MNM effect on profile pic",
    longDescription: "Apply MNM effect to user's profile picture",
    category: "fun",
    guide: { en: "{pn} (reply or mention or none)" }
  },
  onStart: async function ({ event, message, args, usersData }) {
    try {
      const tid = (event.type === "message_reply" && event.messageReply?.senderID) ||
                  (event.mentions && Object.keys(event.mentions)[0]) ||
                  event.senderID;
      const avatar = await usersData.getAvatarUrl(tid);
      const stream = await global.utils.getStreamFromURL(`https://azadx69x.is-a.dev/api/mnm?image=${encodeURIComponent(avatar)}`);
      return message.reply({ attachment: stream });
    } catch (e) {
      console.error("MNM Error:", e);
      return message.reply("❌ Could not generate MNM image.");
    }
  }
};
