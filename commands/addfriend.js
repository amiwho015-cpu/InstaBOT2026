module.exports = {
  config: {
    name: "addfriend",
    aliases: ["adfd"],
    version: "0.0.7",
    author: "Azadx69x",
    cooldown: 10,
    role: 6,
    shortDescription: { en: "Auto send friend requests to public users" },
    description: { en: "Automatically find public users and send friend requests." },
    category: "owner",
    guide: { en: "{pn} <count> - Auto add random public users" }
  },
  onStart: async function ({ api, message, args, event }) {
    try {
      let count = parseInt(args[0]);
      if (!count || isNaN(count) || count < 1) return message.reply("❌ Please provide a valid number.");
      if (count > 50) return message.reply(`⚠️ Maximum limit is 50 per command.\n📊 You requested: ${count}`);
      
      await message.reply("⏳ Starting friend request...");
      
      let added = 0, failed = 0, skipped = 0, processedUsers = new Set();
      const threads = await api.getThreadList(100, null, ["INBOX", "GROUP"]);
      if (!threads || threads.length === 0) return message.reply("❌ No threads found to search for users.");
      
      for (const thread of threads) {
        if (added >= count) break;
        try {
          const threadInfo = await api.getThreadInfo(thread.threadID);
          const participants = threadInfo.participantIDs || [];
          for (const userID of participants) {
            if (added >= count) break;
            if (processedUsers.has(userID)) continue;
            processedUsers.add(userID);
            if (userID === api.getCurrentUserID()) continue;
            try {
              const userInfo = await api.getUserInfo(userID);
              const user = userInfo[userID];
              if (!user) continue;
              if (user.isFriend) { skipped++; continue; }
              if (user.isFriend === false) {
                const result = await api.sendFriendRequest(userID);
                if (result && (result.success || result.friendshipStatus === "OUTGOING_REQUEST_SENT")) {
                  added++;
                  await new Promise(resolve => setTimeout(resolve, 2000));
                } else failed++;
              }
            } catch (userError) { continue; }
          }
        } catch (threadError) { continue; }
      }
      
      const report = 
`✅ AUTO FRIEND REQUEST COMPLETE
📊 Total Requested: ${count}
✅ Successfully Sent: ${added}
❌ Failed: ${failed}
⏭️ Skipped Already Friends: ${skipped}`;
      
      return message.reply(report);
    } catch (error) {
      console.error("AutoAddFriend Error:", error);
      return message.reply(`❌ Error: ${error.message || "Unknown error occurred"}`);
    }
  },
  onChat: async function ({ api, message, args, event }) {
    if (!args || args.length === 0) {
      const body = event.body || "";
      const parts = body.trim().split(/\s+/);
      if (parts.length < 2) return;
      const cmd = parts[0].toLowerCase().replace(/^[!\.\/]/, "");
      if (cmd === "addfriend" || cmd === "adfd") {
        const num = parseInt(parts[1]);
        if (!isNaN(num) && num > 0) {
          return this.onStart({ api, message, args: [num], event });
        }
      }
      return;
    }
    const firstArg = args[0].toLowerCase();
    if (firstArg === "adfd" && args[1]) return this.onStart({ api, message, args: [args[1]], event });
    if (this.config.aliases.includes(firstArg) && args[1]) return this.onStart({ api, message, args: [args[1]], event });
  }
};
