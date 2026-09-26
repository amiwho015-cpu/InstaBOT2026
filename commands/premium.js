const { writeFileSync, readFileSync, existsSync } = require("fs");
const path = require("path");

module.exports = {
  config: {
    name: "premium",
    aliases: ["prem"],
    version: "0.0.7",
    author: "Azadx69x",
    role: 3,
    shortDescription: { en: "Manage premium users" },
    category: "owner",
    guide: { en: "{pn} list\n{pn} add <uid|@mention>\n{pn} remove <uid|@mention>" }
  },
  onStart: async function ({ message, args, event, api }) {
    const cfgPath = global.GoatBot?.config?.path || global.GoatBot?.dirConfig || path.join(process.cwd(), "config.json");
    let cfg = {};
    try { if (existsSync(cfgPath)) cfg = JSON.parse(readFileSync(cfgPath, "utf8")); } catch (e) { return message.reply(`❌ ${e.message}`); }
    let prem = Array.isArray(cfg.premium) ? cfg.premium.map(i => typeof i === "string" ? { uid: i } : i) : [];
    if (!args || !args[0]) return message.reply("⚠️ Use: list, add, remove");

    const getName = async (uid) => { try { const info = await api.getUserInfo(uid); return info?.[uid]?.name || "Unknown"; } catch { return "Unknown"; } };
    const fmt = async (uid) => `👨‍💻 ${await getName(uid)} (${uid})`;

    if (args[0] === "list" || args[0] === "-l") {
      if (!prem.length) return message.reply("⚠️ No premium users.");
      const list = await Promise.all(prem.map(u => fmt(u.uid)));
      return message.reply("💎 Premium Users:\n" + list.join("\n"));
    }

    let uids = [];
    if (Object.keys(event.mentions || {}).length) uids = Object.keys(event.mentions);
    else if (event.messageReply) uids = [event.messageReply.senderID];
    else uids = args.slice(1).filter(a => /^\d+$/.test(a));
    if (!uids.length) return message.reply("⚠️ UID/mention needed.");
    if (!["add", "remove"].includes(args[0])) return message.reply("⚠️ Use: add or remove");

    uids = [...new Set(uids)];
    const added = [], removed = [], existed = [], notFound = [];
    for (const uid of uids) {
      const idx = prem.findIndex(u => u.uid === uid);
      if (args[0] === "add") {
        if (idx !== -1) existed.push(uid);
        else { prem.push({ uid }); added.push(uid); }
      } else {
        if (idx === -1) notFound.push(uid);
        else { prem.splice(idx, 1); removed.push(uid); }
      }
    }
    try { cfg.premium = prem; writeFileSync(cfgPath, JSON.stringify(cfg, null, 2)); } catch (e) { return message.reply(`❌ ${e.message}`); }

    const fmtArr = async (arr) => (await Promise.all(arr.map(fmt))).join("\n");
    let msg = "";
    if (added.length) msg += "✅ Added:\n" + (await fmtArr(added)) + "\n";
    if (removed.length) msg += "❌ Removed:\n" + (await fmtArr(removed)) + "\n";
    if (existed.length) msg += "⚠️ Already:\n" + (await fmtArr(existed)) + "\n";
    if (notFound.length) msg += "⚠️ Not premium:\n" + (await fmtArr(notFound)) + "\n";
    return message.reply(msg.trim() || "⚠️ No changes.");
  }
};
