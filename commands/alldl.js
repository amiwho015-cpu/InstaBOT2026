"use strict";

/**
 * Universal Media Downloader Command (alldl)
 * Downloads video/audio from TikTok, YouTube, Instagram, Facebook, Twitter, and other platforms.
 */

const axios = require("axios");
const ytdl = require("@distube/ytdl-core");
const fs = require("fs-extra");
const path = require("path");

const { extractMediaUrl, compressAudioFile } = require("../src/utils");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MAX_BYTES = Math.max(256 * 1024, Number(process.env.IG_MAX_MEDIA_BYTES) || 45 * 1024 * 1024);

async function downloadMediaBuffer(url) {
  const headers = {
    "User-Agent": USER_AGENT,
    "Accept": "*/*"
  };
  try {
    if (new URL(url).hostname.includes("tiktok")) headers.Referer = "https://www.tiktok.com/";
  } catch (_) {}

  try {
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 25000,
      maxContentLength: MAX_BYTES,
      headers
    });
    if (res.status === 200 && res.data && res.data.length > 0) {
      return Buffer.from(res.data);
    }
  } catch (err) {
    if (headers.Referer) {
      delete headers.Referer;
      const retryRes = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 25000,
        maxContentLength: MAX_BYTES,
        headers
      });
      if (retryRes.status === 200 && retryRes.data && retryRes.data.length > 0) {
        return Buffer.from(retryRes.data);
      }
    }
    throw err;
  }
  throw new Error("Empty response from media CDN");
}

