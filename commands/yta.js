const axios = require("axios");

module.exports = {
  config: {
    name: "yta",
    aliases: ["yta2", "ytaudio", "ytmp3", "ytaudiodl"],
    version: "2.0.0",
    author: "frnAlt",
    cooldown: 5,
    role: 0,
    shortDescription: {
      en: "Download or search YouTube audio"
    },
    longDescription: {
      en: "Download audio directly from YouTube link or search songs and choose via reply using Toshiro YTA2 API"
    },
    category: "media",
    guide: {
      en: "{pn} <YouTube URL>\n{pn} <song name / query>"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    const input = args.join(" ").trim();
    if (!input) {
      const prefix = global.GoatBot?.config?.prefix || "";
      return message.reply(
        `❌ Please provide a song name or YouTube URL.\n\n💡 Example:\n• ${prefix}${commandName} believer\n• ${prefix}${commandName} https://youtu.be/...`
      );
    }

    const isUrl = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(input);

    if (api.setMessageReaction) {
      api.setMessageReaction("🎵", event.messageID, () => {}, true);
    }

    if (isUrl) {
      // Direct URL download mode
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?url=${encodeURIComponent(input)}`;
        const res = await axios.get(apiUrl, { timeout: 45000 });

        if (!res.data || !res.data.success || !res.data.result) {
          if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
          return message.reply("❌ Could not extract audio from this YouTube link.");
        }

        const { title, download_url, preview, quality } = res.data.result;
        const audioUrl = download_url || preview;

        if (!audioUrl) {
          if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
          return message.reply("❌ Download URL not available.");
        }

        const audioStream = await global.utils.getStreamFromURL(audioUrl, "audio.mp3");

        await message.reply({
          attachment: audioStream
        });

        if (api.setMessageReaction) {
          api.setMessageReaction("👍", event.messageID, () => {}, true);
        }
      } catch (err) {
        console.error("YTA direct error:", err);
        if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
        return message.reply(`❌ Failed to download YouTube audio: ${err.message || err}`);
      }
    } else {
      // Search mode
      try {
        const searchApiUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?search=${encodeURIComponent(input)}`;
        const res = await axios.get(searchApiUrl, { timeout: 30000 });

        if (!res.data || !res.data.success || !res.data.results || res.data.results.length === 0) {
          if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
          return message.reply(`❌ No results found for "${input}".`);
        }

        const results = res.data.results.slice(0, 6);
        let msg = `🔎 Search results for "${input}":\n\n`;
        const thumbnailPromises = [];

        results.forEach((item, index) => {
          msg += `${index + 1}. ${item.title}\n⏱️ Duration: ${item.duration || "N/A"} | 👁️ Views: ${(item.views || 0).toLocaleString()}\n\n`;
          if (item.thumbnail) {
            thumbnailPromises.push(
              global.utils.getStreamFromURL(item.thumbnail, `thumb_${index}.jpg`).catch(() => null)
            );
          }
        });

        msg += `👉 Reply with the number (1-${results.length}) to download audio.`;

        const thumbnails = (await Promise.all(thumbnailPromises)).filter(Boolean);

        message.reply(
          {
            body: msg.trim(),
            attachment: thumbnails
          },
          (err, info) => {
            if (err) return;
            global.GoatBot.onReply.set(info.messageID, {
              commandName,
              author: event.senderID,
              results
            });
          }
        );
      } catch (err) {
        console.error("YTA search error:", err);
        if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
        return message.reply(`❌ Failed to search YouTube: ${err.message || err}`);
      }
    }
  },

  onReply: async function ({ api, event, Reply, message }) {
    if (event.senderID !== Reply.author) return;

    const selection = parseInt(event.body);
    if (isNaN(selection) || selection < 1 || selection > Reply.results.length) {
      return message.reply(`❌ Invalid choice. Please choose a number between 1 and ${Reply.results.length}.`);
    }

    const selected = Reply.results[selection - 1];

    if (api.unsendMessage && event.messageReply?.messageID) {
      api.unsendMessage(event.messageReply.messageID);
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    try {
      const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/downloader/yta2?url=${encodeURIComponent(selected.url)}`;
      const res = await axios.get(apiUrl, { timeout: 60000 });

      if (!res.data || !res.data.success || !res.data.result) {
        if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
        return message.reply(`❌ Failed to download audio for "${selected.title}".`);
      }

      const { title, download_url, preview, quality } = res.data.result;
      const audioUrl = download_url || preview;

      if (!audioUrl) {
        if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
        return message.reply("❌ Download URL not available.");
      }

      const audioStream = await global.utils.getStreamFromURL(audioUrl, "audio.mp3");

      await message.reply({
        attachment: audioStream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("YTA onReply error:", err);
      if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
      return message.reply(`❌ Error downloading audio: ${err.message || err}`);
    }
  }
};
