const axios = require("axios");
const fs = require("fs");
const path = require("path");

let userSession = {};
let botMessages = {};

module.exports = {
  config: {
    name: "segs",
    version: "1.6",
    author: "Azadx69x",
    role: 2,
    category: "18+",
    shortDescription: "𝐇𝐃 𝐕𝐢𝐝𝐞𝐨 𝐒𝐞𝐚𝐫𝐜𝐡 & 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝",
    longDescription: "𝐒𝐞𝐚𝐫𝐜𝐡 𝐟𝐨𝐫 𝐇𝐃 𝐯𝐢𝐝𝐞𝐨𝐬 𝐚𝐧𝐝 𝐝𝐨𝐰𝐧𝐥𝐨𝐚𝐝"
  },

  onStart: async ({ api, event, args }) => {
    const keyword = args.join(" ");
    const thread = event.threadID;
    const sender = event.senderID;

    clearBotMessages(api, thread);
    botMessages[thread] = [];

    if (!keyword) {
      const msg = await api.sendMessage("🔴 𝙺𝙴𝚈𝚆𝙾𝚁𝙳 𝙳𝙴𝚄𝙽", thread);
      botMessages[thread].push(msg.messageID);
      autoDelete(api, msg.messageID, 5000);
      return api.setMessageReaction("❌", event.messageID, () => {}, true);
    }

    const searchMsg = await api.sendMessage("🔍 𝚂𝙴𝙰𝚁𝙲𝙷𝙸𝙽𝙶...", thread);
    botMessages[thread].push(searchMsg.messageID);
    api.setMessageReaction("⏳", event.messageID, () => {}, true);

    try {
      const res = await axios.get(
        `https://azadx69x-segs.vercel.app/api/search?q=${encodeURIComponent(keyword)}`,
        { timeout: 15000 }
      );

      const results = Array.isArray(res.data?.list) ? res.data.list : [];

      if (!results.length) {
        autoDelete(api, searchMsg.messageID, 500);
        const noResultMsg = await api.sendMessage("❌ 𝙽𝙾 𝚁𝙴𝚂𝚄𝙻𝚃𝚂", thread);
        botMessages[thread].push(noResultMsg.messageID);
        autoDelete(api, noResultMsg.messageID, 8000);
        return api.setMessageReaction("❌", event.messageID, () => {}, true);
      }

      userSession[sender] = {
        results,
        expires: Date.now() + 90_000,
        threadID: thread,
        keyword: keyword
      };

      autoDelete(api, searchMsg.messageID, 500);
      sendList(api, thread, sender, event.messageID);

    } catch (e) {
      autoDelete(api, searchMsg.messageID, 500);
      const errorMsg = await api.sendMessage("❌ 𝙴𝚁𝚁𝙾𝚁: 𝙰𝙿𝙸 𝙵𝙰𝙸𝙻𝙴𝙳", thread);
      botMessages[thread].push(errorMsg.messageID);
      autoDelete(api, errorMsg.messageID, 8000);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    }
  },

  onChat: async ({ api, event }) => {
    const sender = event.senderID;
    const thread = event.threadID;

    if (!userSession[sender]) return;
    if (userSession[sender].threadID !== thread) return;

    const body = event.body;
    if (!body || !body.trim()) return;

    const prefix = global.GoatBot?.config?.prefix || ")";
    if (body.trim().startsWith(prefix)) return;

    const msg = body.trim();

    if (Date.now() > userSession[sender].expires) {
      clearBotMessages(api, thread);
      delete userSession[sender];
      const timeoutMsg = await api.sendMessage("⏰ 𝚃𝙸𝙼𝙴𝙾𝚄𝚃 — 𝚁𝚄𝙽 𝙲𝙼𝙳 𝙰𝙶𝙰𝙸𝙽", thread);
      autoDelete(api, timeoutMsg.messageID, 5000);
      return api.setMessageReaction("⏳", event.messageID, () => {}, true);
    }

    const session = userSession[sender];

    if (!/^\d+$/.test(msg)) return;

    const number = parseInt(msg);
    const index = number - 1;

    if (number < 1 || number > session.results.length || !session.results[index]) {
      const invalidMsg = await api.sendMessage("❌ 𝙸𝙽𝚅𝙰𝙻𝙸𝙳 𝙽𝚄𝙼𝙱𝙴𝚁 ❌", thread);
      autoDelete(api, invalidMsg.messageID, 3000);
      return api.setMessageReaction("❌", event.messageID, () => {}, true);
    }

    const item = session.results[index];

    api.setMessageReaction("📤", event.messageID, () => {}, true);
    clearBotMessages(api, thread);
    delete userSession[sender];

    const filePath = path.join(__dirname, `video_${sender}_${Date.now()}.mp4`);

    try {
      await streamToFile(item.video, filePath, {
        headers: { "User-Agent": "Mozilla/5.0" },
        timeout: 60000
      });

      const videoInfo = `━━━━━━━━━━━━━━━━━━━━
𝐕𝐈𝐃𝐄𝐎 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐃 ✅
╭─╼━━━━━━━━━━━━━━╾─╮
│ 🎬  ${item.name}
│ ⏱  ${item.time}
│ 🔢  ${number}
│ 📊  ${session.results.length} results
│ 🔍  "${session.keyword}"
╰─━━━━━━━━━━━━━━━╾─╯
━━━━━━━━━━━━━━━━━━━━`;

      const videoMsg = await api.sendMessage(
        { body: videoInfo, attachment: fs.createReadStream(filePath) },
        thread
      );

      if (!botMessages[thread]) botMessages[thread] = [];
      botMessages[thread].push(videoMsg.messageID);

      api.setMessageReaction("✅", event.messageID, () => {}, true);

    } catch (e) {
      const errorMsg = await api.sendMessage("❌ 𝙳𝙾𝚆𝙽𝙻𝙾𝙰𝙳 𝙵𝙰𝙸𝙻𝙴𝙳 — 𝚁𝚄𝙽 𝙲𝙼𝙳 𝙰𝙶𝙰𝙸𝙽", thread);
      if (!botMessages[thread]) botMessages[thread] = [];
      botMessages[thread].push(errorMsg.messageID);
      autoDelete(api, errorMsg.messageID, 8000);
      api.setMessageReaction("❌", event.messageID, () => {}, true);
    } finally {
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }
  }
};

