const axios = require("axios");

module.exports = {
  config: {
    name: "ffquiz",
    aliases: ["ffqz"],
    version: "0.0.7",
    author: "Azadx69x",
    role: 0,
    category: "game",
    description: "Free Fire Quiz"
  },
  onStart: async function({ api, event, message }) {
    try {
      if (!global.GoatBot.onReply) global.GoatBot.onReply = new Map();
      const res = await axios.get("https://azadx69x.is-a.dev/api/ffquiz");
      const q = res.data?.data?.quiz || res.data?.quiz || res.data?.data;
      if (!q || !Array.isArray(q.options)) throw new Error("FF quiz API returned no questions.");
      const opts = q.options.map(o => String(o).replace(/^[A-D]\.\s*/, ""));
      const msg = `🔥 FF QUIZ\n❓ ${q.question}\n\n🅰️ A) ${opts[0]}\n🅱️ B) ${opts[1]}\n🅾️ C) ${opts[2]}\n🅳️ D) ${opts[3]}\n\n⏰ Hurry! Reply with A, B, C or D`;
      const m = await message.reply(msg);
      if (!m?.messageID) throw new Error("Could not register FF quiz reply.");
      global.GoatBot.onReply.set(m.messageID, {
        type: "reply",
        commandName: this.config.name,
        author: String(event.senderID),
        messageID: m.messageID,
        correctAnswer: q.answer.toUpperCase()
      });
      setTimeout(() => {
        try { api.unsendMessage(m.messageID); } catch {}
        global.GoatBot.onReply.delete(m.messageID);
      }, 60000);
    } catch (e) {
      api.sendMessage(`❌ Error: ${e.message}`, event.threadID, event.messageID);
    }
  },
  onReply: async function({ api, event, Reply, usersData }) {
    if (!Reply) return;
    if (String(event.senderID) !== String(Reply.author)) return api.sendMessage("🐸 This quiz is not for you!", event.threadID, event.messageID);
    const ans = String(event.body || "").trim().toUpperCase();
    if (!["A","B","C","D"].includes(ans)) return api.sendMessage("❌ Reply only A, B, C or D!", event.threadID, event.messageID);
    const ud = await usersData.get(Reply.author);
    if (!ud) return api.sendMessage("❌ Could not load your FF quiz data.", event.threadID, event.messageID);
    try { await api.unsendMessage(Reply.messageID); } catch {}
    global.GoatBot.onReply.delete(Reply.messageID);
    if (ans === Reply.correctAnswer.toUpperCase()) {
      await usersData.set(Reply.author, { money: ud.money + 500, exp: ud.exp + 121, data: ud.data });
      return api.sendMessage("✅ Correct Answer!\n🎁 +500 Coins\n⭐ +121 EXP", event.threadID, event.messageID);
    } else {
      return api.sendMessage(`❌ Wrong Answer!\n✔ Right Answer: ${Reply.correctAnswer.toUpperCase()}`, event.threadID, event.messageID);
    }
  }
};
