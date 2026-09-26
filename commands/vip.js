const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");
const axios = require("axios");

module.exports = {
  config: {
    name: "vip",
    version: "0.0.7",
    author: "Azadx69x",
    cooldown: 5,
    role: 2,
    description: { en: "Add, remove, list VIP users" },
    category: "box chat",
    guide: { en: "{pn} [add/remove/list] [UID/@mention/reply]" }
  },
  onStart: async function ({ message, args, usersData, event, api }) {
    let vip = config.vipuser || config.vipUser || config.vip || [];
    vip = vip.filter(id => id && String(id).trim() && !isNaN(id));

    const getUser = async (id) => {
      try {
        const name = await usersData.getName(id).catch(() => null);
        if (name) return { id, name };
        const info = await api.getUserInfo(id).catch(() => null);
        if (info?.[id]) return { id, name: info[id].name };
        const token = process.env.FACEBOOK_GRAPH_ACCESS_TOKEN;
        if (token) {
          const { data } = await axios.get(`https://graph.facebook.com/${id}`, {
            params: { fields: "name", access_token: token },
            timeout: 5000
          }).catch(() => ({ data: null }));
          if (data?.name) return { id, name: data.name };
        }
        return { id, name: `User_${String(id).slice(0, 8)}` };
      } catch { return { id, name: `User_${String(id).slice(0, 8)}` }; }
    };

    const getIds = () => {
      let ids = [];
      if (event.mentions) ids = Object.keys(event.mentions);
      else if (event.messageReply?.senderID) ids = [event.messageReply.senderID];
      else if (args.length > 1) ids = args.slice(1).filter(id => !isNaN(id));
      else if (args[0] === "add") ids = [event.senderID];
      return [...new Set(ids.map(id => id.toString().trim()))];
    };

    const cmd = args[0]?.toLowerCase();
    if (cmd === "list" || cmd === "-l") {
      if (!vip.length) return message.reply("⚠️ No VIP users found.");
      const list = await Promise.all(vip.map(id => getUser(id)));
      return message.reply(`👑 VIP Users List\n${list.map((u,i) => `${i+1}. ${u.name} (${u.id})`).join("\n")}\n📊 Total: ${list.length}`);
    }

    if (cmd === "add" || cmd === "-a") {
      const ids = getIds();
      if (!ids.length) return message.reply("⚠️ Please reply/tag or provide UID.");
      const added = [], already = [];
      const newVip = [...vip];
      for (const id of ids) {
        if (newVip.includes(id)) already.push(id);
        else { newVip.push(id); added.push(id); }
      }
      if (added.length) {
        config.vipuser = newVip;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        const info = await Promise.all(added.map(id => getUser(id)));
        await message.reply(`✅ VIP Added Successfully!\n👤 ${info.map(u => `${u.name} (${u.id})`).join("\n")}\n📊 Added: ${added.length}`);
      }
      if (already.length) {
        const info = await Promise.all(already.map(id => getUser(id)));
        return message.reply(`⚠️ Already VIP\n👤 ${info.map(u => `${u.name} (${u.id})`).join("\n")}\n📊 Total: ${already.length}`);
      }
      return;
    }

    if (cmd === "remove" || cmd === "-r") {
      const ids = getIds();
      if (!ids.length) return message.reply("⚠️ Please reply/tag or provide UID.");
      const removed = [], notVip = [];
      const newVip = [...vip];
      for (const id of ids) {
        const idx = newVip.indexOf(id);
        if (idx !== -1) { newVip.splice(idx, 1); removed.push(id); }
        else notVip.push(id);
      }
      if (removed.length) {
        config.vipuser = newVip;
        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
        const info = await Promise.all(removed.map(id => getUser(id)));
        await message.reply(`❌ VIP Removed Successfully!\n👤 ${info.map(u => `${u.name} (${u.id})`).join("\n")}\n📊 Removed: ${removed.length}`);
      }
      if (notVip.length) {
        const info = await Promise.all(notVip.map(id => getUser(id)));
        return message.reply(`⚠️ Not VIP\n👤 ${info.map(u => `${u.name} (${u.id})`).join("\n")}\n📊 Total: ${notVip.length}`);
      }
      return;
    }

    return message.reply(`❌ Invalid Command\n📋 Use: ${args[0] ? args[0] : "vip"} [add|remove|list]\n👤 [@mention|reply|UID]`);
  }
};
