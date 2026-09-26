const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");
const { execSync } = require("child_process");

const dirBootLogTemp = path.join(__dirname, "..", "..", "tmp", "rebootUpdated.txt");

module.exports = {
  config: {
    name: "update",
    version: "0.0.7",
    author: "NTKhang | Azadx69x",
    role: 2,
    description: { en: "Check for and install updates for the chatbot." },
    category: "owner",
    guide: { en: "{pn}" }
  },
  langs: {
    en: {
      noUpdates: "🚀 X69X BOT V3 UPDATE\n✅ ALREADY UPDATED\n📦 Version : v%1",
      updatePrompt: "🚀 X69X BOT V3 UPDATE\n✨ NEW UPDATE AVAILABLE\n🔄 v%1 → v%2\n📁 FILES TO UPDATE\n%3%4\n🌐 github.com/azadx69x/X69X-BOT-V3\n👍 REACT TO CONFIRM",
      fileWillDelete: "🗑️ FILES TO DELETE\n%1",
      andMore: "...AND %1 MORE FILES",
      updateConfirmed: "🚀 X69X BOT V3\n⏳ UPDATING BOT...\n🔧 PLEASE WAIT",
      updateComplete: "🚀 X69X BOT V3\n✅ UPDATE COMPLETE\n🔄 RESTART NOW?\n💬 REPLY : yes / y",
      updateTooFast: "⚠️ UPDATE TOO FAST!\n⏳ WAIT %3m %4s",
      botWillRestart: "🔄 BOT RESTARTING..."
    }
  },
  onLoad: async function ({ api }) {
    try {
      if (fs.existsSync(dirBootLogTemp)) {
        const threadID = fs.readFileSync(dirBootLogTemp, "utf8");
        fs.removeSync(dirBootLogTemp);
        api.sendMessage("✅ Bot Restarted!", threadID);
      }
    } catch (e) {}
  },
  onStart: async function ({ message, getLang, event, commandName }) {
    const { data: pkg } = await axios.get("https://raw.githubusercontent.com/azadx69x/X69X-BOT-V3/main/package.json");
    const curVer = require("../../package.json").version;
    if (compareVersion(pkg.version, curVer) < 1) return message.reply(getLang("noUpdates", curVer));
    message.reply(getLang("updatePrompt", curVer, pkg.version, "• Core Files\n• Commands\n", ""), (err, info) => {
      global.GoatBot.onReaction.set(info.messageID, { messageID: info.messageID, threadID: info.threadID, authorID: event.senderID, commandName });
    });
  },
  onReaction: async function ({ message, Reaction, event }) {
    if (event.userID != Reaction.authorID) return;
    await message.reply(getLang("updateConfirmed"));
    execSync("git pull https://github.com/azadx69x/X69X-BOT-V3.git main", { stdio: "inherit", cwd: path.join(__dirname, "..", "..") });
    fs.writeFileSync(dirBootLogTemp, event.threadID);
    message.reply(getLang("updateComplete"));
  },
  onReply: async function ({ message, event, getLang }) {
    const body = event.body?.toLowerCase();
    if (body === "yes" || body === "y") {
      message.reply(getLang("botWillRestart"));
      setTimeout(() => process.exit(2), 2000);
    }
  }
};

function compareVersion(v1, v2) {
  const a = v1.split("."), b = v2.split(".");
  for (let i = 0; i < 3; i++) {
    const n1 = parseInt(a[i]) || 0, n2 = parseInt(b[i]) || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}
