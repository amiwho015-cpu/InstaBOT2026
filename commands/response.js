/**
 * @author frnAlt & Gtajisan
 * Floppa Strong Response & Auto-Reply Database Command (scripts/cmds/response.js)
 * 
 * Allows users and admins to manage taught responses, fuzzy auto-replies, and view response database metrics.
 */

"use strict";

const responseDB = require("../../database/controller/responseDB.js");

module.exports = {
  config: {
    name: "response",
    aliases: ["teach", "autoreply", "rep"],
    version: "2.0.0",
    author: "frnAlt & Gtajisan",
    cooldown: 2,
    role: 0,
    shortDescription: {
      en: "Manage taught responses, auto-replies, and view response database stats",
      vi: "Quản lý câu trả lời tự động và thống kê cơ sở dữ liệu phản hồi"
    },
    longDescription: {
      en: "Teach Floppa custom responses, view taught triggers, manage thread auto-replies, and inspect persistent response database metrics.",
      vi: "Dạy Floppa các câu trả lời tùy chỉnh, xem danh sách và thống kê cơ sở dữ liệu phản hồi."
    },
    category: "chat",
    guide: {
      en: "   {pn} teach <trigger> - <response> : Teach a new response\n" +
          "   {pn} list [page] : View list of taught responses\n" +
          "   {pn} test <message> : Test response match for a message\n" +
          "   {pn} remove <trigger> [index] : Remove a trigger or specific variation\n" +
          "   {pn} edit <trigger> - <old> - <new> : Edit a response variation\n" +
          "   {pn} stats : View response database & AI cache statistics\n" +
          "   {pn} toggle [on|off] : Enable or disable auto-replies in this thread\n" +
          "   {pn} clear : Clear all custom responses for this thread",
      vi: "   {pn} teach <từ khóa> - <câu trả lời> : Dạy câu trả lời mới\n" +
          "   {pn} list [trang] : Xem danh sách câu trả lời\n" +
          "   {pn} stats : Xem thống kê cơ sở dữ liệu phản hồi"
    }
  },

  onStart: async function ({ api, event, args, message, prefix, role }) {
    const rawArgs = args.join(" ").trim();
    const subCommand = (args[0] || "").toLowerCase();
    const threadID = String(event.threadID);
    const senderID = String(event.senderID);

    // ── Shorthand: !teach <trigger> - <response> ──
    if (subCommand === "teach" || subCommand === "add") {
      const rest = args.slice(1).join(" ");
      const parts = rest.split(/\s+-\s+/);

      if (parts.length < 2 || !parts[0].trim() || !parts[1].trim()) {
        return message.reply(`❌ Invalid format!\n\n💡 Usage: ${prefix}response teach <trigger> - <response>\nExample: ${prefix}response teach hello - Hello there! How are you?`);
      }

      const trigger = parts[0].trim();
      const reply = parts.slice(1).join(" - ").trim();
      const isGlobal = role >= 1; // Admins teach globally, normal users teach in current thread

      try {
        const entry = responseDB.add(trigger, reply, {
          threadID: isGlobal ? null : threadID,
          author: senderID,
          isGlobal
        });

        return message.reply(
          `✅ Response successfully taught!\n\n` +
          `🎯 Trigger: "${trigger}"\n` +
          `💬 Response: "${reply}"\n` +
          `🌐 Scope: ${isGlobal ? "Global (All Threads)" : "Thread-Specific"}\n` +
          `🔢 Total Variations: ${entry.responses.length}`
        );
      } catch (err) {
        return message.reply(`❌ Failed to teach response: ${err.message}`);
      }
    }

    // Direct teach without subcommand if " - " exists: !teach hello - hi
    if (rawArgs.includes(" - ") && !["edit"].includes(subCommand)) {
      const parts = rawArgs.split(/\s+-\s+/);
      if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
        const trigger = parts[0].trim();
        const reply = parts.slice(1).join(" - ").trim();
        const isGlobal = role >= 1;

        try {
          const entry = responseDB.add(trigger, reply, {
            threadID: isGlobal ? null : threadID,
            author: senderID,
            isGlobal
          });

          return message.reply(
            `✅ Response successfully taught!\n\n` +
            `🎯 Trigger: "${trigger}"\n` +
            `💬 Response: "${reply}"\n` +
            `🌐 Scope: ${isGlobal ? "Global (All Threads)" : "Thread-Specific"}\n` +
            `🔢 Total Variations: ${entry.responses.length}`
          );
        } catch (err) {
          return message.reply(`❌ Failed to teach response: ${err.message}`);
        }
      }
    }

    // ── Subcommand: list [page] ──
    if (subCommand === "list" || subCommand === "all") {
      const page = parseInt(args[1], 10) || 1;
      const { items, total, totalPages } = responseDB.list({ threadID, page, limit: 10 });

      if (items.length === 0) {
        return message.reply(`📭 No taught responses found in the database.\n\n💡 Teach one with: ${prefix}response teach <trigger> - <reply>`);
      }

      let text = `📚 ═══ TAUGHT RESPONSES (Page ${page}/${totalPages} | Total: ${total}) ═══\n\n`;
      items.forEach((item, i) => {
        const num = (page - 1) * 10 + i + 1;
        const preview = item.responses.slice(0, 2).map(r => `"${r}"`).join(", ");
        const more = item.responses.length > 2 ? ` (+${item.responses.length - 2} more)` : "";
        text += `${num}. [${item.isGlobal ? "Global" : "Thread"}] "${item.trigger}" ➔ ${preview}${more}\n`;
      });
      text += `\n💡 Page navigation: ${prefix}response list <page>`;
      return message.reply(text);
    }

    // ── Subcommand: test <message> ──
    if (subCommand === "test") {
      const query = args.slice(1).join(" ").trim();
      if (!query) return message.reply(`❌ Usage: ${prefix}response test <message to test>`);

      const matched = responseDB.get(query, { threadID });
      if (!matched) {
        return message.reply(`🔍 No matching response found in the database for: "${query}"`);
      }

      return message.reply(
        `🎯 Match Found!\n\n` +
        `🔑 Trigger: "${matched.trigger}"\n` +
        `💬 Reply: "${matched.reply}"\n` +
        `🌐 Scope: ${matched.scope}\n` +
        `📈 Usage Count: ${matched.usageCount}`
      );
    }

    // ── Subcommand: edit <trigger> - <old> - <new> ──
    if (subCommand === "edit") {
      const rest = args.slice(1).join(" ");
      const parts = rest.split(/\s+-\s+/);

      if (parts.length < 3) {
        return message.reply(`❌ Invalid format!\n\n💡 Usage: ${prefix}response edit <trigger> - <oldReply> - <newReply>`);
      }

      const trigger = parts[0].trim();
      const oldReply = parts[1].trim();
      const newReply = parts[2].trim();

      const success = responseDB.edit(trigger, oldReply, newReply, { threadID });
      if (success) {
        return message.reply(`✅ Successfully updated response for trigger "${trigger}"!`);
      } else {
        return message.reply(`❌ Could not find matching trigger or reply to edit.`);
      }
    }

    // ── Subcommand: remove / delete ──
    if (subCommand === "remove" || subCommand === "delete" || subCommand === "rm") {
      const trigger = args[1];
      const index = args[2] ? parseInt(args[2], 10) : undefined;

      if (!trigger) {
        return message.reply(`❌ Usage: ${prefix}response remove <trigger> [index]`);
      }

      const success = responseDB.remove(trigger, { threadID, index });
      if (success) {
        return message.reply(`🗑️ Successfully removed "${trigger}" from the response database.`);
      } else {
        return message.reply(`❌ Trigger "${trigger}" not found.`);
      }
    }

    // ── Subcommand: stats ──
    if (subCommand === "stats" || subCommand === "info") {
      const stats = responseDB.getStats();
      return message.reply(
        `📊 ═══ RESPONSE DATABASE METRICS ═══\n\n` +
        `🎯 Taught Triggers  : ${stats.totalTriggers}\n` +
        `💬 Total Responses  : ${stats.totalResponses}\n` +
        `⚡ AI Cache Entries : ${stats.aiCacheEntries}\n` +
        `🚀 AI Cache Hits    : ${stats.cacheHits}\n` +
        `🧠 Active Chats     : ${stats.activeConversations}\n` +
        `📈 Total Auto-replies: ${stats.totalReplied}\n` +
        `💾 Database File    : responseDB.json (${stats.storageSizeKb} KB)\n` +
        `🛡️ Storage Engine   : Safe Atomic Engine with .bak Auto-Recovery`
      );
    }

    // ── Subcommand: toggle [on|off] ──
    if (subCommand === "toggle") {
      const current = responseDB.getSetting(threadID, "autoReply", true);
      const newState = args[1] ? args[1].toLowerCase() === "on" : !current;
      responseDB.setSetting(threadID, "autoReply", newState);
      return message.reply(`⚙️ Auto-replies are now ${newState ? "ENABLED ✅" : "DISABLED ❌"} in this thread.`);
    }

    // ── Subcommand: clear ──
    if (subCommand === "clear") {
      const cleared = responseDB.clear(threadID);
      return message.reply(`🧹 Cleared ${cleared} custom response(s) for this thread.`);
    }

    // Default Guide
    return message.reply(
      `╭─── [ 🤖 RESPONSE DATABASE ] ───╮\n` +
      `│ 💡 ${prefix}response teach <trig> - <rep>\n` +
      `│ 💡 ${prefix}response list [page]\n` +
      `│ 💡 ${prefix}response test <msg>\n` +
      `│ 💡 ${prefix}response remove <trig>\n` +
      `│ 💡 ${prefix}response stats\n` +
      `│ 💡 ${prefix}response toggle [on/off]\n` +
      `╰────────────────────────────────╯`
    );
  }
};
