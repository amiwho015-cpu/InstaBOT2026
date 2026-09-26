/**
 * @author frnAlt & Gtajisan
 * ! Floppa-Chatbot Interactive Conversational AI Chat Engine
 * ! Multi-LLM Routing, Context Memory, Continuous onReply Dialogue, & DM Optimization
 */

"use strict";

const path = require("path");
const aiCore = require("../../system/ai-core.js");

module.exports = {
  config: {
    name: "chat",
    aliases: ["talk", "floppa"],
    version: "2.5.0",
    author: "frnAlt & Gtajisan",
    cooldown: 2,
    role: 0,
    shortDescription: {
      en: "Chat interactively with Floppa conversational AI Agent",
      vi: "Trò chuyện tương tác với trợ lý AI Floppa"
    },
    longDescription: {
      en: "Interactive conversational AI chat with context memory, multi-LLM provider routing (Gemini, OpenAI, Claude, DeepSeek, Groq, Ollama), and continuous onReply dialogue.",
      vi: "Trò chuyện tương tác với bộ nhớ ngữ cảnh, định tuyến đa mô hình AI và tiếp tục hội thoại qua tính năng trả lời tin nhắn."
    },
    category: "chat",
    guide: {
      en: "   {pn} <message>: Chat with Floppa AI\n" +
          "   {pn} reset: Clear conversational memory for this chat\n" +
          "   {pn} status: Check active AI provider, model, and memory\n" +
          "   {pn} provider <name>: Switch AI provider (gemini, openai, claude, deepseek, groq, etc.)\n" +
          "   💡 In Direct Messages (DM), you can also simply reply to the bot to keep chatting!",
      vi: "   {pn} <tin nhắn>: Trò chuyện với Floppa AI\n" +
          "   {pn} reset: Xóa bộ nhớ cuộc trò chuyện\n" +
          "   {pn} status: Kiểm tra trạng thái AI hiện tại\n" +
          "   {pn} provider <tên>: Đổi nhà cung cấp AI"
    }
  },

  onStart: async function ({ api, event, args, message, prefix, usersData }) {
    const isDM = !event.isGroup || event.threadID === event.senderID;
    const contextId = `${event.threadID}_${event.senderID}`;
    const subCommand = (args[0] || "").toLowerCase();

    // 1. Subcommand: reset / clear
    if (subCommand === "reset" || subCommand === "clear") {
      aiCore.clearConversationHistory(contextId);
      return message.reply("🧹 Conversational memory for this chat has been reset successfully! Starting a fresh dialogue.");
    }

    // 2. Subcommand: status / info
    if (subCommand === "status" || subCommand === "info") {
      const provider = aiCore.getProvider();
      const history = aiCore.getConversationHistory(contextId) || [];
      const services = aiCore.getSupportedServices() || [];
      const currentService = services.find(s => s.id === provider);

      return message.reply(
        `╭─── [ 🤖 FLOPPA AI STATUS ] ───╮\n` +
        `│ ⚡ Provider : ${provider.toUpperCase()}\n` +
        `│ 🧠 Model    : ${aiCore.state?.model || "default"}\n` +
        `│ 💬 Context  : ${history.length} messages in memory\n` +
        `│ 📍 Thread   : ${isDM ? "1-on-1 Direct Message (DM)" : "Group Chat"}\n` +
        `│ 🌐 Services : ${services.length} providers supported\n` +
        `╰───────────────────────────────╯\n\n` +
        `💡 Available providers: ${services.map(s => s.id).join(", ")}\n` +
        `💡 Switch provider: ${prefix}chat provider <name>`
      );
    }

    // 3. Subcommand: provider <name> [model]
    if (subCommand === "provider" && args[1]) {
      const targetProvider = args[1].toLowerCase();
      const services = aiCore.getSupportedServices() || [];
      const found = services.find(s => s.id === targetProvider);

      if (!found) {
        return message.reply(
          `❌ Unknown provider "${targetProvider}".\n\n` +
          `Supported providers: ${services.map(s => s.id).join(", ")}`
        );
      }

      const targetModel = args[2] || found.models[0];
      aiCore.setProvider(targetProvider, targetModel);
      return message.reply(`✅ AI Provider switched to [${found.name}] using model [${targetModel}].`);
    }

    // 4. Chat prompt
    const prompt = args.join(" ").trim();
    if (!prompt) {
      if (isDM) {
        return message.reply(
          `👋 Hello! I'm Floppa AI.\n\n` +
          `You're in 1-on-1 Direct Messages! Ask me any question or just chat with me naturally.\n\n` +
          `💡 Example:\n` +
          `• ${prefix}chat Tell me a fun fact about space\n` +
          `• Or simply type any question right here in DM!`
        );
      }
      return message.reply(`⚠ Please enter a message to chat with Floppa!\nUsage: ${prefix}chat <message>`);
    }

    try {
      if (typeof message.reaction === "function") {
        message.reaction("💭", event.messageID);
      }

      const userName = (await usersData?.getName(event.senderID)) || "Friend";
      const contextualPrompt = `User (${userName}): ${prompt}`;

      const aiResponse = await aiCore.generateCompletion({
        prompt: contextualPrompt,
        contextId
      });

      if (typeof message.reaction === "function") {
        message.reaction("💬", event.messageID);
      }

      const formattedResponse = `🐱 [Floppa AI]\n\n${aiResponse}`;

      return message.reply(formattedResponse, (err, info) => {
        if (!err && info?.messageID) {
          if (!global.GoatBot) global.GoatBot = {};
          if (!global.GoatBot.onReply) global.GoatBot.onReply = new Map();

          global.GoatBot.onReply.set(info.messageID, {
            commandName: "chat",
            author: event.senderID,
            contextId,
            messageID: info.messageID
          });
        }
      });
    } catch (err) {
      if (typeof message.reaction === "function") {
        message.reaction("👎", event.messageID);
      }
      return message.reply(`❌ AI Chat Error: ${err.message || err}`);
    }
  },

  onReply: async function ({ api, event, message, Reply, usersData }) {
    const isDM = !event.isGroup || event.threadID === event.senderID;
    // In group chats verify author; in DM allow seamless continuation
    if (!isDM && event.senderID !== Reply.author) return;

    const input = (event.body || "").trim();
    if (!input) return;

    // Do not intercept if message is explicitly another bot command
    if (/^[!#$%\&*+\-./:<=>?@\\^_`~]/.test(input)) return;

    const contextId = Reply.contextId || `${event.threadID}_${event.senderID}`;

    try {
      if (typeof message.reaction === "function") {
        message.reaction("💭", event.messageID);
      }

      const userName = (await usersData?.getName(event.senderID)) || "Friend";
      const contextualPrompt = `User (${userName}): ${input}`;

      const aiResponse = await aiCore.generateCompletion({
        prompt: contextualPrompt,
        contextId
      });

      if (typeof message.reaction === "function") {
        message.reaction("💬", event.messageID);
      }

      const formattedResponse = `🐱 [Floppa AI]\n\n${aiResponse}`;

      return message.reply(formattedResponse, (err, info) => {
        if (!err && info?.messageID) {
          if (!global.GoatBot) global.GoatBot = {};
          if (!global.GoatBot.onReply) global.GoatBot.onReply = new Map();

          // Keep conversation flowing on subsequent replies
          global.GoatBot.onReply.set(info.messageID, {
            commandName: "chat",
            author: event.senderID,
            contextId,
            messageID: info.messageID
          });
        }
      });
    } catch (err) {
      return message.reply(`❌ Chat Error: ${err.message || err}`);
    }
  }
};
