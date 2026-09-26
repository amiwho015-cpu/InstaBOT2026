const fs = require("fs-extra");
const path = require("path");
const { Readable } = require("stream");
const { createCanvas, loadImage, isCanvasAvailable } = require("../../func/canvasHelper.js");
const { Jimp } = require("jimp");

const ROMANTIC_CAPTIONS = [
  "💋 %1 pulled %2 close and planted a sweet kiss on their cheek! 💕",
  "😘 A warm, passionate kiss from %1 to %2! ✨💖",
  "💋 *Muah!* %1 showered %2 with gentle kisses! 🌸",
  "💕 %1 gently kissed %2 under the moonlight! 🌙✨",
  "💋 %1 couldn't resist and kissed %2 tenderly! 🥰"
];

module.exports = {
  config: {
    name: "kiss2",
    aliases: ["kissu", "muah", "romantic"],
    version: "2.0.0",
    author: "frnAlt",
    cooldown: 5,
    role: 0,
    shortDescription: { en: "Send a romantic kiss to someone via tap-to-reply or tag" },
    longDescription: "{p}kiss2 @user or tap-to-reply to someone to kiss them! 💋",
    category: "fun",
    guide: "{p}kiss2 @user or tap-to-reply to a message"
  },

  onStart: async function ({ api, message, event, args, usersData }) {
    let one = String(event.senderID);
    let two = null;
    const mentions = event.mentions ? Object.keys(event.mentions) : [];

    if (mentions.length >= 2) {
      one = mentions[0];
      two = mentions[1];
    } else if (mentions.length === 1) {
      two = mentions[0];
      if (event.messageReply) {
        const rUid = event.messageReply.senderID || event.messageReply.actorFbId || event.messageReply.userID;
        if (rUid && String(rUid) !== two) one = String(rUid);
      }
    } else if (event.messageReply) {
      const rUid = event.messageReply.senderID || event.messageReply.actorFbId || event.messageReply.userID;
      if (rUid) two = String(rUid);
    } else if (args && args.length >= 2 && /^\d+$/.test(args[0]) && /^\d+$/.test(args[1])) {
      one = args[0];
      two = args[1];
    } else if (args && args.length >= 1 && /^\d+$/.test(args[0])) {
      two = args[0];
    }

    // Name match fallback if mention was omitted
    if (!two && args && args.length > 0) {
      const raw = args.join(" ").replace(/^@/, "").trim().toLowerCase();
      const allM = global.db?.allThreadData?.find(t => t.threadID == event.threadID)?.members || [];
      const found = allM.find(m => m.name && m.name.toLowerCase().includes(raw)) ||
                    global.db?.allUserData?.find(u => u.name && u.name.toLowerCase().includes(raw));
      if (found) two = String(found.userID || found.id);
    }

    if (!two) {
      return message.reply("💋 Please tap-to-reply to someone or @mention the person you want to kiss!");
    }

    if (api?.setMessageReaction) {
      api.setMessageReaction("💋", event.messageID, () => {}, true);
    }

    try {
      const avatarURL1 = await usersData.getAvatarUrl(one);
      const avatarURL2 = await usersData.getAvatarUrl(two);
      const name1 = (await usersData.getName(one).catch(() => null)) || event.mentions?.[one]?.replace(/^@/, "").trim() || "You";
      const name2 = (await usersData.getName(two).catch(() => null)) || event.mentions?.[two]?.replace(/^@/, "").trim() || "Sweetheart";

      const template = ROMANTIC_CAPTIONS[Math.floor(Math.random() * ROMANTIC_CAPTIONS.length)];
      const caption = template.replace("%1", name1).replace("%2", name2);

      // 1. High quality Canvas Renderer
      if (isCanvasAvailable && typeof createCanvas === "function") {
        const canvas = createCanvas(880, 500);
        const ctx = canvas.getContext("2d");

        // Romantic twilight gradient background
        const grad = ctx.createLinearGradient(0, 0, 880, 500);
        grad.addColorStop(0, "#d53369");
        grad.addColorStop(0.5, "#c7365f");
        grad.addColorStop(1, "#da1b60");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 880, 500);

        // Glassmorphic overlay
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        if (typeof ctx.roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(35, 35, 810, 430, 28);
          ctx.fill();
        } else {
          ctx.fillRect(35, 35, 810, 430);
        }

        // Header Title
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 34px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("💋 SWEET KISS 💋", 440, 95);

        // Subtitle hearts
        ctx.font = "20px sans-serif";
        ctx.fillStyle = "#ffe4e6";
        ctx.fillText("✨ Love is in the air ✨", 440, 128);

        // Load avatars safely
        const av1 = await loadImage(avatarURL1).catch(() => null);
        const av2 = await loadImage(avatarURL2).catch(() => null);

        // Draw Avatar 1 (Left - Sender)
        if (av1) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(260, 260, 85, 0, Math.PI * 2);
          ctx.lineWidth = 6;
          ctx.strokeStyle = "#ffb6c1";
          ctx.stroke();
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(av1, 175, 175, 170, 170);
          ctx.restore();
        }

        // Animated kiss emblem in center
        ctx.font = "60px sans-serif";
        ctx.fillText("💋", 440, 275);
        ctx.font = "26px sans-serif";
        ctx.fillText("💖", 440, 220);

        // Draw Avatar 2 (Right - Receiver)
        if (av2) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(620, 260, 85, 0, Math.PI * 2);
          ctx.lineWidth = 6;
          ctx.strokeStyle = "#ff69b4";
          ctx.stroke();
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(av2, 535, 175, 170, 170);
          ctx.restore();
        }

        // Names below avatars
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText(name1.slice(0, 20), 260, 390);
        ctx.fillText(name2.slice(0, 20), 620, 390);

        const buffer = canvas.toBuffer("image/png");
        const stream = Readable.from(buffer);
        stream.path = "kiss2.png";

        return message.reply({
          body: caption,
          attachment: stream
        });
      }

      // 2. Jimp Fallback
      const bg = new Jimp({ width: 880, height: 500, color: 0xd53369ff });
      const av1 = await Jimp.read(avatarURL1).catch(() => null);
      const av2 = await Jimp.read(avatarURL2).catch(() => null);

      if (av1) {
        av1.resize({ w: 170, h: 170 }).circle();
        bg.composite(av1, 175, 175);
      }
      if (av2) {
        av2.resize({ w: 170, h: 170 }).circle();
        bg.composite(av2, 535, 175);
      }

      const buf = await bg.getBuffer("image/png");
      const st = Readable.from(buf);
      st.path = "kiss2.png";

      return message.reply({
        body: caption,
        attachment: st
      });
    } catch (err) {
      console.error("[KISS2 ERROR]:", err);
      return message.reply("❌ Error generating kiss animation.");
    }
  }
};
