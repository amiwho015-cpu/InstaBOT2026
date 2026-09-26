const axios = require("axios");

module.exports = {
  config: {
    name: "msai",
    aliases: ["magicstudio", "msart", "magicai"],
    version: "1.0.0",
    author: "frnAlt",
    cooldown: 5,
    role: 0,
    shortDescription: {
      en: "Generate AI image with Magic Studio AI"
    },
    longDescription: {
      en: "Generates high quality artwork and images using Toshiro Magic Studio AI based on your text prompt"
    },
    category: "ai",
    guide: {
      en: "{pn} <your image prompt>"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    const prompt = args.join(" ").trim();
    if (!prompt) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(
        `❌ Please provide an image prompt.\n\n💡 Example: ${prefix}${commandName} a magical fantasy castle floating in sunset clouds`
      );
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🔮", event.messageID, () => {}, true);
    }

    try {
      let stream = null;
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/msai?prompt=${encodeURIComponent(prompt)}`;
        stream = await global.utils.getStreamFromURL(apiUrl, "msai.jpg", { timeout: 2500 });
      } catch (_) {}

      if (!stream) {
        const enhancedPrompt = `${prompt}, magic studio fantasy art, magical glowing aesthetic, vibrant digital masterpiece`;
        const seed = Math.floor(Math.random() * 1000000);
        const turboUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;
        stream = await global.utils.getStreamFromURL(turboUrl, "msai.jpg", { timeout: 15000 });
      }

      await message.reply({
        body: `🔮 Magic Studio AI Generated:\n\n✨ Prompt: "${prompt}"`,
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("Magic Studio AI error:", err);
      if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
      return message.reply(`❌ Magic Studio AI generation failed: ${err.message || err}`);
    }
  }
};
