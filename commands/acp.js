const moment = require("../../logger/date-time.js");

module.exports = {
  config: {
    name: "accept",
    aliases: ["acp"],
    version: "1.0",
    author: "Xnil6x | Saimx69x",
    cooldown: 8,
    role: 2,
    shortDescription: "manage friend requests",
    longDescription: "Accept or reject friend requests",
    category: "utility",
    guide: {
      en: "{pn} [add|del] [number|all]"
    }
  },

  onReply: async function ({ message, Reply, event, api, commandName }) {
    const { author, listRequest, messageID } = Reply;
    if (author !== event.senderID) return;
    const args = event.body.trim().toLowerCase().split(/\s+/);

    clearTimeout(Reply.unsendTimeout);

    const form = {
      av: api.getCurrentUserID(),
      fb_api_caller_class: "RelayModern",
      variables: {
        input: {
          source: "friends_tab",
          actor_id: api.getCurrentUserID(),
          client_mutation_id: Math.round(Math.random() * 19).toString()
        },
        scale: 3,
        refresh_num: 0
      }
    };

    let actionType;
    if (args[0] === "add") {
      form.fb_api_req_friendly_name = "FriendingCometFriendRequestConfirmMutation";
      form.doc_id = "3147613905362928";
      actionType = "Accepted";
    } else if (args[0] === "del") {
      form.fb_api_req_friendly_name = "FriendingCometFriendRequestDeleteMutation";
      form.doc_id = "4108254489275063";
      actionType = "Rejected";
    } else {
      return api.sendMessage("❌ Invalid command. Usage: <add|del> <number|all>", event.threadID, event.messageID);
    }

    let targetIDs = args.slice(1);
    if (args[1] === "all") {
      targetIDs = Array.from({ length: listRequest.length }, (_, i) => i + 1);
    }

    const newTargetIDs = [];
    const promiseFriends = [];

    const success = [];
    const failed = [];

    for (const stt of targetIDs) {
      const user = listRequest[parseInt(stt) - 1];
      if (!user) {
        failed.push(`🚫 Can't find request #${stt}`);
        continue;
      }
      form.variables.input.friend_requester_id = user.node.id;
      form.variables = JSON.stringify(form.variables);
      newTargetIDs.push(user);
      promiseFriends.push(api.httpPost("https://www.facebook.com/api/graphql/", form));
      form.variables = JSON.parse(form.variables);
    }

    const results = await Promise.allSettled(promiseFriends);

    results.forEach((result, index) => {
      const user = newTargetIDs[index];
      if (result.status === "fulfilled" && !JSON.parse(result.value).errors) {
        success.push(`✅ 𝐒𝐮𝐜𝐜𝐞𝐬𝐬𝐟𝐮𝐥𝐥𝐲 ${actionType}: ${user.node.name} (${user.node.id})`);
      } else {
        failed.push(`❌ 𝐅𝐚𝐢𝐥𝐞𝐝: ${user.node.name} (${user.node.id})`);
      }
    });

    let replyMsg = "";
    if (success.length > 0) replyMsg += success.join("\n") + "\n";
    if (failed.length > 0) replyMsg += failed.join("\n");

    if (replyMsg) api.sendMessage(replyMsg, event.threadID, event.messageID);
    else api.sendMessage("❌ 𝐍𝐨 𝐯𝐚𝐥𝐢𝐝 𝐫𝐞𝐪𝐮𝐞𝐬𝐭𝐬 𝐰𝐞𝐫𝐞 𝐩𝐫𝐨𝐜𝐞𝐬𝐬𝐞𝐝.", event.threadID);

    api.unsendMessage(messageID);
  },

  onStart: async function ({ event, api, commandName }) {
    try {
      const form = {
        av: api.getCurrentUserID(),
        fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
        fb_api_caller_class: "RelayModern",
        doc_id: "4499164963466303",
        variables: JSON.stringify({ input: { scale: 3 } })
      };

      const response = await api.httpPost("https://www.facebook.com/api/graphql/", form);
      const listRequest = JSON.parse(response).data.viewer.friending_possibilities.edges;

      if (!listRequest || listRequest.length === 0) {
        return api.sendMessage("🌟 𝐘𝐨𝐮 𝐡𝐚𝐯𝐞 𝐧𝐨 𝐩𝐞𝐧𝐝𝐢𝐧𝐠 𝐟𝐫𝐢𝐞𝐧𝐝 𝐫𝐞𝐪𝐮𝐞𝐬𝐭𝐬!", event.threadID);
      }

      let msg = "╔═══》 𝐅𝐫𝐢𝐞𝐧𝐝 𝐑𝐞𝐪𝐮𝐞𝐬𝐭𝐬 《 ═══╗\n\n";
      listRequest.forEach((user, index) => {
        msg += `💠  𝐍𝐨. ${index + 1}\n`;
        msg += `👤 𝐍𝐚𝐦𝐞: ${user.node.name}\n`;
        msg += `🆔 𝐈𝐃: ${user.node.id}\n`;
        msg += `🔗 𝐏𝐫𝐨𝐟𝐢𝐥𝐞: ${user.node.url.replace("www.facebook", "fb")}\n`;
        msg += "━━━━━━━━━━━━━━━━\n";
      });

      msg += "\n💡 𝐑𝐞𝐩𝐥𝐲 𝐰𝐢𝐭𝐡:\n";
      msg += "✅ add <number> — 𝐀𝐜𝐜𝐞𝐩𝐭 𝐫𝐞𝐪𝐮𝐞𝐬𝐭\n";
      msg += "❌ del <number> — 𝐑𝐞𝐣𝐞𝐜𝐭 𝐫𝐞𝐪𝐮𝐞𝐬𝐭\n";
      msg += "💫 add all — 𝐀𝐜𝐜𝐞𝐩𝐭 𝐚𝐥𝐥\n";
      msg += "🔥 del all — 𝐑𝐞𝐣𝐞𝐜𝐭 𝐚𝐥𝐥\n\n";
      msg += "⏳ 𝐓𝐡𝐢𝐬 𝐦𝐞𝐧𝐮 𝐰𝐢𝐥𝐥 𝐚𝐮𝐭𝐨-𝐝𝐞𝐥𝐞𝐭𝐞 𝐢𝐧 2 𝐦𝐢𝐧𝐮𝐭𝐞s.\n";
      msg += "╚═══════════════════╝";

      api.sendMessage(msg, event.threadID, (e, info) => {
        global.GoatBot.onReply.set(info.messageID, {
          commandName,
          messageID: info.messageID,
          listRequest,
          author: event.senderID,
          unsendTimeout: setTimeout(() => {
            api.unsendMessage(info.messageID);
          }, 2 * 60 * 1000)
        });
      }, event.messageID);

    } catch (error) {
      console.error(error);
      api.sendMessage("❌ 𝐄𝐫𝐫𝐨𝐫 𝐨𝐜𝐜𝐮𝐫𝐫𝐞𝐝 𝐰𝐡𝐢𝐥𝐞 𝐟𝐞𝐭𝐜𝐡𝐢𝐧𝐠 𝐟𝐫𝐢𝐞𝐧𝐝 𝐫𝐞𝐪𝐮𝐞𝐬𝐭𝐬.", event.threadID);
    }
  }
};
