const axios = require("axios");

module.exports = {
  config: {
    name: "image",
    aliases: ["dalle", "imagine", "genimage", "gen"],
    version: "2.0",
    author: "frnAlt",
    cooldown: 10,
    role: 0,
    description: {
      vi: "Tạo ảnh AI từ văn bản (Hỗ trợ SDXL & Pollinations AI)",
      en: "Generates high-definition AI digital art from text prompts"
    },
    category: "ai-image",
    guide: {
      vi: "{pn} <mô tả ảnh>",
      en: "{pn} <prompt>"
    }
  },

  onStart: async function ({ message, event, args }) {
    let prompt = args.join(" ");

    if (!prompt && event.messageReply && event.messageReply.body) {
      prompt = event.messageReply.body;
    }

    if (!prompt) {
      return message.reply("🎨 Please enter a prompt for image generation.\nExample: /image cybernetic cat in futuristic city");
    }

    message.reaction("🎨", event.messageID);

    try {
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;

      const stream = await global.utils.getStreamFromURL(imageUrl, "image.png", { timeout: 15000 });

      message.reaction("👍", event.messageID);
      await message.reply({
        body: `✨ Generated AI Image\n\n🎨 Prompt: ${prompt}`,
        attachment: stream
      });
    } catch (err) {
      // Fallback to secondary Pollinations seed
      try {
        const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&seed=${Date.now()}&model=turbo`;
        const stream = await global.utils.getStreamFromURL(fallbackUrl, "image.png", { timeout: 15000 });

        message.reaction("👍", event.messageID);
        await message.reply({
          body: `✨ Generated AI Image (Fallback)\n\n🎨 Prompt: ${prompt}`,
          attachment: stream
        });
      } catch (fallbackErr) {
        message.reaction("👎", event.messageID);
        return message.reply(`❌ Failed to generate image: ${err.message || fallbackErr.message}`);
      }
    }
  }
};
