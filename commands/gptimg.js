const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "gpt",
    aliases: ["gptimage", "gpt4img", "gptart", "dalle", "aiimg"],
    version: "2.0.0",
    author: "frnAlt",
    cooldown: 8,
    role: 0,
    shortDescription: {
      en: "Generate AI image using GPT Image by prompt"
    },
    longDescription: {
      en: "Generates high quality AI art using Toshiro GPT Image API based on your text prompt and aspect ratio"
    },
    category: "ai",
    guide: {
      en: "{pn} <prompt> [--ratio 1.1 | 16:9 | 1:1]\nExample: {pn} make 4k car --ratio 1.1"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    let rawText = args.join(" ").trim();
    if (!rawText) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(
        `❌ Please provide an image prompt.\n\n💡 Example: ${prefix}${commandName} make 4k car\n💡 With ratio: ${prefix}${commandName} cyberpunk city --ratio 16:9`
      );
    }

    let ratio = "1.1";
    const ratioMatch = rawText.match(/--(?:ratio|ar)\s+([0-9.:]+)/i) || rawText.match(/-(?:ratio|ar)\s+([0-9.:]+)/i);
    if (ratioMatch) {
      ratio = ratioMatch[1].replace(":", ".");
      rawText = rawText.replace(ratioMatch[0], "").trim();
    }

    const prompt = rawText || "make 4k car";

    if (api && api.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const tmpFile = path.join(cacheDir, `gptimg_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`);

    try {
      let imageUrl = null;
      let shortUrl = null;
      let operator = "Toshiro Editz";

      // 1. Primary: Toshiro GPT Image API
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/ai/gptimg?prompt=${encodeURIComponent(prompt)}&ratio=${encodeURIComponent(ratio)}`;
        const res = await axios.get(apiUrl, { timeout: 60000 });
        if (res.data?.success && res.data?.result?.image) {
          imageUrl = res.data.result.image;
          shortUrl = res.data.result.short;
          operator = res.data.operator || operator;
        }
      } catch (toshiroErr) {
        console.warn("[GPTIMG] Toshiro API warning:", toshiroErr?.response?.data || toshiroErr.message);
      }

      // 2. Fallback: Pollinations Turbo
      if (!imageUrl) {
        const enhancedPrompt = `${prompt}, photorealistic, high resolution, hyperdetailed, masterpiece`;
        const seed = Math.floor(Math.random() * 1000000);
        imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=1024&height=1024&nologo=true&seed=${seed}&model=turbo`;
      }

      // Download image buffer to temp file
      const downloadRes = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 45000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
      });
      await fs.writeFile(tmpFile, Buffer.from(downloadRes.data));

      const stream = fs.createReadStream(tmpFile);
      stream.on("close", () => {
        fs.unlink(tmpFile, () => {});
      });

      const bodyMsg = `🤖 GPT Image Generated\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `• Prompt: ${prompt}\n` +
        `• Ratio: ${ratio}\n` +
        (shortUrl ? `• Short Link: ${shortUrl}\n` : "") +
        `━━━━━━━━━━━━━━━━━\n` +
        `⚡ Operator: ${operator}`;

      await message.reply({
        body: bodyMsg,
        attachment: stream
      });

      if (api && api.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }

    } catch (err) {
      console.error("[GPTIMG ERROR]:", err);
      if (fs.existsSync(tmpFile)) fs.unlink(tmpFile, () => {});
      if (api && api.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      }
      return message.reply(`❌ GPT Image generation failed: ${err.message || err}`);
    }
  }
};
