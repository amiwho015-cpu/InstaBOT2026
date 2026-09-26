const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

module.exports = {
  config: {
    name: 'midjourney',
    aliases: ["mj"],
    version: '1.0.0',
    author: 'Azadx69x',
    cooldown: 15,
    role: 0,
    shortDescription: { en: 'Generate Image using Midjourney!' },
    category: 'ai',
    usePrefix: true,
    guide: { en: "{pn} [prompt] --ar [aspect]\nExample: {pn} a sunset over ocean --ar 16:9" }
  },

  onStart: async function ({ api, event, args, message }) {
    if (!args[0]) return message.reply("• Please provide a prompt.");

    const fullInput = args.join(" ");
    const aspectMatch = fullInput.match(/--ar\s+(\d+:\d+)/);
    const aspect = aspectMatch ? aspectMatch[1] : "1:1";
    const basePrompt = fullInput.replace(/--ar\s+\d+:\d+/, "").trim();

    try {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);

      const configRes = await axios.get("https://azadx69x.is-a.dev/api", { timeout: 15000 });
      const apiUrl = configRes.data.m;
      if (!apiUrl) throw new Error("Could not fetch API base URL.");

      const res = await axios.get(`${apiUrl}/mj?prompt=${encodeURIComponent(basePrompt)}`, { timeout: 120000 });
      let images = res.data[0]?.result?.info?.imageUrl;

      if (!images) throw new Error("No imageUrl returned.");
      if (typeof images === "string") images = [images];
      if (images.length < 4) throw new Error("Not enough images received (need 4).");

      const loadedImages = await Promise.all(images.slice(0, 4).map(i => loadImage(i)));

      const w = Math.max(...loadedImages.map(i => i.width));
      const h = Math.max(...loadedImages.map(i => i.height));

      const canvas = createCanvas(w * 2, h * 2);
      const ctx = canvas.getContext('2d');

      ctx.drawImage(loadedImages[0], 0, 0, w, h);
      ctx.drawImage(loadedImages[1], w, 0, w, h);
      ctx.drawImage(loadedImages[2], 0, h, w, h);
      ctx.drawImage(loadedImages[3], w, h, w, h);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const fullImagePath = path.join(cacheDir, `mj_grid_${event.threadID}.png`);
      fs.writeFileSync(fullImagePath, canvas.toBuffer('image/png'));

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      const msg = await message.reply({
        body: "✨ Image Generated!\n📝 Prompt: " + basePrompt + "\n\n• Reply with 1, 2, 3 or 4 to get your image.",
        attachment: fs.createReadStream(fullImagePath)
      });

      global.GoatBot.onReply.set(msg.messageID, {
        commandName: this.config.name,
        author: event.senderID,
        gridPath: fullImagePath
      });

    } catch (err) {
      console.error("Midjourney Error:", err.message);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("❌ Error generating image.\n🔁 Please try again!\n\n⚠️ " + err.message);
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    const { author, gridPath } = Reply;
    if (event.senderID !== author) return;

    const choice = event.body.trim();
    if (!["1", "2", "3", "4"].includes(choice))
      return message.reply("• Invalid reply. Please reply with 1, 2, 3, or 4.");

    try {
      const gridImage = await loadImage(gridPath);
      const w = gridImage.width / 2;
      const h = gridImage.height / 2;
      const canvas = createCanvas(w, h);
      const ctx = canvas.getContext('2d');

      const positions = { "1": [0, 0], "2": [w, 0], "3": [0, h], "4": [w, h] };
      const [sx, sy] = positions[choice];
      ctx.drawImage(gridImage, sx, sy, w, h, 0, 0, w, h);

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

      const cropPath = path.join(cacheDir, `mj_crop_${event.threadID}_${choice}.png`);
      fs.writeFileSync(cropPath, canvas.toBuffer('image/png'));

      api.setMessageReaction("✅", event.messageID, () => {}, true);

      await message.reply({
        body: "✨ Here's your image No. " + choice,
        attachment: fs.createReadStream(cropPath)
      });

      setTimeout(() => {
        try { fs.unlinkSync(cropPath); } catch {}
        try { fs.unlinkSync(gridPath); } catch {}
      }, 3600000);

    } catch (err) {
      console.error("Midjourney onReply Error:", err.message);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
      message.reply("❌ Failed to send the selected image.");
    }
  }
};
