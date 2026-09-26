const fs = require("fs");
const path = require("path");
const COUNTER_FILE = path.join(__dirname, "..", "unfriend_counter.json");
let removedCount = 0;
try { if (fs.existsSync(COUNTER_FILE)) removedCount = JSON.parse(fs.readFileSync(COUNTER_FILE)).count || 0; } catch (e) {}
const save = () => { try { fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count: removedCount, lastUpdated: Date.now() })); } catch (e) {} };

module.exports = {
    config: {
        name: "unfriend",
        version: "0.0.7",
        author: "Azadx69x",
        role: 4,
        cooldown: 5,
        shortDescription: { en: "Unfriend System" },
        category: "owner",
        guide: { en: "{p}unfriend all | inactive [days] | friend" }
    },
    onStart: async function ({ api, event, args, message }) {
        const cmd = args[0]?.toLowerCase();
        if (!cmd) return message.reply("📋 Usage:\n• all → Remove ALL (confirm)\n• inactive 30 → Remove 30+ days inactive\n• friend → Count friends");
        try {
            const friends = await api.getFriendsList();
            if (cmd === "friend" || cmd === "count") {
                const valid = friends.filter(f => f.userID && String(f.userID).length > 3);
                return message.reply(`👥 Friends: ${friends.length}\nValid: ${valid.length}\nBot UID: ${api.getCurrentUserID()}`);
            }
            if (!friends?.length) return message.reply("❌ No friends.");
            const validFriends = friends.filter(f => f.userID && String(f.userID).length > 3);
            if (!validFriends.length) return message.reply("❌ No valid friends.");
            let target = [], reason = "";
            if (cmd === "all") {
                if (args[1] !== "confirm") return message.reply(`⚠️ Unfriend ALL ${validFriends.length} friends?\nType: ${args[0]} all confirm`);
                target = validFriends; reason = "All";
            } else if (cmd === "inactive") {
                const days = parseInt(args[1]) || 30;
                const inbox = await api.getThreadList(200, null, ["INBOX"]);
                const lastChat = new Map();
                for (const t of inbox) if (t.participantIDs) for (const uid of t.participantIDs) {
                    const ts = new Date(t.lastMessageTimestamp).getTime() || 0;
                    if (ts > (lastChat.get(uid) || 0)) lastChat.set(uid, ts);
                }
                const cutoff = Date.now() - days * 86400000;
                target = validFriends.filter(f => (lastChat.get(f.userID) || 0) < cutoff);
                reason = `Inactive ${days}+ days`;
            } else return message.reply("❌ Invalid. Use: all, inactive, friend");
            if (!target.length) return message.reply("✅ No matches.");
            if (target.length > 10 && args[1] !== "confirm" && cmd !== "all")
                return message.reply(`⚠️ Unfriend ${target.length} friends.\nType: ${args[0]} ${cmd} confirm`);
            let removed = 0, failed = 0, start = Date.now();
            for (let i = 0; i < target.length; i++) {
                try {
                    await api.unfriend(target[i].userID);
                    removed++; removedCount++;
                    if ((i+1) % 10 === 0 || i === target.length-1)
                        await message.reply(`🔄 ${i+1}/${target.length} | ✅ ${removed} | ❌ ${failed}`);
                    await new Promise(r => setTimeout(r, 1000 + Math.random() * 500));
                } catch (e) { failed++; console.error(e); await new Promise(r => setTimeout(r, 2000)); }
            }
            save();
            return message.reply(`✅ Done\n📊 Target: ${target.length}\n✅ Removed: ${removed}\n❌ Failed: ${failed}\n⏱️ ${((Date.now()-start)/1000).toFixed(1)}s\n📈 Total: ${removedCount}`);
        } catch (err) { console.error(err); return message.reply(`❌ ${err.message}`); }
    }
};
