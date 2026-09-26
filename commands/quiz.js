const axios = require("axios");

module.exports = {
  config: {
    name: "quiz",
    aliases: ["qz"],
    version: "0.0.7",
    author: "Azadx69x",
    role: 0,
    category: "game"
  },
  onStart: async function ({ api, event, message }) {
    if (!global.GoatBot.onReply) global.GoatBot.onReply = new Map();
    try {
      const payload = (await axios.get("https://azadx69x.is-a.dev/api/quiz")).data;
      const q = payload?.data?.data || payload?.data || payload;
      if (!q || !Array.isArray(q.options)) throw new Error("Quiz API returned no questions.");
      const opts = q.options.map(o => String(o).replace(/^[A-D]\.\s*/, ""));
      const msg = `😺 Question: ${q.question}\n\n🅰️ ${opts[0]}\n🅱️ ${opts[1]}\n🅾️ ${opts[2]}\n🅳️ ${opts[3]}\n\n📝 Reply with A, B, C or D`;
      const info = await message.reply(msg);
      if (!info?.messageID) throw new Error("Could not register quiz reply.");
      global.GoatBot.onReply.set(info.messageID, {
        commandName: this.config.name,
        author: String(event.senderID),
        messageID: info.messageID,
        correctAnswer: String(q.answer).toUpperCase()
      });
      setTimeout(() => {
        try { api.unsendMessage(info.messageID); } catch {}
        global.GoatBot.onReply.delete(info.messageID);
      }, 40000);
    } catch (e) {
      api.sendMessage(`❌ Error: ${e.message}`, event.threadID, event.messageID);
    }
  },
  onReply: async function ({ api, event, Reply, usersData }) {
    if (!Reply || String(event.senderID) !== String(Reply.author)) return;
    const ans = String(event.body || "").trim().toUpperCase();
    if (!["A", "B", "C", "D"].includes(ans))
      return api.sendMessage("❌ Reply only A, B, C or D!", event.threadID, event.messageID);
    const ud = await usersData.get(Reply.author);
    if (!ud) return api.sendMessage("❌ Could not load your quiz data.", event.threadID, event.messageID);
    try { await api.unsendMessage(Reply.messageID); } catch {}
    global.GoatBot.onReply.delete(Reply.messageID);
    if (ans === Reply.correctAnswer) {
      await usersData.set(Reply.author, { money: ud.money + 500, exp: ud.exp + 121, data: ud.data });
      api.sendMessage("✅ Correct Answer!\n🎁 +500 Coins\n⭐ +121 EXP", event.threadID, event.messageID);
    } else {
      api.sendMessage(`❌ Wrong Answer!\n✔ Right Answer: ${Reply.correctAnswer}`, event.threadID, event.messageID);
    }
  }
};
