const axios = require("axios");
const yts = require("yt-search");
const btch = require("btch-downloader");

const client = axios.create({ timeout: 30000 });

async function getYouTubeVideo(youtubeUrl, titleFallback = "") {
  // 1. Primary: btch-downloader
  try {
    const res = await btch.youtube(youtubeUrl);
    if (res && res.status !== false) {
      return {
        videoUrl: res.mp4,
        audioUrl: res.mp3,
        title: res.title || titleFallback || "YouTube Video",
        duration: res.duration || "N/A"
      };
    }
  } catch (err) {
    console.warn("[YTDL] btch.youtube primary failed:", err.message);
  }

  // 2. Secondary fallback
  try {
    const mirrorUrl = `https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const { data } = await client.get(mirrorUrl, { timeout: 20000 });
    if (data?.status && (data?.data?.dl || data?.data?.url)) {
      return {
        videoUrl: data.data.dl || data.data.url,
        title: data.data.title || titleFallback || "YouTube Video",
        duration: "N/A"
      };
    }
  } catch (err) {
    console.warn("[YTDL] Secondary mirror failed:", err.message);
  }

  return null;
}

module.exports = {
  config: {
    name: "ytdl",
    aliases: ["video", "ytvideo"],
    version: "2.0.0",
    author: "frnAlt",
    cooldown: 5,
    role: 0,
    shortDescription: { en: "Download YouTube videos" },
    longDescription: { en: "Search or download YouTube videos directly in MP4 format or MP3 audio" },
    category: "media",
    guide: { en: "{pn} <video name or YouTube URL>\n{pn} -a <query> (audio only)" }
  },

  onStart: async function ({ message, args, event, api, commandName }) {
    if (!args[0]) {
      return message.reply("❌ Please provide a YouTube video title or link.\nExample: {p}ytdl Alan Walker Faded");
    }

    let isAudioOnly = false;
    let query = args.join(" ").trim();

    if (args[0] === "-a" || args[0] === "--audio") {
      isAudioOnly = true;
      query = args.slice(1).join(" ").trim();
    }

    if (!query) {
      return message.reply("❌ Please provide a search query or YouTube link.");
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("🎥", event.messageID, () => {}, true);
    }

    const isYtUrl = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(query);

    // Mode 1: Direct YouTube URL
    if (isYtUrl) {
      try {
        const media = await getYouTubeVideo(query);
        const downloadUrl = isAudioOnly ? (media?.audioUrl || media?.videoUrl) : media?.videoUrl;

        if (!downloadUrl) {
          if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
          return message.reply("❌ Could not extract video stream from this link.");
        }

        const ext = isAudioOnly ? "mp3" : "mp4";
        const stream = await global.utils.getStreamFromURL(downloadUrl, `ytdl_${Date.now()}.${ext}`);

        if (api.setMessageReaction) api.setMessageReaction("👍", event.messageID, () => {}, true);

        return message.reply({
          attachment: stream
        });
      } catch (err) {
        console.error("[YTDL] Direct download error:", err.message);
        if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
        return message.reply(`❌ Download failed: ${err.message || err}`);
      }
    }

    // Mode 2: YouTube Search with reply selection
    try {
      const searchRes = await yts(query);
      const videos = searchRes?.videos || [];

      if (videos.length === 0) {
        if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
        return message.reply(`❌ No videos found for "${query}".`);
      }

      const results = videos.slice(0, 6).map(v => ({
        title: v.title,
        url: v.url,
        duration: v.timestamp || "N/A",
        thumbnail: v.thumbnail,
        author: v.author?.name || "Unknown"
      }));

      let msg = `🎬 YouTube Search: "${query}"\n\n`;
      const thumbnailPromises = [];

      results.forEach((item, index) => {
        msg += `${index + 1}. ${item.title}\n[⏱️ ${item.duration} | 👤 ${item.author}]\n\n`;
        if (item.thumbnail) {
          thumbnailPromises.push(
            global.utils.getStreamFromURL(item.thumbnail, `ytdl_thumb_${index}.jpg`).catch(() => null)
          );
        }
      });

      msg += `👉 Reply with a number (1-${results.length}) to download the video!\nAdd "audio" or "-a" (e.g. "1 audio") for MP3.`;

      const thumbnails = (await Promise.all(thumbnailPromises)).filter(Boolean);

      message.reply(
        { body: msg.trim(), attachment: thumbnails },
        (err, info) => {
          if (err || !info) return;
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            author: event.senderID,
            threadID: event.threadID,
            timestamp: Date.now(),
            results
          });
        }
      );
    } catch (err) {
      console.error("[YTDL] Search error:", err.message);
      if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
      return message.reply("❌ Search error. Please try again later.");
    }
  },

  onReply: async function ({ message, event, Reply, api }) {
    if (String(event.senderID) !== String(Reply.author)) return;

    const bodyText = String(event.body || "").trim().toLowerCase();
    const wantAudio = bodyText.includes("audio") || bodyText.includes("mp3") || bodyText.includes("-a");

    const match = bodyText.match(/\d+/);
    const choice = match ? parseInt(match[0], 10) : NaN;

    if (isNaN(choice) || choice < 1 || choice > Reply.results.length) {
      return message.reply(`❌ Invalid choice. Reply with a number from 1 to ${Reply.results.length}.`);
    }

    const selected = Reply.results[choice - 1];

    if (api.unsendMessage && event.messageReply?.messageID) {
      api.unsendMessage(event.messageReply.messageID).catch(() => {});
    }

    if (api.setMessageReaction) {
      api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    try {
      const media = await getYouTubeVideo(selected.url, selected.title);
      const downloadUrl = wantAudio ? (media?.audioUrl || media?.videoUrl) : media?.videoUrl;

      if (!downloadUrl) {
        if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
        return message.reply(`❌ Could not fetch video stream for "${selected.title}".`);
      }

      const ext = wantAudio ? "mp3" : "mp4";
      const stream = await global.utils.getStreamFromURL(downloadUrl, `ytdl_${Date.now()}.${ext}`);

      await message.reply({
        attachment: stream
      });

      if (api.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }
    } catch (err) {
      console.error("[YTDL] onReply download error:", err.message);
      if (api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
      message.reply("❌ Failed to download video. The file may exceed Facebook size limits or the stream is unavailable.");
    }
  }
};
