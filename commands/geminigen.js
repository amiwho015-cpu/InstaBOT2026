const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "geminigen",
    author: "frnAlt",
    usage: "[prompt] or reply to image",
    cooldown: 5,
    category: "image generator" 
  },

  onStart: async function ({ api, event, args, threadsData, usersData }) {
    const { messageID, threadID, senderID, messageReply } = event;
    const prefix = await threadsData.get(threadID, "data.prefix") || global.GoatBot.config.prefix;

    // ✅ Help Panel
    if (args[0]?.toLowerCase() === "help") {
      return api.sendMessage(
`╔══ 🎨 𝗚𝗘𝗠𝗜𝗡𝗜𝗚𝗘𝗡 𝗛𝗘𝗟𝗣 ══╗
┃
┃ ✏️ 𝗨𝘀𝗲: ${prefix}geminigen [prompt]
┃ 📎 𝗢𝗿: reply to image with prompt
┃
┃ 🔧 𝗬𝗼𝘂 𝗰𝗮𝗻 𝗴𝗲𝗻𝗲𝗿𝗮𝘁𝗲:
┃ ━━━━━━━━━━━━━━━
┃ 🧠 AI art with text
┃ 🧙 Anime style face
┃ 👧 Pixar cartoon me
┃ 😈 Demon version
┃ 💀 Zombie mode
┃ 🔄 Add glow effect
┃ 🎨 Make black-white
┃ 🔥 Fire background
┃ 🌸 Sakura overlay
┃
┃ 🔁 Example:
┃ ${prefix}geminigen cat warrior
┃ ${prefix}geminigen cartoon me (reply)
┃
╚════════════════════╝`,
        threadID, messageID
      );
    }

    // 📝 Prompt Section
    let prompt = args.join(" ");
    if (!prompt && messageReply?.body) prompt = messageReply.body;

    if (!prompt) {
      return api.sendMessage(
`⚠️ Please provide a prompt.
📝 Try:
• ${prefix}geminigen alien face
• ${prefix}geminigen cartoon me (reply to image)
ℹ️ Type "${prefix}geminigen help" for all styles.`,
        threadID, messageID
      );
    }

    // 💾 Save last prompt (optional)
    await usersData.set(senderID, prompt, "data.lastGeminiPrompt");

    // 📷 Get reply image (optional)
    let imageURL = null;
    if (global.utils && typeof global.utils.extractImageUrl === "function") {
      imageURL = global.utils.extractImageUrl(event, [], { allowAvatar: false });
    }
    if (!imageURL && messageReply?.attachments?.length > 0) {
      for (const a of messageReply.attachments) {
        const u = a.url || a.largePreviewUrl || a.large_preview_url || a.previewUrl || a.preview_url || a.thumbnailUrl || a.thumbnail_url || a.image || a.photoUrl || a.image_data?.url;
        if (u) { imageURL = u; break; }
      }
    }

    const apiUrl = imageURL
      ? `https://edit-and-gen.onrender.com/gen?prompt=${encodeURIComponent(prompt)}&image=${encodeURIComponent(imageURL)}`
      : `https://edit-and-gen.onrender.com/gen?prompt=${encodeURIComponent(prompt)}`;

    // ⏳ Send waiting message
    api.sendMessage("🎨 𝗣𝗿𝗼𝗰𝗲𝘀𝘀𝗶𝗻𝗴, 𝗽𝗹𝗲𝗮𝘀𝗲 𝘄𝗮𝗶𝘁...", threadID, async (err, info) => {
      const waitMsgID = info.messageID;

      try {
        const res = await axios.get(apiUrl, { responseType: "stream" });

        // 🖼️ Send final image
        api.sendMessage({
          body: `✅ 𝗜𝗺𝗮𝗴𝗲 ${imageURL ? "𝗘𝗱𝗶𝘁𝗲𝗱" : "𝗚𝗲𝗻𝗲𝗿𝗮𝘁𝗲𝗱"} 𝗳𝗿𝗼𝗺 𝗣𝗿𝗼𝗺𝗽𝘁:\n🖋️ "${prompt}"`,
          attachment: res.data
        }, threadID, messageID);

        // 🧽 Auto delete waiting
        api.unsendMessage(waitMsgID);

      } catch (err) {
        console.error("❌ Gemini error:", err.message);
        api.unsendMessage(waitMsgID);
        api.sendMessage("❌ Failed to process image. Try again later.", threadID, messageID);
      }
    });
  }
};