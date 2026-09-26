const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const BATCH_SIZE = 20;
const ADD_DELAY = 1500;
const activeRuns = global.__addMemRuns || (global.__addMemRuns = new Set());

module.exports = {
  config: {
    name: "addmem",
    version: "1.0.0",
    author: "Azadx69x",
    cooldown: 5,
    role: 6,
    shortDescription: { en: "Add members from the bot's other groups" },
    longDescription: {
      en: "Add up to 20 unique members from the bot's other group chats to this group."
    },
    category: "owner",
    guide: {
      en: "{pn} on - add the next 20 members\n{pn} off - stop adding members\n{pn} status - show the current state"
    }
  },

  onStart: async function ({ api, event, args, message, threadsData }) {
    if (!event.isGroup) {
      return message.reply("❌ Please use this command in a group chat.");
    }

    const action = (args[0] || "").toLowerCase();
    const threadID = String(event.threadID);

    if (action === "off") {
      await threadsData.set(event.threadID, false, "data.addmem.enabled");
      return message.reply("addmem off ❌");
    }

    if (action === "status") {
      const enabled = await threadsData.get(event.threadID, "data.addmem.enabled", false);
      return message.reply(enabled ? "✅ Addmem is enabled." : "⏸️ Addmem is disabled.");
    }

    if (action !== "on") {
      return message.reply("Usage:\naddmem on\naddmem off\naddmem status");
    }

    if (activeRuns.has(threadID)) {
      return message.reply("⏳ An addmem batch is already running in this group.");
    }

    await threadsData.set(event.threadID, true, "data.addmem.enabled");
    activeRuns.add(threadID);
    await message.reply("addmem on ✅");

    let added = 0;
    let failed = 0;

    try {
      const targetInfo = await api.getThreadInfo(event.threadID);
      const targetMembers = new Set((targetInfo.participantIDs || []).map(String));
      const botID = String(api.getCurrentUserID());
      const candidates = new Set();
      const threads = await api.getThreadList(5000, null, ["INBOX"]);
      const sourceGroups = (threads || []).filter(thread =>
        String(thread.threadID) !== threadID && thread.isGroup === true
      );

      for (const thread of sourceGroups) {
        if (candidates.size >= BATCH_SIZE) break;
        if (!await threadsData.get(event.threadID, "data.addmem.enabled", false)) break;
        try {
          const info = await api.getThreadInfo(thread.threadID);
          for (const userID of info.participantIDs || []) {
            const id = String(userID);
            if (id !== botID && !targetMembers.has(id)) {
              candidates.add(id);
              if (candidates.size >= BATCH_SIZE) break;
            }
          }
        }
        catch (error) {
          console.log(`[ADDMEM] Could not read group ${thread.threadID}:`, error.message);
        }
      }

      for (const userID of candidates) {
        if (added >= BATCH_SIZE) break;
        if (!await threadsData.get(event.threadID, "data.addmem.enabled", false)) break;

        try {
          await api.addUserToGroup(userID, event.threadID);
          targetMembers.add(userID);
          added++;
          await sleep(ADD_DELAY);
        }
        catch (error) {
          failed++;
          console.log(`[ADDMEM] Could not add ${userID}:`, error?.message || error);
        }
      }

      const stopped = !await threadsData.get(event.threadID, "data.addmem.enabled", false);
      await threadsData.set(event.threadID, false, "data.addmem.enabled");

      return message.reply(
        `✅ Addmem batch completed.\n` +
        `👥 Added: ${added}/${BATCH_SIZE}\n` +
        `❌ Failed: ${failed}\n` +
        `${stopped ? "🛑 The batch was stopped with addmem off." : "⏸️ Use addmem on again for the next 20 members."}`
      );
    }
    catch (error) {
      await threadsData.set(event.threadID, false, "data.addmem.enabled");
      console.error("[ADDMEM CMD ERROR]", error);
      return message.reply("❌ Members could not be added. Check the bot's group access/admin permissions.");
    }
    finally {
      activeRuns.delete(threadID);
    }
  }
};
