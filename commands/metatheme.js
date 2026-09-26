module.exports = {
  config: {
    name: "metatheme",
    aliases: ["settheme", "themecolor"],
    version: "2.4.79",
    author: "frnAlt",
    cooldown: 5,
    role: 1,
    description: {
      vi: "Thay đổi chủ đề (màu sắc) của đoạn chat Messenger",
      en: "Change Messenger chat thread theme color"
    },
    category: "box chat",
    guide: {
      en: "{pn} <hex_color_or_theme_id>\nExample: /metatheme #FF5733"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    if (!args[0]) {
      return message.reply("🎨 Please specify a color (Hex code like #FF5733 or Theme ID).\nExample: /metatheme #0084FF");
    }

    const color = args[0];

    try {
      if (api.changeThreadColor) {
        api.changeThreadColor(color, event.threadID, (err) => {
          if (err) {
            return message.reply("❌ Failed to change thread theme: " + (err.error || err.message || "Invalid color/theme"));
          }
          return message.reply(`🎨 Thread color successfully updated to ${color}!`);
        });
      } else {
        return message.reply("⚠️ FCA changeThreadColor method is not supported on this account type.");
      }
    } catch (err) {
      return message.reply("❌ Theme Error: " + err.message);
    }
  }
};
