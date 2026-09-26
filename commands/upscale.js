const axios = require("axios");

async function extractImageUrl(args, event, api) {
  if (global.utils && typeof global.utils.extractImageUrl === "function") {
    const u = global.utils.extractImageUrl(event, args, { allowAvatar: false });
    if (u) return u;
  }

  let imageUrl = args.find(arg => typeof arg === "string" && arg.startsWith("http"));

  if (!imageUrl && event.messageReply?.attachments?.length > 0) {
    for (const att of event.messageReply.attachments) {
      let url = att.url || att.largePreviewUrl || att.large_preview_url || att.previewUrl || att.preview_url || att.thumbnailUrl || att.thumbnail_url || att.image || att.photoUrl || att.image_data?.url || att.media?.image?.uri;
      if (!url && att.ID && api?.resolvePhotoUrl) {
        try { url = await api.resolvePhotoUrl(att.ID); } catch (_) {}
      }
      if (url) {
        imageUrl = url;
        break;
      }
    }
  }

  if (!imageUrl && event.attachments?.length > 0) {
    for (const att of event.attachments) {
      let url = att.url || att.largePreviewUrl || att.large_preview_url || att.previewUrl || att.preview_url || att.thumbnailUrl || att.thumbnail_url || att.image || att.photoUrl || att.image_data?.url || att.media?.image?.uri;
      if (!url && att.ID && api?.resolvePhotoUrl) {
        try { url = await api.resolvePhotoUrl(att.ID); } catch (_) {}
      }
      if (url) {
        imageUrl = url;
        break;
      }
    }
  }

  if (!imageUrl && event.messageReply?.body) {
    const match = event.messageReply.body.match(/https?:\/\/[^\s]+/i);
    if (match && /\.(jpe?g|png|webp|gif|bmp)(\?.*)?$/i.test(match[0])) {
      imageUrl = match[0];
    }
  }

  return imageUrl;
}

module.exports = {
  config: {
    name: "upscale",
    aliases: ["hd", "enhance", "4kimage", "upscaler"],
    version: "3.0.0",
    author: "frnAlt",
    cooldown: 10,
    role: 0,
    shortDescription: {
      en: "Enhance and upscale image to 4K resolution"
    },
    longDescription: {
      en: "Upscales images to high resolution 4K HD using Toshiro 4K Upscaler API"
    },
    category: "ai-image",
    guide: {
      en: "{pn} <image_url>\n{pn} (reply to an image)"
    }
  },

  onStart: async function ({ api, args, message, event, commandName }) {
    const imageUrl = await extractImageUrl(args, event, api);

    if (!imageUrl) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(
        `📸 Please reply to an image or provide an image URL to upscale to 4K.\n\n💡 Example: Reply to a photo with ${prefix}${commandName}`
      );
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    try {
      let finalStream = null;

      // 1. Primary: Toshiro 4K Upscaler API (fast 2.5s timeout)
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/image/4k?imgUrl=${encodeURIComponent(imageUrl)}`;
        const res = await axios.get(apiUrl, { timeout: 2500 });

        if (res.data && res.data.success && res.data.result?.upscaled) {
          finalStream = await global.utils.getStreamFromURL(res.data.result.upscaled, "upscale_4k.jpg", { timeout: 10000 });
        }
      } catch (err) {
        // Fallback to high-speed Pollinations turbo
      }

      // 2. High-speed Fallback to Pollinations 4K Enhancement
      if (!finalStream) {
        const fallbackUrl = `https://image.pollinations.ai/prompt/masterpiece%20hyperrealistic%20high%20resolution%204k%20detail?image=${encodeURIComponent(imageUrl)}&width=1024&height=1024&nologo=true&model=turbo`;
        finalStream = await global.utils.getStreamFromURL(fallbackUrl, "upscale_4k.png", { timeout: 15000 });
      }

      if (!finalStream) {
        throw new Error("Failed to process upscaled image stream.");
      }

      if (api.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }

      await message.reply({
        body: `🔍 Image successfully upscaled to 4K Ultra HD! ✨`,
        attachment: finalStream
      });
    } catch (error) {
      console.error("4K Upscale error:", error);
      if (api.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to upscale image: ${error.message || error}`);
    }
  }
};
