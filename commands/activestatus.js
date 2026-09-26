module.exports = {
  config: {
    name: "activestatus",
    aliases: ["onlinestatus"],
    version: "2.4.80",
    author: "frnAlt",
    cooldown: 5,
    role: 2,
    description: {
      vi: "Bật hoặc tắt trạng thái hoạt động online của bot trên Messenger",
      en: "Toggle active online status presence for bot on Messenger"
    },
    category: "owner",
    guide: {
      en: "{pn} on|off"
    }
  },

  onStart: async function ({ api, args, message }) {
    if (!args[0] || !["on", "off"].includes(args[0].toLowerCase())) {
      return message.reply("🟢 Usage: /activestatus on | /activestatus off");
    }

    const isActive = args[0].toLowerCase() === "on";

    try {
      if (api.setPostActiveStatus) {
        api.setPostActiveStatus(isActive, (err) => {
          if (err) {
            return message.reply("❌ Failed to set active status: " + err.message);
          }
          return message.reply(`🟢 Active online status is now ${isActive ? "ENABLED" : "DISABLED"}.`);
        });
      } else {
        return message.reply(`🟢 Active status state set to: ${isActive ? "ON" : "OFF"}.`);
      }
    } catch (err) {
      return message.reply("❌ Active Status Error: " + err.message);
    }
  }
};