module.exports = {
  config: {
    name: "alldl",
    aliases: ["download", "dl", "getmedia", "anydl"],
    version: "2.6.0",
    author: "Gtajisan & frnAlt & lazyneoaz",
    cooldown: 5,
    role: 0,
    shortDescription: {
      en: "Universal media downloader for social links"
    },
    longDescription: {
      en: "Downloads video or audio from TikTok, YouTube, Instagram, Facebook, Pinterest, Twitter/X and 40+ platforms."
    },
    category: "media",
    usage: "{p}alldl <url> [-a | --audio]\nReply to a message with a link: {p}alldl [-a | --audio]"
  },

  onStart: async function ({ message, args, event, api, commandName }) {
    const threadID = event.threadId || event.threadID;
    const audioFlags = ["--audio", "-audio", "-a", "--a", "-mp3", "--mp3"];
    const isAudio = args.some(a => audioFlags.includes(String(a).toLowerCase()));
    let url = args.find(a => /^https?:\/\//i.test(a));

    const reply = event.messageReply || event.repliedMessage;
    if (!url && reply && (reply.body || reply.text)) {
      const text = reply.body || reply.text;
      const urlMatch = text.match(/https?:\/\/[^\s]+/i);
      if (urlMatch) {
        url = urlMatch[0];
      }
    }
    if (!url) {
      url = extractMediaUrl(event, args);
    }

    if (!url) {
      const prompt = "📥 𝗨𝗻𝗶𝘃𝗲𝗿𝘀𝗮𝗹 𝗠𝗲𝗱𝗶𝗮 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱𝗲𝗿\n\n📌 Usage:\n• {p}alldl <url>\n• {p}alldl -a <url> (Extract audio)\n• {p}alldl <url> --audio\n• Reply to any message containing a video link with {p}alldl -a\n\n💡 Supported: TikTok, YouTube, Instagram, Facebook, Twitter/X, Pinterest, Reddit, etc.";
      return message ? message.reply(prompt) : api.sendMessage(prompt, threadID);
    }

    if (message && typeof message.react === "function") {
      message.react("⏳").catch(() => {});
    } else if (api && typeof api.setMessageReaction === "function") {
      api.setMessageReaction("⏳", event.messageID, event.threadID, () => {}, true);
    }

    let tempFilePath = null;

    try {
      let downloadUrl = null;
      let title = "Media Download";

      // 1. YouTube Native Direct Stream Fast-Path
      if (ytdl.validateURL(url)) {
        try {
          const tempDir = path.join(process.cwd(), "temp");
          await fs.ensureDir(tempDir);
          tempFilePath = path.join(tempDir, `alldl_${Date.now()}_${Math.random().toString(36).substring(7)}.${isAudio ? "mp3" : "mp4"}`);
          const stream = ytdl(url, {
            filter: isAudio ? "audioonly" : "videoandaudio",
            quality: isAudio ? "highestaudio" : "highestvideo"
          });
          const writer = fs.createWriteStream(tempFilePath);
          stream.pipe(writer);
          await new Promise((resolve, reject) => {
            writer.on("finish", resolve);
            writer.on("error", reject);
            stream.on("error", reject);
          });
          if ((await fs.stat(tempFilePath)).size > 1000) {
            title = "YouTube Media";
          } else {
            await fs.unlink(tempFilePath).catch(() => {});
            tempFilePath = null;
          }
        } catch (_) {
          if (tempFilePath) await fs.unlink(tempFilePath).catch(() => {});
          tempFilePath = null;
        }
      }

      // 2–7. Provider APIs. Previously these six ran SEQUENTIALLY: a link that
      // every provider failed on stacked up to ~95s of timeouts before the
      // error surfaced (the long ⏳ hang). They now all race in parallel and
      // the first usable download URL wins.
      if (!downloadUrl && !tempFilePath) {
        const enc = encodeURIComponent(url);
        const providers = [
          // Ryzendesu (YouTube audio)
          /youtu\.?be/i.test(url) && !isAudio === false ? (async () => {
            const r = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${enc}`, { timeout: 12000 });
            const u = r.data?.url || r.data?.downloadUrl || r.data?.data?.url;
            if (u) return { url: u, title: "YouTube Audio" };
            throw new Error("ryz: none");
          })() : null,
          // TikTok fast path
          /tiktok\.com/i.test(url) ? (async () => {
            const r = await axios.get(`https://www.tikwm.com/api/?url=${enc}`, { timeout: 12000 });
            const d = r.data?.data;
            if (d) return { url: isAudio ? (d.music || d.play) : (d.play || d.wmplay), title: d.title || "TikTok Video" };
            throw new Error("tikwm: none");
          })() : null,
          // NeoKEX universal
          async () => {
            const r = await axios.get(`https://alldl.neokex.xyz/api/alldl?url=${enc}`, { timeout: 18000 });
            const data = (r.data && (r.data.metadata?.data || r.data.data)) || r.data;
            const downloads = (data && data.downloads) || [];
            if (!downloads.length) throw new Error("neokex: none");
            let dl;
            if (isAudio) dl = downloads.find(d => String(d.label || d.ext).toLowerCase().includes("audio") || d.ext === "mp3") || downloads[0];
            else dl = downloads.find(d => d.ext === "mp4" && !String(d.label).toLowerCase().includes("audio")) || downloads.find(d => !String(d.label).toLowerCase().includes("audio")) || downloads[0];
            if (!dl?.url) throw new Error("neokex: no url");
            return { url: dl.url, title: data.title || title };
          },
          // Kaiz
          async () => {
            const r = await axios.get(`https://kaiz-apis.gleeze.com/api/alldl?url=${enc}`, { timeout: 18000 });
            const d = r.data;
            const u = d && (isAudio ? (d.audio || d.url || d.video) : (d.video || d.url || d.hd || d.sd));
            if (u) return { url: u, title: d.title || title };
            throw new Error("kaiz: none");
          },
          // Siputzx
          async () => {
            const r = await axios.get(`https://api.siputzx.my.id/api/d/all?url=${enc}`, { timeout: 12000 });
            const data = r.data?.data || r.data?.result;
            const u = data && (isAudio ? (data.audio || data.url || data.video) : (data.video || data.url || data.hd || data.sd));
            if (u) return { url: u, title: (data && data.title) || title };
            throw new Error("siputzx: none");
          },
          // Cobalt
          async () => {
            const r = await axios.post(`https://api.cobalt.tools/api/json`, {
              url,
              downloadMode: isAudio ? "audio" : "auto"
            }, {
              headers: { Accept: "application/json", "Content-Type": "application/json" },
              timeout: 12000
            });
            if (r.data?.url) return { url: r.data.url, title };
            throw new Error("cobalt: none");
          }
        ].filter(Boolean);

        const results = await Promise.allSettled(providers.map(p => (typeof p === "function" ? p() : p)));
        const winner = results.find(r => r.status === "fulfilled" && r.value?.url);
        if (winner) {
          downloadUrl = winner.value.url;
          title = winner.value.title || title;
        }
      }

      if (!downloadUrl && !tempFilePath) {
        throw new Error("Unable to extract downloadable stream from this URL");
      }

      if (!tempFilePath && downloadUrl) {
        try {
          const ext = isAudio ? "mp3" : "mp4";
          const tempDir = path.join(process.cwd(), "temp");
          await fs.ensureDir(tempDir);
          tempFilePath = path.join(tempDir, `alldl_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`);
          const buf = await downloadMediaBuffer(downloadUrl);
          await fs.writeFile(tempFilePath, buf);
        } catch (_) {
          if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(() => {});
            tempFilePath = null;
          }
        }
      }

      // Size compression for audio files exceeding Instagram Direct limits
      if (isAudio && tempFilePath) {
        tempFilePath = await compressAudioFile(tempFilePath);
      }

      if (message && typeof message.react === "function") {
        message.react("✅").catch(() => {});
      } else if (api && typeof api.setMessageReaction === "function") {
        api.setMessageReaction("✅", event.messageID, event.threadID, () => {}, true);
      }

      const attachment = tempFilePath
        ? { path: tempFilePath, type: isAudio ? "audio" : "video", mimetype: isAudio ? "audio/mp4" : undefined }
        : { url: downloadUrl, type: isAudio ? "audio" : "video", mimetype: isAudio ? "audio/mp4" : undefined };

      // Deliberately no body/caption: media-only delivery by design (tests
      // assert "no extra text"); the title is resolved but not sent.
      let sent = null;
      try {
        sent = await message.reply({
          attachment,
          textFirst: false
        });
      } catch (replyErr) {
        try {
          if (message && typeof message.send === "function") {
            sent = await message.send({
              attachment,
              textFirst: false
            });
          } else if (api && typeof api.sendMessage === "function") {
            sent = await api.sendMessage({
              attachment,
              textFirst: false
            }, threadID);
          } else {
            throw replyErr;
          }
        } catch (sendErr) {
          throw sendErr;
        }
      }

      if (tempFilePath) {
        setTimeout(() => fs.unlink(tempFilePath).catch(() => {}), 25000);
      }

      return sent;
    } catch (err) {
      if (tempFilePath) fs.unlink(tempFilePath).catch(() => {});
      if (message && typeof message.react === "function") {
        message.react("❌").catch(() => {});
      } else if (api && typeof api.setMessageReaction === "function") {
        api.setMessageReaction("❌", event.messageID, event.threadID, () => {}, true);
      }
      const errMsg = `❌ Download failed: ${err.message}. Please check if the link is public and valid.`;
      try {
        return await message.reply(errMsg);
      } catch (_) {
        if (message && typeof message.send === "function") {
          return await message.send(errMsg);
        } else if (api && typeof api.sendMessage === "function") {
          return await api.sendMessage(errMsg, threadID);
        }
      }
    }
  },

  run: async function (params) {
    return module.exports.onStart(params);
  }
};
