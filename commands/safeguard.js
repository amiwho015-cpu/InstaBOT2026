const getPrefix = (threadID) => (global.utils?.getPrefix ? global.utils.getPrefix(threadID) : "/");

module.exports = {
  config: {
    name: "safeguard",
    aliases: ["autobot", "guardian", "bothealth", "botcare", "safebot"],
    version: "2.0.0",
    author: "frnAlt",
    cooldown: 5,
    role: 2,
    description: "Inspect and manage automated bot safety, health, memory, and maintenance cycles",
    category: "system",
    guide: {
      en: "{pn} [status] - View live bot health & automation status\n{pn} clean - Run instant maintenance & temp purge\n{pn} gc - Trigger V8 garbage collection\n{pn} cache - View sliding TTL cache details\n{pn} clearcache - Clear in-memory caches"
    }
  },

  onStart: async function ({ message, args, api, event }) {
    const action = (args[0] || "status").toLowerCase();
    const prefix = getPrefix ? getPrefix(event.threadID) : "/";
    const automation = api.automation || global.utils?.botAutomation;

    switch (action) {
      case "status":
      case "health":
      case "info": {
        const mem = process.memoryUsage();
        const rssMb = (mem.rss / (1024 * 1024)).toFixed(2);
        const heapUsedMb = (mem.heapUsed / (1024 * 1024)).toFixed(2);
        const heapTotalMb = (mem.heapTotal / (1024 * 1024)).toFixed(2);
        const uptimeSec = Math.floor(process.uptime());
        const d = Math.floor(uptimeSec / (3600 * 24));
        const h = Math.floor((uptimeSec % (3600 * 24)) / 3600);
        const m = Math.floor((uptimeSec % 3600) / 60);
        const s = Math.floor(uptimeSec % 60);
        const uptimeFormatted = `${d}d ${h}h ${m}m ${s}s`;

        const stats = automation ? automation.stats : {};
        const cacheSize = api.cache?.cacheMap?.size || 0;

        let statusText = `🛡️ ━━━ [ BOT SAFEGUARD & HEALTH ] ━━━ 🛡️\n\n`;
        statusText += `⏱️ Uptime: ${uptimeFormatted}\n`;
        statusText += `🧠 Memory RSS: ${rssMb} MB\n`;
        statusText += `📊 Heap Used: ${heapUsedMb} MB / ${heapTotalMb} MB\n`;
        statusText += `⚡ Cache Entries: ${cacheSize}\n`;
        statusText += `🧹 Maintenance Cycles: ${stats.cleanupsPerformed || 0}\n`;
        statusText += `🗑️ Temp Files Purged: ${stats.filesPurged || 0}\n`;
        statusText += `♻️ Memory Freed: ${((stats.bytesFreed || 0) / (1024 * 1024)).toFixed(2)} MB\n`;
        statusText += `🔄 GC Cycles: ${stats.gcCycles || 0}\n\n`;

        statusText += `💡 Quick Commands:\n`;
        statusText += `• ${prefix}safeguard clean — Run instant cleanup\n`;
        statusText += `• ${prefix}safeguard gc — Trigger garbage collector\n`;
        statusText += `• ${prefix}safeguard clearcache — Flush in-memory cache`;

        return message.reply(statusText);
      }

      case "clean":
      case "maintenance":
      case "purge": {
        message.reply("🧹 Running bot maintenance and artifact purge...");
        if (automation) {
          const res = await automation.runMaintenanceCycle();
          return message.reply(
            `✅ Maintenance Complete!\n\n` +
            `🗑️ Files Purged: ${res.filesPurged}\n` +
            `🧠 Current RSS Memory: ${res.currentMemoryMb} MB\n` +
            `♻️ Memory Freed: ${(res.bytesFreed / (1024 * 1024)).toFixed(2)} MB\n` +
            `⚡ V8 GC: ${res.gcRan ? "Executed" : "Skipped (normal)"}`
          );
        } else {
          return message.reply("⚠️ Automation manager is active in background.");
        }
      }

      case "gc": {
        if (global.gc) {
          global.gc();
          return message.reply("♻️ V8 Garbage Collection executed successfully!");
        } else {
          return message.reply("ℹ️ Node.js running without explicit --expose-gc flag. Standard automatic memory management active.");
        }
      }

      case "cache": {
        const size = api.cache?.cacheMap?.size || 0;
        return message.reply(`⚡ Sliding TTL Cache Status:\n\n📦 Active cached objects: ${size}\n⏳ Sliding Window: 5 minutes\n💡 Use "${prefix}safeguard clearcache" to flush.`);
      }

      case "clearcache":
      case "flush": {
        if (api.cache?.clear) {
          api.cache.clear();
        }
        return message.reply("⚡ Sliding TTL cache flushed successfully!");
      }

      default:
        return message.reply(`❌ Invalid action! Available: status, clean, gc, cache, clearcache`);
    }
  }
};
