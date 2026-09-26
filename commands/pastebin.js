const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "pastebin",
    aliases: ["past"],
    version: "0.0.7",
    author: "Azadx69x",
    cooldown: 5,
    role: 6,
    category: "utility",
    shortDescription: "Upload local cmd to Pastebin via API",
    longDescription: "Uploads any file from cmds folder using API, raw link included",
    guide: { en: "{pn} <filename>" }
  },
  onStart: async function({ api, event, args }) {
    const name = args[0];
    if (!name) return api.sendMessage("❌ Please provide a file name!", event.threadID, event.messageID);
    const cmds = path.join(__dirname, "..", "cmds");
    const files = [path.join(cmds, name), path.join(cmds, name + ".js"), path.join(cmds, name + ".txt")];
    let filePath = files.find(f => fs.existsSync(f));
    if (!filePath) return api.sendMessage("❌ File not found in cmds folder!", event.threadID, event.messageID);
    try {
      const data = fs.readFileSync(filePath, "utf8");
      const res = await axios.get("https://azadx69x.is-a.dev/api/pastebin", { params: { query: data } });
      const result = res.data?.data?.result || res.data?.result;
      const success = res.data?.data?.success ?? res.data?.success;
      if (!success) return api.sendMessage(`❌ Pastebin failed: ${res.data?.data?.message || res.data?.message || "Unknown error"}`, event.threadID, event.messageID);
      const rawUrl = result?.raw_url || result?.paste_url;
      if (!rawUrl) return api.sendMessage("❌ Pastebin did not return a URL.", event.threadID, event.messageID);
      const msg = `🗂️ File Name: ${path.basename(filePath)}\n📄 Raw URL: ${rawUrl}`;
      api.sendMessage(msg, event.threadID, event.messageID);
    } catch (e) {
      console.error(e);
      api.sendMessage("❌ Failed to upload to Pastebin via API.", event.threadID, event.messageID);
    }
  }
};
