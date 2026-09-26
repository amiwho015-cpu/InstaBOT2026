const fs = require("fs-extra");

module.exports = {
    config: {
        name: "typing",
        aliases: ["type"],
        version: "1.0.0",
        author: "Azadx69x",
        cooldown: 1,
        role: 6,
        description: "Turn the typing indicator on or off",
        category: "config",
        guide: "typing on | off"
    },

    onStart: async function ({ message, args }) {
        const value = String(args?.[0] || "").toLowerCase();
        if (value !== "on" && value !== "off")
            return message.reply("Usage: typing on | off");

        const enabled = value === "on";
        const config = global.GoatBot.config;
        config.enableTypingIndicator = enabled;

        if (config.typingIndicator && typeof config.typingIndicator === "object")
            config.typingIndicator.enable = enabled;
        else
            config.typingIndicator = enabled;

        fs.writeJsonSync(global.client.dirConfig, config, { spaces: 2 });
        return message.reply(`✅ Typing ${enabled ? "enabled" : "disabled"}.`);
    }
};
