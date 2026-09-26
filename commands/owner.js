module.exports = {
  config: {
    name: "owner",
    version: "0.0.7",
    author: "Azadx69x",
    category: "owner",
    guide: { en: "view owner info." },
    usePrefix: true
  },
  sentThreads: new Map(),
  onStart: async function ({ api, event, message }) {
    const threadID = event.threadID;
    const OWNER_ID = "61591758460039";
    if (this.sentThreads.has(threadID)) return;
    this.sentThreads.set(threadID, true);
    
    const ownerInfo = {
      name: "𝐌𝐨𝐡𝐚𝐦𝐦𝐚𝐝 𝐀𝐳𝐚𝐝",
      age: "𝟏𝟖",
      from: "𝐁𝐚𝐧𝐠𝐥𝐚𝐝𝐞𝐬𝐡 🇧🇩",
      address: "𝐂𝐡𝐢𝐭𝐭𝐚𝐠𝐨𝐧𝐠",
      work: "𝐒𝐭𝐮𝐝𝐞𝐧𝐭",
      class: "𝟓",
      religion: "𝐈𝐬𝐥𝐚𝐦",
      role: "𝐁𝐨𝐭 𝐎𝐰𝐧𝐞𝐫",
      kalema: "لَا إِلٰهَ إِلَّا اللهُ مُحَمَّدٌ رَسُوْلُ اللهِ"
    };

    const msg = `
🎀 𝐎ᴡɴᴇʀ 𝐈ɴꜰᴏ ✨

❍ 𝐍ᴀᴍᴇ _ ${ownerInfo.name}
❍ 𝐀ɢᴇ _ ${ownerInfo.age}
❍ 𝐅ʀᴏᴍ _ ${ownerInfo.from}
❍ 𝐀ᴅᴅʀᴇꜱꜱ _ ${ownerInfo.address}
❍ 𝐖ᴏʀᴋ _ ${ownerInfo.work}
❍ 𝐂ʟᴀꜱꜱ _ ${ownerInfo.class}
❍ 𝐑ᴇʟɪɢɪᴏɴ _ ${ownerInfo.religion}
❍ 𝐑ᴏʟᴇ _ ${ownerInfo.role}
❍ 𝐊ᴀʟᴇᴍᴀ _ "${ownerInfo.kalema}",
━━━━━━━━━━━━━━━━━━━━
💫 𝐓ʜᴀɴᴋꜱ ꜰᴏʀ ᴡᴀᴛᴄʜɪɴɢ
📝 𝐀ɴʏ ᴘʀᴏʙʟᴇᴍ? 𝐓ᴀʟᴋ ᴛᴏ ᴀᴅᴍɪɴ.`;

    try {
      await api.shareContact(msg, OWNER_ID, threadID);
    } catch (e) {
      console.error("Error sending owner contact card:", e);
      await message.reply("❌ 𝐄ʀʀᴏʀ");
    }
    setTimeout(() => this.sentThreads.delete(threadID), 300000);
  }
};
