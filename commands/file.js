const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const API_URL = 'https://azadx69x.is-a.dev/api/pastebin';

const formatSize = (b) => {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(2) + ' KB';
  if (b < 1073741824) return (b/1048576).toFixed(2) + ' MB';
  return (b/1073741824).toFixed(2) + ' GB';
};

module.exports = {
  config: {
    name: "file",
    version: "0.0.7",
    author: "Azadx69x",
    cooldown: 5,
    role: 6,
    shortDescription: "File manager",
    category: "owner",
    guide: "{pn} [path]"
  },
  onStart: async function ({ message, args, event, api }) {
    const creators = global.GoatBot.config.creator || [];
    if (!creators.includes(event.senderID))
      return api.sendMessage("😾 𝐭𝐨𝐫 𝐦𝐚𝐫𝐞𝐜𝐡𝐮𝐝𝐢 𝐭𝐮𝐢 𝐚𝐝𝐦𝐢𝐧 𝐧𝐚!", event.threadID);
    let targetPath = args[0] ? path.resolve(args[0]) : process.cwd();
    if (!fs.existsSync(targetPath)) return api.sendMessage("❌ Path not found", event.threadID);
    const getSize = (p) => {
      try {
        return fs.statSync(p).isDirectory()
          ? fs.readdirSync(p).reduce((s, f) => s + getSize(path.join(p, f)), 0)
          : fs.statSync(p).size;
      } catch { return 0; }
    };
    let items = fs.readdirSync(targetPath).map((f) => {
      const p = path.join(targetPath, f);
      const stat = fs.statSync(p);
      return { name: f, isDir: stat.isDirectory(), size: stat.isDirectory() ? getSize(p) : stat.size };
    }).sort((a, b) => (a.isDir === b.isDir) ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1);
    let msg = `📁 ${targetPath}\n`;
    items.forEach((item, i) => {
      msg += `\n${i+1}. ${item.isDir ? '🗂️' : '📄'} ${item.name} (${formatSize(item.size)})`;
    });
    msg += `\n\n📊 Total: ${formatSize(items.reduce((s, i) => s + i.size, 0))}`;
    api.sendMessage(msg, event.threadID, (err, info) => {
      if (!err) global.GoatBot.onReply.set(info.messageID, {
        commandName: this.config.name,
        author: event.senderID,
        path: targetPath,
        items: items
      });
    });
  },
  onReply: async function ({ event, api, Reply }) {
    if (event.senderID !== Reply.author) return;
    const body = event.body.trim().split(' ');
    const action = body[0].toLowerCase();
    const nums = body.slice(1).map(Number).filter(n => n > 0 && n <= Reply.items.length);
    if (!nums.length) {
      return api.sendMessage("⚠️ Use: open <num> or send <num>", event.threadID);
    }
    const selected = nums.map(n => Reply.items[n-1]);
    if (action === 'open') {
      const folder = selected.find(i => i.isDir);
      if (!folder) return api.sendMessage("⚠️ No folder selected", event.threadID);
      const newPath = path.join(Reply.path, folder.name);
      const fakeMsg = { reply: (msg) => api.sendMessage(msg, event.threadID) };
      await this.onStart({ message: fakeMsg, args: [newPath], event, api });
    } else if (action === 'send') {
      for (const item of selected) {
        if (item.isDir) {
          await api.sendMessage(`⚠️ Cannot send folder: ${item.name}`, event.threadID);
          continue;
        }
        const filePath = path.join(Reply.path, item.name);
        try {
          if (!fs.existsSync(filePath)) {
            await api.sendMessage(`❌ File not found: ${item.name}`, event.threadID);
            continue;
          }
          const stat = fs.statSync(filePath);
          if (stat.size === 0) {
            await api.sendMessage(`⚠️ File is empty: ${item.name}`, event.threadID);
            continue;
          }
          const content = fs.readFileSync(filePath, 'utf8');
          const res = await axios.get(API_URL, { params: { query: content } });
          const result = res.data;
          if (!result.success) {
            await api.sendMessage(`❌ Upload failed: ${result.message || 'Unknown error'}`, event.threadID);
            continue;
          }
          await api.sendMessage(
            `📤 Uploaded: ${item.name} (${formatSize(stat.size)})\n🔗 Raw URL: ${result.result.raw_url}`,
            event.threadID
          );
        } catch (e) {
          const errorMsg = e.message || String(e);
          await api.sendMessage(`❌ Error: ${errorMsg}`, event.threadID);
        }
      }
    } else {
      api.sendMessage("⚠️ Available: open <num> or send <num>", event.threadID);
    }
  }
};
