const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "4k",
    version: "0.0.7",
    author: "Azadx69x",
    cooldown: 5,
    role: 0,
    shortDescription: { en: "Upscale image to 4K" },
    longDescription: { en: "Reply to any image to upscale it to 4K quality" },
    category: "image",
    guide: { en: "Reply to an image: {pn}" }
  },
  onStart: async function ({ api, event, message }) {
    let lid;
    try {
      const img = event.type === "message_reply" && event.messageReply.attachments?.[0]?.url;
      if (!img) return message.reply("❌ Please reply to an image.");
      const m = await message.reply("😺 4K Processing...\n⏳ Please Wait...");
      lid = m.messageID;
      const res = await axios.get(`https://azadx69x-4k-apis.vercel.app/api/4k?imgUrl=${encodeURIComponent(img)}`, { timeout: 60000 });
      if (res.data.status !== "success" || !res.data.upscaledImage) throw new Error("Upscale failed");
      const imgStream = await axios({ method: "GET", url: res.data.upscaledImage, responseType: "stream", timeout: 30000 });
      const cache = path.join(__dirname, "cache");
      if (!fs.existsSync(cache)) fs.mkdirSync(cache, { recursive: true });
      const file = path.join(cache, `up_${Date.now()}.jpg`);
      const writer = fs.createWriteStream(file);
      imgStream.data.pipe(writer);
      writer.on("finish", async () => {
        api.setMessageReaction("✅", event.messageID, () => {}, true);
        if (lid) await api.unsendMessage(lid);
        await message.reply({ body: "✅ Image Upscaled To 4K Successfully!", attachment: fs.createReadStream(file) });
        try { fs.unlinkSync(file); } catch {}
      });
      writer.on("error", async () => { if (lid) await api.unsendMessage(lid); message.reply("❌ Failed To Save Image."); });
    } catch (e) {
      console.error(e.message);
      if (lid) await api.unsendMessage(lid);
      message.reply("❌ 4K Upscale Failed. Try Again.");
    }
  }
};
