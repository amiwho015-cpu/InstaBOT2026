const axios = require("axios");

module.exports = {
  config: {
    name: "sayv2",
    aliases: ["say2", "tts2", "speak2", "voice2"],
    version: "1.0.0",
    author: "frnAlt",
    cooldown: 3,
    role: 0,
    shortDescription: {
      en: "Convert text to speech using Say V2"
    },
    longDescription: {
      en: "Generate high-quality voice audio from your provided text or replied message using Toshiro Say V2 API"
    },
    category: "tts",
    guide: {
      en: "{pn} <your text>\n{pn} (reply to a message)"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    let text = "";

    if (event.type === "message_reply" && event.messageReply?.body) {
      text = event.messageReply.body;
    } else if (args && args.length > 0) {
      text = args.join(" ").trim();
    }

    if (!text) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(`❌ Please provide text to convert into speech.\n\n💡 Example: ${prefix}${commandName} Hello, how are you?`);
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🗣️", event.messageID, () => {}, true);
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/tools/sayv2?text=${encodeURIComponent(text)}`;
      const stream = await global.utils.getStreamFromURL(apiUrl, "sayv2.mp3");

      await message.reply({
        body: `🗣️ Voice generated for: "${text.length > 50 ? text.substring(0, 50) + '...' : text}"`,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }
    } catch (error) {
      console.error("Sayv2 error:", error);
      if (api.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to generate speech audio: ${error.message || error}`);
    }
  }
};
