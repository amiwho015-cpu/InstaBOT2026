const aiCore = require("../../system/ai-core.js");

module.exports = {
  config: {
    name: "ai",
    aliases: ["ask", "agent", "astrabot", "ai-chat"],
    version: "2.1",
    author: "frnAlt",
    cooldown: 3,
    role: 0,
    description: {
      vi: "Trò chuyện với AI Agent nâng cao (Hỗ trợ Tool Use, RAG, Multi-LLM)",
      en: "Chat with Agentic AI Core (Tool Use, RAG, Multi-LLM routing)"
    },
    category: "ai-agent",
    guide: {
      vi: "{pn} <câu hỏi>",
      en: "{pn} <question>"
    }
  },

  langs: {
    vi: {
      missingPrompt: "⚠ Vui lòng nhập câu hỏi cho AI!"
    },
    en: {
      missingPrompt: "⚠ Please enter a question for the AI Agent!"
    }
  },

  onStart: async function ({ api, event, args, message, getLang }) {
    const prompt = args.join(" ");

    if (!prompt) {
      return message.reply(getLang("missingPrompt"));
    }

    message.reaction("🧠", event.messageID);

    try {
      const contextId = `${event.threadID}_${event.senderID}`;
      const aiResponse = await aiCore.generateCompletion({
        prompt,
        contextId
      });

      message.reaction("👍", event.messageID);
      await message.reply(`🤖 [AI Agent - ${aiCore.getProvider().toUpperCase()}]\n\n${aiResponse}`);
    } catch (err) {
      message.reaction("👎", event.messageID);
      return message.reply(`❌ AI Engine Error: ${err.message}`);
    }
  }
};
