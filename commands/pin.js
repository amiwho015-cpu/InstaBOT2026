const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["Pinterest", "pin"],
    version: "3.0.0",
    author: "frnAlt",
    cooldown: 5,
    role: 0,
    shortDescription: {
      en: "Search Pinterest for images"
    },
    longDescription: {
      en: "Search Pinterest images using Toshiro Pinterest API and returns 2 images by default"
    },
    category: "image",
    guide: {
      en: "{pn} <search keyword> [limit]\nExample: {pn} cat\nExample: {pn} anime wallpaper 3"
    }
  },

  onStart: async function ({ api, args, message, event, commandName }) {
    if (!args || args.length === 0) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(`❌ Please provide a search query.\n\n💡 Example: ${prefix}${commandName} cat\n💡 Example: ${prefix}${commandName} aesthetic wallpaper 2`);
    }

    let limit = 2; // Default 2 images as requested
    let queryArgs = [...args];

    // Check if user provided limit as flag or last argument (e.g. -3 or 3)
    const lastArg = queryArgs[queryArgs.length - 1];
    if (/^-\d+$/.test(lastArg)) {
      limit = Math.min(10, Math.max(1, parseInt(lastArg.slice(1), 10)));
      queryArgs.pop();
    } else if (/^\d+$/.test(lastArg) && queryArgs.length > 1) {
      limit = Math.min(10, Math.max(1, parseInt(lastArg, 10)));
      queryArgs.pop();
    }

    const query = queryArgs.join(" ").trim();
    if (!query) {
      return message.reply("❌ Please provide a valid search query.");
    }

    if (api && api.setMessageReaction) {
      api.setMessageReaction("🔍", event.messageID, () => {}, true);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);

    const tempFiles = [];

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/search/pin?keyword=${encodeURIComponent(query)}&limit=${limit}`;
      const res = await axios.get(apiUrl, { timeout: 30000 });
      const data = res.data;

      let imageUrls = [];
      if (Array.isArray(data?.result?.preview) && data.result.preview.length > 0) {
        imageUrls = data.result.preview.slice(0, limit);
      } else if (data?.result?.image) {
        imageUrls = [data.result.image];
      }

      if (imageUrls.length === 0) {
        if (api && api.setMessageReaction) {
          api.setMessageReaction("👎", event.messageID, () => {}, true);
        }
        return message.reply(`❌ No Pinterest images found for "${query}".`);
      }

      const streams = [];
      for (let i = 0; i < imageUrls.length; i++) {
        const u = imageUrls[i];
        const tmpFile = path.join(cacheDir, `pin_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.jpg`);
        try {
          const imgRes = await axios.get(u, {
            responseType: "arraybuffer",
            timeout: 25000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Referer": "https://www.pinterest.com/"
            }
          });
          await fs.writeFile(tmpFile, Buffer.from(imgRes.data));
          tempFiles.push(tmpFile);

          const stream = fs.createReadStream(tmpFile);
          stream.on("close", () => {
            fs.unlink(tmpFile, () => {});
          });
          streams.push(stream);
        } catch (downloadErr) {
          console.warn(`[PINTEREST] Failed to download image ${i}:`, downloadErr.message);
          if (fs.existsSync(tmpFile)) fs.unlink(tmpFile, () => {});
        }
      }

      if (streams.length === 0) {
        if (api && api.setMessageReaction) {
          api.setMessageReaction("👎", event.messageID, () => {}, true);
        }
        return message.reply(`❌ Failed to retrieve image attachments for "${query}".`);
      }

      if (api && api.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }

      const operator = data?.operator || "Toshiro Editz";
      const replyBody = `📌 Pinterest Search: "${query}"\nShowing ${streams.length} image(s)\n⚡ Operator: ${operator}`;

      return message.reply({
        body: replyBody,
        attachment: streams
      });

    } catch (err) {
      console.error("[PINTEREST ERROR]:", err?.response?.data || err.message);
      for (const f of tempFiles) {
        if (fs.existsSync(f)) fs.unlink(f, () => {});
      }
      if (api && api.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to search Pinterest: ${err.message || err}`);
    }
  }
};