/**
 * @author frnAlt / Gtajisan (Farhan Muh Tasim)
 * ! Floppa-Chatbot Advanced Direct Message (DM) Controller
 * ! Bypasses Facebook Messenger E2EE (Error 1545116) using dedicated 2-person unencrypted private rooms.
 * ! Provides full user room management and powerful admin controls (send, list, broadcast, info, clear, test, bidirectional reply relay).
 */

"use strict";

const path = require("path");

function getPrivateManager() {
  if (global.privateThreadManager) return global.privateThreadManager;
  try {
    return require(path.join(process.cwd(), "func/privateThreadManager"));
  } catch (_) {
    return null;
  }
}

function isAdmin(senderID) {
  const cfg = global.GoatBot?.config || {};
  const admins = [
    ...(cfg.adminBot || []),
    ...(cfg.devUsers || [])
  ].map(String);
  return admins.includes(String(senderID));
}

module.exports = {
  config: {
    name: "dm",
    aliases: ["pm", "direct", "privatedm", "privateroom"],
    version: "2.0.0",
    author: "frnAlt",
    cooldown: 3,
    role: 0,
    shortDescription: {
      en: "Direct Message control, unencrypted private rooms, and bi-directional admin relay",
      vi: "Quản lý tin nhắn Direct Message, phòng riêng không mã hóa và chuyển tiếp admin hai chiều"
    },
    longDescription: {
      en: "Overcomes Facebook Messenger E2EE restrictions (error 1545116) by creating dedicated 2-person unencrypted private rooms. Allows users to create or access their 1-on-1 Floppa room, and empowers bot admins to send direct messages with media, broadcast announcements, manage private rooms, inspect connectivity, and interact via bi-directional reply relays."
    },
    category: "communication",
    guide: {
      en: "   {pn}: Get or create your dedicated unencrypted Floppa room\n" +
          "   {pn} room: Same as {pn}\n" +
          "   {pn} info: Check your DM room and connectivity status\n\n" +
          "👑 Bot Admin Commands:\n" +
          "   {pn} send <uid | @tag> <text>: Send a DM to a user (supports attachments & reply bridge)\n" +
          "   {pn} room <uid>: Fetch or create a private room for a specific user\n" +
          "   {pn} list: List all registered private DM threads\n" +
          "   {pn} broadcast <text>: Broadcast announcement to all users with private rooms\n" +
          "   {pn} info <uid>: View DM connection and room info for a user\n" +
          "   {pn} clear <uid>: Reset/remove cached private room mapping\n" +
          "   {pn} test <uid>: Ping a user's private room to verify latency and delivery"
    }
  },

  onStart: async function ({ api, event, args, message, usersData }) {
    const pMgr = getPrivateManager();
    if (!pMgr) {
      return message.reply("❌ Private Thread Manager is unavailable on this system.");
    }

    const sub = (args[0] || "").toLowerCase();

    // ──────────────── Subcommand: SEND (Admin Only) ────────────────
    if (sub === "send" || sub === "to") {
      if (!isAdmin(event.senderID)) {
        return message.reply("❌ Permission denied. Only Bot Admins can send direct messages via !dm send.");
      }

      let targetUID = null;
      let text = "";

      if (event.messageReply) {
        targetUID = String(event.messageReply.senderID);
        text = args.slice(1).join(" ").trim();
      } else if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetUID = String(Object.keys(event.mentions)[0]);
        text = args.slice(1).join(" ").replace(/@\S+/g, "").trim();
      } else if (args[1] && !isNaN(args[1])) {
        targetUID = String(args[1]);
        text = args.slice(2).join(" ").trim();
      }

      if (!targetUID) {
        return message.reply("⚠️ Usage: !dm send <uid | @mention> <message>\nOr reply to a user's message with: !dm send <message>");
      }

      // Collect attachments from current message or replied message
      const rawAttachments = [
        ...(event.attachments || []),
        ...(event.messageReply?.attachments || [])
      ].filter(item => item && ["photo", "png", "animated_image", "video", "audio", "file"].includes(item.type));

      let streamAttachments = [];
      if (rawAttachments.length > 0 && global.utils?.getStreamsFromAttachment) {
        try {
          streamAttachments = await global.utils.getStreamsFromAttachment(rawAttachments);
        } catch (attErr) {
          console.warn("[DM_CMD] Failed streaming attachments:", attErr.message);
        }
      }

      if (!text && streamAttachments.length === 0) {
        return message.reply("⚠️ Please provide a message or attach media to send.");
      }

      const senderName = (await usersData.getName(event.senderID)) || "Bot Admin";
      const recipientName = (await usersData.getName(targetUID)) || `User ${targetUID}`;

      const dmPayload = {
        body: `👑 ⌈ Direct Message from Admin ⌋\n` +
              `👤 From: ${senderName}\n` +
              `────────────────────\n` +
              `${text || "(Media Attachment)"}\n` +
              `────────────────────\n` +
              `💬 Reply to this message to send a response back to the admin!`,
        attachment: streamAttachments
      };

      try {
        const sent = await pMgr.sendDM(api, targetUID, dmPayload);

        // Register bidirectional reply relay
        if (sent?.messageID && global.GoatBot?.onReply) {
          global.GoatBot.onReply.set(sent.messageID, {
            commandName: "dm",
            adminUID: String(event.senderID),
            adminThreadID: String(event.threadID),
            adminMessageID: String(event.messageID),
            targetUID: String(targetUID),
            type: "user_to_admin"
          });
        }

        return message.reply(
          `✅ ⌈ DM Delivered Successfully ⌋\n` +
          `────────────────────\n` +
          `👤 Recipient: ${recipientName} (${targetUID})\n` +
          `🆔 Destination: Thread ${sent?.threadID || "N/A"}\n` +
          `📦 Routing: ${sent?.deliveryMethod || "private_room"}\n` +
          `💬 Preview: "${text ? (text.length > 80 ? text.slice(0, 80) + "..." : text) : "Media Attachment"}"\n` +
          `────────────────────\n` +
          `🔄 Bidirectional reply tracking is active! Any reply from the user will be relayed here.`
        );
      } catch (err) {
        return message.reply(`❌ Failed to deliver DM to ${recipientName} (${targetUID}): ${err.message || err}`);
      }
    }

    // ──────────────── Subcommand: LIST (Admin Only) ────────────────
    if (sub === "list" || sub === "all") {
      if (!isAdmin(event.senderID)) {
        return message.reply("❌ Permission denied. Only Bot Admins can view the full private room directory.");
      }

      const threads = pMgr.getAllPrivateThreads();
      if (!threads || threads.length === 0) {
        return message.reply("📋 No private DM rooms are currently registered.");
      }

      const listStr = threads.map((t, idx) => {
        return `${idx + 1}. ${t.userName} (${t.userID})\n   └ Thread ID: ${t.threadID}\n   └ Link: https://m.me/${t.threadID}`;
      }).join("\n\n");

      return message.reply(
        `📋 ⌈ Registered Floppa Private DM Rooms (${threads.length}) ⌋\n` +
        `────────────────────\n` +
        listStr + `\n` +
        `────────────────────\n` +
        `ℹ️ All rooms are unencrypted 2-person groups that completely bypass Facebook E2EE.`
      );
    }

    // ──────────────── Subcommand: BROADCAST (Admin Only) ────────────────
    if (sub === "broadcast" || sub === "bc" || sub === "announce") {
      if (!isAdmin(event.senderID)) {
        return message.reply("❌ Permission denied. Only Bot Admins can broadcast messages.");
      }

      const text = args.slice(1).join(" ").trim();
      if (!text && (!event.attachments || event.attachments.length === 0)) {
        return message.reply("⚠️ Please provide an announcement message: !dm broadcast <message>");
      }

      const rawAttachments = (event.attachments || [])
        .filter(item => item && ["photo", "png", "animated_image", "video", "audio", "file"].includes(item.type));

      let streamAttachments = [];
      if (rawAttachments.length > 0 && global.utils?.getStreamsFromAttachment) {
        try {
          streamAttachments = await global.utils.getStreamsFromAttachment(rawAttachments);
        } catch (_) {}
      }

      const senderName = (await usersData.getName(event.senderID)) || "Bot Admin";
      const broadcastPayload = {
        body: `📢 ⌈ Floppa Bot Announcement ⌋\n` +
              `👤 From: ${senderName}\n` +
              `────────────────────\n` +
              `${text}\n` +
              `────────────────────\n` +
              `ℹ️ You are receiving this in your dedicated Floppa Private Room.`,
        attachment: streamAttachments
      };

      await message.reply("⏳ Starting broadcast to all registered private DM rooms with rate-limit protection...");

      const results = await pMgr.broadcastDM(api, broadcastPayload, 1200);

      return message.reply(
        `📢 ⌈ DM Broadcast Completed ⌋\n` +
        `────────────────────\n` +
        `📊 Total Targets: ${results.total}\n` +
        `✅ Delivered: ${results.sent}\n` +
        `❌ Failed: ${results.failed}\n` +
        `────────────────────\n` +
        (results.failed > 0 ? `⚠️ Some rooms failed delivery (user may have left the room).` : `🎉 All rooms received the broadcast!`)
      );
    }

    // ──────────────── Subcommand: INFO / STATUS ────────────────
    if (sub === "info" || sub === "status") {
      let targetUID = String(event.senderID);

      if (args[1]) {
        if (!isAdmin(event.senderID)) {
          return message.reply("❌ You can only view your own DM info. Admin role required to inspect other users.");
        }
        if (event.mentions && Object.keys(event.mentions).length > 0) {
          targetUID = String(Object.keys(event.mentions)[0]);
        } else if (!isNaN(args[1])) {
          targetUID = String(args[1]);
        }
      }

      const userName = (await usersData.getName(targetUID)) || `User ${targetUID}`;
      const privateTID = pMgr.getPrivateThread(targetUID);

      return message.reply(
        `ℹ️ ⌈ DM Connectivity & Status ⌋\n` +
        `────────────────────\n` +
        `👤 User: ${userName} (${targetUID})\n` +
        `📬 Private Room: ${privateTID ? `Active (Thread: ${privateTID})` : "Not Created Yet"}\n` +
        `🛡️ E2EE Bypass: ${privateTID ? "Active (Unencrypted 2-Person Group)" : "Standard Direct (E2EE Active)"}\n` +
        `🔗 Messenger URL: ${privateTID ? `https://m.me/${privateTID}` : "N/A"}\n` +
        `────────────────────\n` +
        (privateTID ? `✅ Ready for direct unencrypted communication.` : `💡 Use "!dm room" to create your dedicated unencrypted room!`)
      );
    }

    // ──────────────── Subcommand: CLEAR / RESET (Admin Only) ────────────────
    if (sub === "clear" || sub === "reset" || sub === "remove") {
      if (!isAdmin(event.senderID)) {
        return message.reply("❌ Permission denied. Only Bot Admins can clear private room records.");
      }

      let targetUID = null;
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetUID = String(Object.keys(event.mentions)[0]);
      } else if (args[1] && !isNaN(args[1])) {
        targetUID = String(args[1]);
      }

      if (!targetUID) {
        return message.reply("⚠️ Usage: !dm clear <uid | @tag>");
      }

      const ok = pMgr.clearPrivateThread(targetUID);
      return message.reply(
        ok
          ? `🗑️ Successfully cleared cached private room mapping for UID: ${targetUID}.\nA new room will be created on the next interaction.`
          : `⚠️ UID ${targetUID} was not found in the private room registry.`
      );
    }

    // ──────────────── Subcommand: TEST / PING (Admin Only) ────────────────
    if (sub === "test" || sub === "ping") {
      if (!isAdmin(event.senderID)) {
        return message.reply("❌ Permission denied. Only Bot Admins can run DM test pings.");
      }

      let targetUID = null;
      if (event.mentions && Object.keys(event.mentions).length > 0) {
        targetUID = String(Object.keys(event.mentions)[0]);
      } else if (args[1] && !isNaN(args[1])) {
        targetUID = String(args[1]);
      } else {
        targetUID = String(event.senderID);
      }

      const userName = (await usersData.getName(targetUID)) || `User ${targetUID}`;
      const start = Date.now();

      try {
        const sent = await pMgr.sendDM(api, targetUID, {
          body: `🏓 ⌈ Floppa DM Diagnostic Ping ⌋\n` +
                `Timestamp: ${new Date().toISOString()}\n` +
                `System: Unencrypted 2-person room verified.\n` +
                `Latency test in progress.`
        });
        const latency = Date.now() - start;

        return message.reply(
          `🏓 ⌈ DM Test Result: SUCCESS ⌋\n` +
          `────────────────────\n` +
          `👤 Target: ${userName} (${targetUID})\n` +
          `🆔 Destination: Thread ${sent?.threadID || "N/A"}\n` +
          `📦 Routing: ${sent?.deliveryMethod || "private_room"}\n` +
          `⚡ Round-Trip Latency: ${latency}ms\n` +
          `────────────────────\n` +
          `✅ Direct messaging pipeline is 100% operational.`
        );
      } catch (tErr) {
        return message.reply(`❌ DM Test Failed for ${userName} (${targetUID}): ${tErr.message || tErr}`);
      }
    }

    // ──────────────── Default / ROOM / CREATE: User or Admin Room Setup ────────────────
    let targetUID = String(event.senderID);
    if ((sub === "room" || sub === "create") && args[1]) {
      if (isAdmin(event.senderID)) {
        if (event.mentions && Object.keys(event.mentions).length > 0) {
          targetUID = String(Object.keys(event.mentions)[0]);
        } else if (!isNaN(args[1])) {
          targetUID = String(args[1]);
        }
      }
    }

    const userName = (await usersData.getName(targetUID)) || `User ${targetUID}`;
    const existingTID = pMgr.getPrivateThread(targetUID);

    if (existingTID) {
      // Send a gentle ping into the room
      api.sendMessage(
        `🔔 ⌈ Room Reconnect ⌋\nHello ${userName}! You accessed your private Floppa room from thread ${event.threadID}. Bot commands and AI chat are ready here!`,
        existingTID
      ).catch(() => {});

      return message.reply(
        `📬 ⌈ Floppa Private Room ⌋\n` +
        `────────────────────\n` +
        `👤 User: ${userName} (${targetUID})\n` +
        `🆔 Thread ID: ${existingTID}\n` +
        `🛡️ Mode: Unencrypted 2-Person Room (E2EE Bypassed)\n` +
        `🔗 Link: https://m.me/${existingTID}\n` +
        `────────────────────\n` +
        `💬 Open the link or check Messenger to chat with Floppa privately!`
      );
    }

    // Room does not exist yet: create it now
    await message.reply("⏳ Creating your dedicated unencrypted Floppa room on Facebook Messenger...");

    try {
      const createdTID = await pMgr.getOrCreatePrivateThread(api, targetUID, userName);
      if (createdTID) {
        // Send initial greeting into the newly minted room
        api.sendMessage(
          `🎉 ⌈ Welcome to your Floppa Private Room ⌋\n` +
          `────────────────────\n` +
          `👋 Welcome, ${userName}!\n` +
          `• This is your dedicated, unencrypted private channel with Floppa Bot.\n` +
          `• Meta's 1-on-1 E2EE restrictions (error 1545116) are bypassed here.\n` +
          `• Feel free to run commands, chat with AI, or communicate with admins anytime!`,
          createdTID
        ).catch(() => {});

        return message.reply(
          `✅ ⌈ Floppa Private Room Created ⌋\n` +
          `────────────────────\n` +
          `👤 User: ${userName} (${targetUID})\n` +
          `🆔 Thread ID: ${createdTID}\n` +
          `🔗 Link: https://m.me/${createdTID}\n` +
          `────────────────────\n` +
          `💬 Click the link above or check your Messenger inbox to begin chatting privately!`
        );
      } else {
        return message.reply(
          `⚠️ Unable to automatically create a private room for ${userName}.\n` +
          `Please make sure the bot has interacted with you before or send the bot a friend request.`
        );
      }
    } catch (err) {
      return message.reply(`❌ Failed to create private room: ${err.message || err}`);
    }
  },

  // ──────────────── Bidirectional Reply Relay Listener ────────────────
  onReply: async function ({ api, event, Reply, message, usersData, commandName }) {
    const pMgr = getPrivateManager();
    const { type, adminUID, adminThreadID, adminMessageID, targetUID } = Reply;

    // 1. User replies to Admin's DM -> Forward to Admin
    if (type === "user_to_admin") {
      const senderName = (await usersData.getName(event.senderID)) || `User ${event.senderID}`;

      let streamAttachments = [];
      const rawAttachments = (event.attachments || [])
        .filter(item => item && ["photo", "png", "animated_image", "video", "audio", "file"].includes(item.type));

      if (rawAttachments.length > 0 && global.utils?.getStreamsFromAttachment) {
        try {
          streamAttachments = await global.utils.getStreamsFromAttachment(rawAttachments);
        } catch (_) {}
      }

      const forwardPayload = {
        body: `📨 ⌈ DM Reply from ${senderName} ⌋\n` +
              `👤 UID: ${event.senderID}\n` +
              `────────────────────\n` +
              `${event.body || "(Media Attachment)"}\n` +
              `────────────────────\n` +
              `💬 Reply to this message to send another DM back to ${senderName}!`,
        attachment: streamAttachments
      };

      try {
        const res = await api.sendMessage(forwardPayload, adminThreadID, undefined, adminMessageID, true);
        if (message?.reaction) message.reaction("📨");

        // Set up the return relay so admin can reply again
        if (res?.messageID && global.GoatBot?.onReply) {
          global.GoatBot.onReply.set(res.messageID, {
            commandName,
            adminUID,
            adminThreadID,
            targetUID: String(event.senderID),
            userThreadID: String(event.threadID),
            type: "admin_to_user"
          });
        }
      } catch (relayErr) {
        console.error("[DM_RELAY] Failed to relay user reply to admin:", relayErr.message);
      }
      return;
    }

    // 2. Admin replies to User's message -> Forward to User
    if (type === "admin_to_user") {
      const adminName = (await usersData.getName(event.senderID)) || "Bot Admin";

      let streamAttachments = [];
      const rawAttachments = (event.attachments || [])
        .filter(item => item && ["photo", "png", "animated_image", "video", "audio", "file"].includes(item.type));

      if (rawAttachments.length > 0 && global.utils?.getStreamsFromAttachment) {
        try {
          streamAttachments = await global.utils.getStreamsFromAttachment(rawAttachments);
        } catch (_) {}
      }

      const replyPayload = {
        body: `👑 ⌈ Admin Reply from ${adminName} ⌋\n` +
              `────────────────────\n` +
              `${event.body || "(Media Attachment)"}\n` +
              `────────────────────\n` +
              `💬 Reply to this message to continue the conversation!`,
        attachment: streamAttachments
      };

      try {
        const dest = targetUID;
        const sent = await pMgr.sendDM(api, dest, replyPayload);
        if (message?.reaction) message.reaction("👍");

        // Maintain chain: user can reply once again
        if (sent?.messageID && global.GoatBot?.onReply) {
          global.GoatBot.onReply.set(sent.messageID, {
            commandName,
            adminUID: String(event.senderID),
            adminThreadID: String(event.threadID),
            adminMessageID: String(event.messageID),
            targetUID: String(targetUID),
            type: "user_to_admin"
          });
        }

        return message.reply(`✓ Delivered reply to ${targetUID}!`);
      } catch (err) {
        return message.reply(`❌ Failed to deliver reply to ${targetUID}: ${err.message || err}`);
      }
    }
  }
};
