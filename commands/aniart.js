const axios = require('axios');
const baseApiUrl = async () => {
    const base = await axios.get("https://gitlab.com/Rakib-Adil-69/shizuoka-command-store/-/raw/main/apiUrls.json");
    return base.data.aniart;
};

module.exports = {
  config: {
    name: "aniart",
    aliases: ["anigen", "animeart"],
    author: "frnAlt",
    version: "1.0.0",
    cooldown: 10,
    description: "Generate anime art image from a prompt",
    guide: "{pn} <prompt>",
    category: "Ai"
  },

  onStart: async function ({ api, args, event, message}) {
    const prompt = args.join(" ").trim();
    if (!prompt) return api.sendMessage(
      `Please provide a prompt to generate anime art image or use: \n {pn}aniart <prompt> or \n {pn}aniart cyberpunk anime girl`, event.threadID, event.messageID);

    api.setMessageReaction("⏳", event.messageID, (err) => {}, true);

    try {
      const enhancedPrompt = `${prompt}, anime aesthetic, beautiful anime art illustration, vibrant colors`;
      const seed = Math.floor(Math.random() * 1000000);
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=768&height=768&nologo=true&seed=${seed}&model=turbo`;

      const stream = await global.utils.getStreamFromURL(url, `aniart_${Date.now()}.png`, { timeout: 15000 });

      api.setMessageReaction("👍", event.messageID, (err) => {}, true);
      await api.sendMessage({
        body: `✨ Anime Art generated:\n"${prompt}"`,
        attachment: stream
      }, event.threadID, event.messageID);
    } catch (err) {
      console.log(err);
      api.setMessageReaction("👎", event.messageID, (err) => {}, true);
      api.sendMessage('An error occurred while generating your anime art, please try again later..🙂', 
                      event.threadID,
                      event.messageID);
    }
  }
};