const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "bonk",
    version: "1.0.0",
    author: "frnAlt",
    cooldown: 5,
    role: 0,
    shortDescription: {
      en: "Bonk someone"
    },
    longDescription: {
      en: "Create a bonk canvas with target and your PFP"
    },
    category: "fun",
    guide: {
      en: "{pn} @mention\n{pn} (reply to a user)"
    }
  },

  onStart: async function ({ api, event, message, args, usersData }) {
    try {
      let one = String(event.senderID);
      let two = null;
      const mentions = event.mentions ? Object.keys(event.mentions) : [];

      if (mentions.length >= 2) {
        one = mentions[0];
        two = mentions[1];
      } else if (mentions.length === 1) {
        two = mentions[0];
        if (event.messageReply) {
          const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
          if (rUid && rUid !== two) one = String(rUid);
        }
      } else if (event.messageReply) {
        const rUid = event.messageReply.senderID || event.messageReply.actorFbId;
        if (rUid) two = String(rUid);
      } else if (args && args.length >= 2 && /^\d+$/.test(args[0]) && /^\d+$/.test(args[1])) {
        one = args[0];
        two = args[1];
      } else if (args && args.length >= 1 && /^\d+$/.test(args[0])) {
        two = args[0];
      }

      // Fallback: name search if mentions omitted
      if (!two && args && args.length > 0) {
        const raw = args.join(" ").replace(/^@/, "").trim().toLowerCase();
        let found = global.db?.allUserData?.find(u => u.name && (u.name.toLowerCase().includes(raw) || raw.includes(u.name.toLowerCase())));
        if (!found) {
          const allM = global.db?.allThreadData?.find(t => t.threadID == event.threadID)?.members || [];
          found = allM.find(m => m.name && (m.name.toLowerCase().includes(raw) || raw.includes(m.name.toLowerCase())));
        }
        if (!found && api?.getThreadInfo && event.threadID) {
          try {
            const tInfo = await api.getThreadInfo(event.threadID);
            const p = tInfo?.userInfo || [];
            if (Array.isArray(p)) {
              found = p.find(m => m.name && (m.name.toLowerCase().includes(raw) || raw.includes(m.name.toLowerCase())));
            }
          } catch (_) {}
        }
        if (found) two = String(found.userID || found.id);
      }

      if (!two) {
        return message.reply("👤 Please reply to or mention someone to bonk!");
      }

      const targetName = event.mentions?.[two]?.replace(/^@/, "").trim() || (await usersData.getName(two).catch(() => null)) || "Target";
      const senderName = (await usersData.getName(one).catch(() => null)) || "Sender";
      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const avatar1 = `https://graph.facebook.com/${two}/picture?width=720&height=720&access_token=${token}`;
      const avatar2 = `https://graph.facebook.com/${one}/picture?width=720&height=720&access_token=${token}`;

      let stream = null;
      try {
        const apiUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/bonk?avatar1=${encodeURIComponent(avatar1)}&avatar2=${encodeURIComponent(avatar2)}`;
        stream = await global.utils.getStreamFromURL(apiUrl, "bonk.png", { timeout: 20000 });
      } catch (_) {
        // Fallback using Jimp
      }

      if (!stream) {
        try {
          const { Jimp } = require("jimp");
          const { Readable } = require("stream");
          const bg = new Jimp({ width: 700, height: 350, color: 0x222233ff });
          const avTarget = await Jimp.read(avatar1).catch(() => null);
          const avSender = await Jimp.read(avatar2).catch(() => null);
          if (avSender) {
            avSender.resize({ w: 120, h: 120 }).circle();
            bg.composite(avSender, 80, 115);
          }
          if (avTarget) {
            avTarget.resize({ w: 120, h: 120 }).circle();
            bg.composite(avTarget, 480, 115);
          }
          const buf = await bg.getBuffer("image/png");
          stream = Readable.from(buf);
          stream.path = "bonk.png";
        } catch (_) {}
      }

      return message.reply({
        body: `🔨 Bonk! ${senderName} bonked ${targetName}! 💥`,
        ...(stream ? { attachment: stream } : {})
      });

    } catch (error) {
      console.error("Bonk error:", error.message);
      return message.reply(`❌ Failed to bonk: ${error.message}`);
    }
  }
};