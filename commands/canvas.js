const axios = require("axios");
const { Jimp } = require("jimp");
const { Readable } = require("stream");
const { renderJailEffect, isCanvasAvailable } = require("../../func/canvasHelper.js");

async function extractImageUrl(args, event, api) {
  if (global.utils && typeof global.utils.extractImageUrl === "function") {
    const u = global.utils.extractImageUrl(event, args, { allowAvatar: false });
    if (u) return u;
  }

  let imageUrl = args.find(arg => typeof arg === "string" && arg.startsWith("http"));

  if (!imageUrl && event.messageReply?.attachments?.length > 0) {
    for (const att of event.messageReply.attachments) {
      let u = att.url || att.largePreviewUrl || att.large_preview_url || att.previewUrl || att.preview_url || att.thumbnailUrl || att.thumbnail_url || att.image || att.photoUrl || att.image_data?.url || att.media?.image?.uri;
      if (!u && att.ID && api?.resolvePhotoUrl) {
        try { u = await api.resolvePhotoUrl(att.ID); } catch (_) {}
      }
      if (u) { imageUrl = u; break; }
    }
  }

  if (!imageUrl && event.attachments?.length > 0) {
    for (const att of event.attachments) {
      let u = att.url || att.largePreviewUrl || att.large_preview_url || att.previewUrl || att.preview_url || att.thumbnailUrl || att.thumbnail_url || att.image || att.photoUrl || att.image_data?.url || att.media?.image?.uri;
      if (!u && att.ID && api?.resolvePhotoUrl) {
        try { u = await api.resolvePhotoUrl(att.ID); } catch (_) {}
      }
      if (u) { imageUrl = u; break; }
    }
  }

  if (!imageUrl && event.messageReply?.body) {
    const match = event.messageReply.body.match(/https?:\/\/[^\s]+/i);
    if (match && /\.(jpe?g|png|webp|gif|bmp)(\?.*)?$/i.test(match[0])) {
      imageUrl = match[0];
    }
  }

  return imageUrl;
}

const AVAILABLE_ACTIONS = [
  "circle", "rounded", "resize", "crop", "rotate", "flip",
  "blur", "sharpen", "grayscale", "greyscale", "sepia", "invert",
  "brightness", "contrast", "jail", "prison"
];

module.exports = {
  config: {
    name: "canvas",
    aliases: ["imgcanvas", "canvasfx", "filterimg"],
    version: "2.2.0",
    author: "frnAlt",
    cooldown: 5,
    role: 0,
    shortDescription: {
      en: "Apply image manipulations and filters using Canvas API"
    },
    longDescription: {
      en: "Apply various canvas actions and filters: circle, rounded, blur, sharpen, grayscale, sepia, invert, brightness, contrast, rotate, flip, resize, jail"
    },
    category: "image",
    guide: {
      en: "{pn} <action> [value] | Reply to an image\n\nActions:\ncircle, rounded, blur, sharpen, grayscale, sepia, invert, brightness, contrast, rotate, flip, jail\n\nExample:\n• {pn} jail\n• {pn} grayscale\n• {pn} blur 10\n• {pn} circle"
    }
  },

  onStart: async function ({ api, event, message, args, commandName }) {
    const action = args[0]?.toLowerCase();
    const prefix = global.GoatBot?.config?.prefix || "";

    if (!action || !AVAILABLE_ACTIONS.includes(action)) {
      return message.reply(
        `🎨 Available Canvas Actions:\n\n` +
        `• Effects: jail (iron bars), circle, rounded\n` +
        `• Filters: grayscale, sepia, invert, blur [val]\n` +
        `• Adjustments: brightness [val], contrast [val]\n` +
        `• Transforms: rotate [deg], flip [h/v], resize [w] [h]\n\n` +
        `💡 Usage: Reply to an image (or mention a user) with:\n${prefix}${commandName} <action> [value]\n` +
        `Example: ${prefix}${commandName} jail`
      );
    }

    const imageUrl = await extractImageUrl(args.slice(1), event, api);
    if (!imageUrl) {
      return message.reply(
        `📸 Please reply to an image or mention a user to apply the '${action}' effect.`
      );
    }

    if (api?.setMessageReaction) {
      api.setMessageReaction("🎨", event.messageID, () => {}, true);
    }

    try {
      if (action === "jail" || action === "prison") {
        let stream;
        if (isCanvasAvailable && typeof renderJailEffect === "function") {
          try {
            const buf = await renderJailEffect(imageUrl);
            stream = Readable.from(buf);
            stream.path = "canvas_jail.png";
          } catch (cErr) {
            console.warn("[CANVAS] Native jail render failed:", cErr.message);
          }
        }
        if (!stream) {
          const toshiroUrl = `https://toshiro-api-editz6t9.vercel.app/api/canvas/jail?image=${encodeURIComponent(imageUrl)}`;
          if (global.utils && typeof global.utils.getStreamFromURL === "function") {
            stream = await global.utils.getStreamFromURL(toshiroUrl, "canvas_jail.png");
          } else {
            const res = await axios.get(toshiroUrl, { responseType: "stream", timeout: 15000 });
            stream = res.data;
            stream.path = "canvas_jail.png";
          }
        }

        if (api?.setMessageReaction) {
          api.setMessageReaction("👍", event.messageID, () => {}, true);
        }

        return message.reply({
          body: `⛓️ Canvas Action: JAIL applied! Behind bars! 🚓`,
          attachment: stream
        });
      }

      const jimg = await Jimp.read(imageUrl);
      if (action === "circle" || action === "rounded") {
        jimg.circle();
      } else if (action === "grayscale" || action === "greyscale") {
        jimg.greyscale();
      } else if (action === "sepia") {
        jimg.sepia();
      } else if (action === "invert") {
        jimg.invert();
      } else if (action === "blur") {
        const radius = parseInt(args[1], 10) || 5;
        jimg.blur(Math.min(25, Math.max(1, radius)));
      } else if (action === "rotate") {
        const deg = parseInt(args[1], 10) || 90;
        jimg.rotate(deg);
      } else if (action === "flip") {
        const vertical = (args[1] || "").toLowerCase().startsWith("v");
        jimg.flip({ horizontal: !vertical, vertical });
      } else if (action === "resize" && args[1] && args[2]) {
        const w = parseInt(args[1], 10) || 512;
        const h = parseInt(args[2], 10) || 512;
        jimg.resize({ w: Math.min(1920, w), h: Math.min(1920, h) });
      } else if (action === "brightness") {
        const val = parseInt(args[1], 10) || 20;
        jimg.color([{ apply: val >= 0 ? "brighten" : "darken", params: [Math.abs(val)] }]);
      } else if (action === "contrast") {
        const val = parseFloat(args[1]) || 0.3;
        jimg.contrast(Math.min(1, Math.max(-1, val)));
      }

      const buf = await jimg.getBuffer("image/png");
      const stream = Readable.from(buf);
      stream.path = `canvas_${action}.png`;

      if (api?.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }

      await message.reply({
        body: `✨ Canvas Action: ${action.toUpperCase()} applied!`,
        attachment: stream
      });
    } catch (err) {
      console.error("[CANVAS ERROR]:", err);
      if (api?.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      }
      return message.reply(`❌ Failed to process canvas effect: ${err.message || err}`);
    }
  }
};
