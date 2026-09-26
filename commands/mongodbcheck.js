const { MongoClient } = require("mongodb");

module.exports = {
  config: {
    name: "mongodbcheck",
    version: "1.0",
    author: "Azadx69x",
    cooldown: 5,
    role: 0,
    category: "system",
    guide: { en: "{pn} <url>" },
    aliases: ["mdbck"]
  },

  onStart: async ({ api, event, args }) => {
    const url = args[0];
    if (!url) return api.sendMessage("⛔ Mongodbcheck <mongodb_url>", event.threadID);
    let c;
    try {
      c = new MongoClient(url, { serverSelectionTimeoutMS: 10000 });
      await c.connect();
      await c.db().admin().serverInfo();
      c.close();
      return api.sendMessage("✅ MongoDB Successfully Working", event.threadID);
    } catch {
      try { c && c.close() } catch {}
      return api.sendMessage("❌ MongoDB Not Working", event.threadID);
    }
  }
};
