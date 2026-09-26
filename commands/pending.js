const { getPrefix } = global.utils;

module.exports = {
  config: {
    name: "pending",
    version: "0.0.7",
    author: "Azadx69x",
    cooldown: 5,
    role: 6,
    shortDescription: {
      vi: "Quản lý nhóm đang chờ phê duyệt",
      en: "Manage pending group approvals"
    },
    longDescription: {
      vi: "Lệnh quản trị để xem, chấp nhận hoặc từ chối các nhóm đang chờ tham gia bot\n\nCách sử dụng:\n• /pending - Hiển thị danh sách nhóm chờ\n• Trả lời với số - Chấp nhận nhóm\n• Trả lời với 'c' + số - Từ chối nhóm",
      en: "Admin command to view, approve or reject groups waiting to add the bot\n\nUsage:\n• /pending - Show pending groups list\n• Reply with numbers - Approve groups\n• Reply with 'c' + numbers - Cancel/reject groups"
    },
    category: "Admin",
    guide: {
      vi: {
        body: "{pn}: Xem danh sách nhóm đang chờ\n{pn} [số | c/số]: Phê duyệt/từ chối nhóm"
      },
      en: {
        body: "{pn}: View pending groups list\n{pn} [number | c/number]: Approve/reject groups"
      }
    }
  },

  langs: {
    en: {
      invaildNumber: "❌ %1 is not a valid number",
      cancelSuccess: "✅ Refused %1 thread(s)!",
      approveSuccess: "✅ Approved successfully %1 thread(s)!",
      cantGetPendingList: "❌ Can't get the pending list!",
      returnListPending: "📋 PENDING LIST\n━━━━━━━━━━━━━━━━━━━\nTotal: %1\nReply with numbers to approve\nUse 'c' + numbers to cancel\n\n%2",
      returnListClean: "📭 No pending groups at the moment",
      syntaxError: "⚠️ Syntax error! Please use:\n• Numbers to approve (1 2 3)\n• 'c' + numbers to cancel (c1 c2)",
      noPermission: "🚫 You don't have permission to use this command!"
    },
    vi: {
      invaildNumber: "❌ %1 không phải là số hợp lệ",
      cancelSuccess: "✅ Đã từ chối %1 nhóm!",
      approveSuccess: "✅ Đã phê duyệt thành công %1 nhóm!",
      cantGetPendingList: "❌ Không thể lấy danh sách chờ!",
      returnListPending: "📋 DANH SÁCH CHỜ\n━━━━━━━━━━━━━━━━━━━\nTổng: %1\nPhản hồi bằng số để chấp nhận\nDùng 'c' + số để từ chối\n\n%2",
      returnListClean: "📭 Hiện không có nhóm nào đang chờ",
      syntaxError: "⚠️ Lỗi cú pháp! Vui lòng dùng:\n• Số để chấp nhận (1 2 3)\n• 'c' + số để từ chối (c1 c2)",
      noPermission: "🚫 Bạn không có quyền sử dụng lệnh này!"
    }
  },

  onReply: async function ({ api, event, Reply, getLang, commandName }) {
    if (String(event.senderID) !== String(Reply.author)) return;
    const { body, threadID, messageID } = event;
    let count = 0;

    if (body.toLowerCase() === "help" || body === "?") {
      return api.sendMessage(getLang("syntaxError"), threadID, messageID);
    }

    if ((isNaN(body) && body.toLowerCase().startsWith("c")) || body.toLowerCase().startsWith("cancel")) {
      let indexStr = body.toLowerCase().replace("cancel", "").replace("c", "").trim();
      if (!indexStr) return api.sendMessage(getLang("syntaxError"), threadID, messageID);

      const index = indexStr.split(/\s+/);
      for (const i of index) {
        if (isNaN(i) || i <= 0 || i > Reply.pending.length)
          return api.sendMessage(getLang("invaildNumber", i), threadID, messageID);
        try {
          await api.removeUserFromGroup(api.getCurrentUserID(), Reply.pending[i - 1].threadID);
          count++;
        } catch (e) {
          console.error("Error removing from group:", e);
        }
      }
      return api.sendMessage(getLang("cancelSuccess", count), threadID, messageID);
    } else {
      const index = body.split(/\s+/);
      for (const i of index) {
        if (isNaN(i) || i <= 0 || i > Reply.pending.length)
          return api.sendMessage(getLang("invaildNumber", i), threadID, messageID);

        const targetThread = Reply.pending[i - 1].threadID;
        try {
          const threadInfo = await api.getThreadInfo(targetThread);
          const groupName = threadInfo.threadName || "Unnamed Group";
          const memberCount = threadInfo.participantIDs ? threadInfo.participantIDs.length : 0;

          const prefix = getPrefix(targetThread);

          await api.sendMessage(
`✅ GROUP APPROVED
━━━━━━━━━━━━━━━━━━━
📁 Name: ${groupName}
👥 Members: ${memberCount}
😀 Emoji: ${threadInfo.emoji || "NONE"}
━━━━━━━━━━━━━━━━━━━
💡 Type ${prefix}help for commands`, targetThread);

          count++;
        } catch (error) {
          console.error("Error approving group:", error);
        }
      }
      return api.sendMessage(getLang("approveSuccess", count), threadID, messageID);
    }
  },

  onStart: async function ({ api, event, getLang, commandName }) {
    const { threadID, messageID, senderID } = event;

    const config = global.GoatBot.config || {};
    const creators = config.creator || [];
    const isCreator = creators.includes(senderID);

    if (!isCreator) {
      return api.sendMessage(getLang("noPermission"), threadID, messageID);
    }

    let msg = "", index = 1;

    try {
      const spam = await api.getThreadList(100, null, ["OTHER"]) || [];
      const pending = await api.getThreadList(100, null, ["PENDING"]) || [];
      const list = [...spam, ...pending].filter(group => group.isSubscribed && group.isGroup);

      if (list.length === 0) {
        return api.sendMessage(getLang("returnListClean"), threadID, messageID);
      }

      for (const item of list) {
        const groupName = item.name || "Unnamed Group";
        msg += `┣ ${index++}. ${groupName}\n   ┗ ID: ${item.threadID}\n`;
      }

      const responseMsg = getLang("returnListPending", list.length, msg);
      return api.sendMessage(responseMsg, threadID, (err, info) => {
        if (err) return console.error(err);
        global.GoatBot.onReply.set(info.messageID, {
          commandName,
          messageID: info.messageID,
          author: event.senderID,
          pending: list
        });
      }, messageID);

    } catch (e) {
      console.error("Error pending command:", e);
      return api.sendMessage(getLang("cantGetPendingList"), threadID, messageID);
    }
  }
};
