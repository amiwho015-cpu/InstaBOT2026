const axios = require("axios");

module.exports = {
  config: {
    name: "prompt",
    aliases: ["p"],
    version: "0.0.5",
    role: 0,
    author: "Azadx69x",
    category: "ai",
    cooldowns: 3,
    guide: { en: "Reply to an image to generate an AI prompt" }
  },
  onStart: async ({ api, event }) => {
    const { threadID, messageID, messageReply } = event;
    const attachment = messageReply?.attachments?.[0] || event.attachments?.[0];
    const img = attachment?.url || attachment?.previewUrl || attachment?.largePreviewUrl;
    if (!img) return api.sendMessage("⚠️ Reply to an image.", threadID, messageID);
    try { api.setMessageReaction("⏳", messageID, () => {}, true); } catch {}
    try {
      const res = await axios.get(`https://azadx69x.is-a.dev/api/prompt?url=${encodeURIComponent(img)}`);
      const prompt = res.data?.data?.data?.prompt || res.data?.data?.prompt || res.data?.prompt;
      if (!prompt) throw new Error("No prompt found.");
      await api.sendMessage(`🐦 Generated Prompt:\n\n${prompt}`, threadID, messageID);
      try { api.setMessageReaction("✅", messageID, () => {}, true); } catch {}
    } catch (e) {
      try { api.setMessageReaction("❌", messageID, () => {}, true); } catch {}
      const error = e.response?.data?.error || e.response?.data?.message || e.message || "Error generating prompt.";
      await api.sendMessage(error, threadID, messageID);
    }
  }
};
