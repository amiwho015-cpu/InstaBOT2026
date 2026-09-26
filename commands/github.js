const axios = require("axios");
module.exports = {
  config: {
    name: "github",
    version: "0.0.1",
    author: "Azadx69x",
    cooldown: 3,
    role: 0,
    shortDescription: "Get GitHub user info",
    category: "owner",
    guide: "{pn} <username>"
  },
  onStart: async function ({ api, event, args }) {
    try {
      if (!args[0]) return api.sendMessage("⛔ 𝐏𝐥𝐞𝐚𝐬𝐞 𝐩𝐫𝐨𝐯𝐢𝐝𝐞 𝐚 𝐆𝐢𝐭𝐇𝐮𝐛 𝐮𝐬𝐞𝐫𝐧𝐚𝐦𝐞.", event.threadID, event.messageID);
      const { data } = await axios.get(`https://azadx69x.is-a.dev/api/github?user=${encodeURIComponent(args[0])}`);
      const d = data?.data?.data || data?.data;
      if (!d) return api.sendMessage(`❌ 𝐍𝐨 𝐆𝐢𝐭𝐇𝐮𝐛 𝐮𝐬𝐞𝐫 𝐟𝐨𝐮𝐧𝐝: ${args[0]}`, event.threadID, event.messageID);
      const username = data?.data?.user || d.user || d.login || args[0];
      const formatDate = value => value ? new Date(value).toDateString() : "𝐍𝐨𝐧𝐞";
      const msg = 
`𝐆𝐢𝐭𝐇𝐮𝐛 𝐏𝐫𝐨𝐟𝐢𝐥𝐞 👀
🧑‍💻 𝐍𝐚𝐦𝐞: ${d.name || "𝐍𝐨𝐧𝐞"}
👤 𝐔𝐬𝐞𝐫: ${username}
🏢 𝐂𝐨𝐦𝐩𝐚𝐧𝐲: ${d.company || "𝐍𝐨𝐧𝐞"}
🌐 𝐁𝐥𝐨𝐠: ${d.blog || "𝐍𝐨𝐧𝐞"}
📍 𝐋𝐨𝐜𝐚𝐭𝐢𝐨𝐧: ${d.location || "𝐍𝐨𝐧𝐞"}
📧 𝐄𝐦𝐚𝐢𝐥: ${d.email || "𝐍𝐨𝐧𝐞"}
📝 𝐁𝐢𝐨: ${d.bio || "𝐍𝐨𝐧𝐞"}
🐦 𝐓𝐰𝐢𝐭𝐭𝐞𝐫: ${d.twitter || "𝐍𝐨𝐭 𝐬𝐞𝐭"}
📦 𝐑𝐞𝐩𝐨𝐬: ${d.public_repos || 0}
🗃 𝐆𝐢𝐬𝐭𝐬: ${d.public_gists || 0}
👥 𝐅𝐨𝐥𝐥𝐨𝐰𝐞𝐫𝐬: ${d.followers || 0}
👣 𝐅𝐨𝐥𝐥𝐨𝐰𝐢𝐧𝐠: ${d.following || 0}
📆 𝐂𝐫𝐞𝐚𝐭𝐞𝐝: ${formatDate(d.created_at)}
🔄 𝐔𝐩𝐝𝐚𝐭𝐞𝐝: ${formatDate(d.updated_at)}`;
      const reply = { body: msg };
      if (d.avatar) reply.attachment = await global.utils.getStreamFromURL(d.avatar);
      await api.sendMessage(reply, event.threadID, event.messageID);
    } catch (e) {
      console.error(e);
      api.sendMessage("❌ 𝐅𝐚𝐢𝐥𝐞𝐝 𝐭𝐨 𝐠𝐞𝐭 𝐆𝐢𝐭𝐇𝐮𝐛 𝐮𝐬𝐞𝐫 𝐢𝐧𝐟𝐨.", event.threadID, event.messageID);
    }
  }
};