function sendList(api, thread, user, messageID) {
  const s = userSession[user];
  if (!s) return;

  let listMessage = `━━━━━━━━━━━━━━━━━━━━
𝐒𝐄𝐀𝐑𝐂𝐇 𝐑𝐄𝐒𝐔𝐋𝐓𝐒
━━━━━━━━━━━━━━━━━━━━\n\n`;

  const showCount = Math.min(20, s.results.length);

  for (let i = 0; i < showCount; i++) {
    const item = s.results[i];
    const number = i + 1;
    const title = item.name.length > 50 ? item.name.substring(0, 47) + "..." : item.name;
    listMessage += `【${number}】 ${title}\n      ⏱ ${item.time}\n\n`;
  }

  listMessage += `━━━━━━━━━━━━━━━━━━━━
𝐒𝐄𝐋𝐄𝐂𝐓: 𝟏-${showCount}
━━━━━━━━━━━━━━━━━━━━`;

  api.sendMessage(listMessage, thread).then(msg => {
    if (!botMessages[thread]) botMessages[thread] = [];
    botMessages[thread].push(msg.messageID);
    if (messageID) api.setMessageReaction("✅", messageID, () => {}, true);
  });
}

function clearBotMessages(api, thread) {
  if (botMessages[thread]) {
    for (const messageID of botMessages[thread]) {
      try { api.unsendMessage(messageID); } catch {}
    }
    botMessages[thread] = [];
  }
}

function autoDelete(api, messageID, delay) {
  setTimeout(() => {
    try { api.unsendMessage(messageID); } catch {}
  }, delay);
}

function streamToFile(url, filePath, axiosOptions = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const res = await axios.get(url, { ...axiosOptions, responseType: "stream" });
      const writer = fs.createWriteStream(filePath);
      res.data.pipe(writer);
      writer.on("finish", resolve);
      writer.on("error", reject);
      res.data.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}
