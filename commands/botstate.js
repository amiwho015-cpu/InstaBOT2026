const os = require("os");

function formatUptime(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

module.exports = {
  config: {
    name: "botstate",
    aliases: ["botinfo", "bstate", "botdetails", "state"],
    version: "2.0.0",
    author: "frnAlt",
    cooldown: 3,
    role: 0,
    shortDescription: {
      en: "View current bot state and operational details"
    },
    longDescription: {
      en: "Displays complete bot status including maintenance/off mode, loaded commands, database counts, uptime, and system diagnostics."
    },
    category: "system",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ message, usersData, threadsData, prefix }) {
    const botOff = global.GoatBot?.botOff === true;
    const config = global.GoatBot?.config || {};
    const commands = global.GoatBot?.commands || new Map();
    const aliases = global.GoatBot?.aliases || new Map();

    const [allUsers, allThreads] = await Promise.all([
      usersData.getAll().catch(() => []),
      threadsData.getAll().catch(() => [])
    ]);

    const mem = process.memoryUsage();
    const heapUsedMB = (mem.heapUsed / 1024 / 1024).toFixed(1);
    const heapTotalMB = (mem.heapTotal / 1024 / 1024).toFixed(1);
    const rssMB = (mem.rss / 1024 / 1024).toFixed(1);

    const botUptime = formatUptime(process.uptime());
    const osUptime = formatUptime(os.uptime());
    const adminBots = Array.isArray(config.adminBot) ? config.adminBot : [];

    const stateStatus = botOff
      ? "❌ OFF (Admin-Only Control)"
      : "✅ ON (Available to All Users)";

    const report =
`FLOPPA BOT STATUS & DETAILS

Operational State
• Bot Status: ${stateStatus}
• Active Prefix: ${prefix}
• Bot Name: ${config.nickNameBot || "Floppa Bot"}
• Language: ${config.language || "en"}

Command & Architecture
• Total Commands: ${commands.size}
• Total Aliases: ${aliases.size}
• Bot Admins: ${adminBots.length} admin(s)

Database Statistics
• Registered Users: ${allUsers.length.toLocaleString()}
• Active Groups: ${allThreads.length.toLocaleString()}

System & Performance
• Bot Uptime: ${botUptime}
• System Uptime: ${osUptime}
• Memory (Heap): ${heapUsedMB} MB / ${heapTotalMB} MB
• Memory (RSS): ${rssMB} MB
• Platform: ${os.type()} ${os.arch()} (Node ${process.version})`;

    return message.reply(report);
  }
};
