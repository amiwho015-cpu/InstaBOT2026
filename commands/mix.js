const axios = require("axios");

module.exports = {
  config: {
    name: "mix",
    version: "1.7",
    author: "frnAlt",
    cooldown: 5,
    role: 0,
    description: {
      en: "Mix 2 emojis together"
    },
    guide: {
      en: "{pn} <emoji1> <emoji2>\nExample: {pn} 😂 😍\nUse {pn} -r for random emoji mix."
    },
    category: "fun"
  },

  langs: {
    en: {
      error: "😔 Sorry, emoji %1 and %2 can't be mixed.",
      success: "✨ Emoji %1 and %2 mixed successfully!"
    }
  },

  onStart: async function ({ message, args, getLang }) {
    const randomEmojiList = [
      "😂", "😍", "🥰", "😋", "🤩", "🥱", "😐", "😜", "😎", "😏",
      "🥳", "🤗", "😚", "🥺", "😅", "🤪", "😇", "😈", "🤭", "🤡",
      "😬", "🤤", "😷", "🥴", "😯", "🤓", "🙄", "😓", "😢", "😳",
      "😭", "🙃", "😆", "😞", "🤑", "🤥", "😧", "🥵", "🫠", "🫣",
      "🧑‍🚀"
    ];

    // যদি "-r" দেয়া থাকে, র‌্যান্ডম ইমোজি মিক্স করবে
    let emoji1, emoji2, api;

    if (args[0] === "-r") {
      emoji1 = randomEmojiList[Math.floor(Math.random() * randomEmojiList.length)];
      emoji2 = randomEmojiList[Math.floor(Math.random() * randomEmojiList.length)];
      api = "https://rest-nyx-apis-production.up.railway.app/api/emojimix";
    } else {
      emoji1 = args[0];
      emoji2 = args[1];
      if (!emoji1 || !emoji2) return message.SyntaxError();
      api = "https://rest-nyx-apis-production.up.railway.app/api/emojimix";
    }

    try {
      const res = await axios.get(
        `${api}?one=${encodeURIComponent(emoji1)}&two=${encodeURIComponent(emoji2)}`
      );

      const imageUrl = res.data.url;
      if (!imageUrl) return message.reply(getLang("error", emoji1, emoji2));

      const imgStream = await global.utils.getStreamFromURL(imageUrl);

      message.reply({
        body: getLang("success", emoji1, emoji2),
        attachment: imgStream
      });

    } catch (e) {
      message.reply(getLang("error", emoji1, emoji2));
    }
  }
};