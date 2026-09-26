const os = require("os");
const moment = require("moment-timezone");
let createCanvas = null, loadImage = null, registerFont = null;
try {
  const _c = require("canvas");
  createCanvas = _c.createCanvas;
  loadImage = _c.loadImage;
  registerFont = _c.registerFont;
} catch (e) {}
let GIFEncoder = null;
try {
  GIFEncoder = require("gif-encoder-2");
} catch (e) {}

module.exports = {
  config: {
    name: "richest",
    aliases: ["toprichest"],
    version: "2.4.78",
    author: "frnAlt",
    description: "Richest leaderboard dashboard",
    guide: "richest"
  },

  onStart: async function ({ message, usersData }) {
    try {
      const allUsers = await usersData.getAll();
      const sorted = allUsers
        .filter(u => u.money && u.money > 0)
        .sort((a, b) => b.money - a.money)
        .slice(0, 10);

      if (sorted.length === 0) return message.reply("📛 No balance data found.");

      let msg = "🏆 Top 10 Richest Users:\n\n";
      for (let i = 0; i < sorted.length; i++) {
        msg += `${i + 1}. ${sorted[i].name || "User"} - $${sorted[i].money}\n`;
      }

      return message.reply(msg);
    } catch (e) {
      return message.reply("❌ Error fetching leaderboard: " + e.message);
    }
  }
};
