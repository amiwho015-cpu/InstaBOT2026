const axios = require("axios");

module.exports = {
  config: {
    name: "wordgame",
    aliases: ["word"],
    version: "0.0.7",
    author: "Azadx69x",
    role: 0,
    category: "game"
  },
  onStart: async function ({ api, event }) {
    if (!global.GoatBot) global.GoatBot = {};
    if (!global.GoatBot.onReply) global.GoatBot.onReply = new Map();
    try {
      const response = await axios.get("https://azadx69x.is-a.dev/api/word");
      const w = response.data?.data?.word || response.data?.word;
      if (!w?.question || !w?.answer) throw new Error("Invalid word response");
      api.sendMessage(`🔤 Scrambled: "${w.question}"\n❓ Guess the word!`, event.threadID, (err, info) => {
        if (err) return;
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "wordgame",
          author: event.senderID,
          messageID: info.messageID,
          correct: String(w.answer).toLowerCase()
        });
        setTimeout(() => {
          try { api.unsendMessage(info.messageID); } catch {}
          global.GoatBot.onReply.delete(info.messageID);
        }, 40000);
      }, event.messageID);
    } catch (e) { api.sendMessage(`❌ ${e.message}`, event.threadID, event.messageID); }
  },
  onReply: async function ({ api, event, Reply, usersData }) {
    if (!Reply) return;
    if (event.senderID !== Reply.author) {
      return api.sendMessage("🐸 Oops, this game is not for you!", event.threadID, event.messageID);
    }
    const ans = String(event.body || "").trim().toLowerCase();
    const ud = await usersData.get(Reply.author);
    try { await api.unsendMessage(Reply.messageID); } catch {}
    global.GoatBot.onReply.delete(Reply.messageID);
    if (ans === Reply.correct) {
      await usersData.set(Reply.author, {
        money: (ud?.money || 0) + 20000,
        exp: (ud?.exp || 0) + 5000,
        data: ud?.data || {}
      });
      return api.sendMessage(`✅ Correct!\n🎁 +20000 Coins\n⭐ +5000 EXP`, event.threadID, event.messageID);
    } else {
      return api.sendMessage(`💔 Wrong!\n✔ Correct: ${Reply.correct}`, event.threadID, event.messageID);
    }
  }
};
