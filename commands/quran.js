const axios = require("axios");

const surahMap = {
  1: ["fatiha", "ফাতিহা"],
  2: ["baqarah", "বাকারাহ"],
  3: ["imran", "ইমরান"],
  4: ["nisa", "নিসা"],
  5: ["maidah", "মায়েদাহ"],
  6: ["anam", "আনআম"],
  7: ["araf", "আরাফ"],
  8: ["anfal", "আনফাল"],
  9: ["taubah", "তাওবাহ"],
  10: ["yunus", "ইউনুস"],
  11: ["hud", "হুদ"],
  12: ["yusuf", "ইউসুফ"],
  13: ["raad", "রাদ"],
  14: ["ibrahim", "ইব্রাহিম"],
  15: ["hijr", "হিজর"],
  16: ["nahl", "নাহল"],
  17: ["isra", "ইসরা"],
  18: ["kahf", "কাহফ"],
  19: ["maryam", "মারইয়াম"],
  20: ["taha", "ত্বা-হা"],
  21: ["anbiya", "আম্বিয়া"],
  22: ["hajj", "হজ"],
  23: ["muminoon", "মুমিনুন"],
  24: ["nur", "নূর"],
  25: ["furqan", "ফুরকান"],
  26: ["shuara", "শুআরা"],
  27: ["naml", "নামল"],
  28: ["qasas", "কাসাস"],
  29: ["ankabut", "আনকাবুত"],
  30: ["rum", "রূম"],
  36: ["yasin", "ইয়াসিন"],
  55: ["rahman", "রহমান"],
  67: ["mulk", "মুলক"],
  112: ["ikhlas", "ইখলাস"],
  113: ["falaq", "ফালাক"],
  114: ["nas", "নাস"]
};

function getSurahNumber(input) {
  input = input.toLowerCase();
  if (!isNaN(input)) return parseInt(input);
  for (const [num, names] of Object.entries(surahMap)) {
    if (names.some(n => n.toLowerCase() === input)) return parseInt(num);
  }
  return null;
}

module.exports = {
  config: {
    name: "quran",
    aliases: ["alquran"],
    version: "3.0",
    author: "frnAlt",
    role: 0,
    category: "islam",
    description: {
      vi: "Đọc và nghe Al-Quran",
      en: "Read and listen to Al-Quran with translation and audio"
    },
    guide: {
      en: "{pn} list\n{pn} [name|number]\n{pn} [name|number] audio"
    }
  },

  onStart: async function ({ api, args, message, event }) {
    if (!args[0]) {
      return message.reply("🕌 Usage Examples:\n/quran list\n/quran fatiha\n/quran 112\n/quran 1 audio");
    }

    const input = args[0].toLowerCase();
    const type = args[1]?.toLowerCase();

    if (input === "list") {
      let listText = "📖 Al-Quran Surah List (1-114):\n\n";
      for (let i = 1; i <= 114; i++) {
        if (surahMap[i]) {
          listText += `${i}. ${surahMap[i][0]} (${surahMap[i][1]})\n`;
        }
      }
      return message.reply(listText);
    }

    const surahNum = getSurahNumber(input) || (parseInt(input) >= 1 && parseInt(input) <= 114 ? parseInt(input) : null);
    if (!surahNum || surahNum < 1 || surahNum > 114) {
      return message.reply("❌ Please enter a valid surah name or number (1-114).");
    }

    if (type === "audio") {
      const audioUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${surahNum}.mp3`;
      try {
        const stream = await global.utils.getStreamFromURL(audioUrl, `surah_${surahNum}.mp3`);
        return message.reply({
          body: `🔊 Surah ${surahMap[surahNum]?.[0] || surahNum} Recitation (Alafasy)`,
          attachment: stream
        });
      } catch (e) {
        return message.reply("❌ Failed to download Surah audio.");
      }
    }

    try {
      const [arRes, enRes] = await Promise.all([
        axios.get(`https://api.alquran.cloud/v1/surah/${surahNum}/ar.alafasy`),
        axios.get(`https://api.alquran.cloud/v1/surah/${surahNum}/en.asar`)
      ]);

      const ar = arRes.data.data;
      const en = enRes.data.data;

      let msg = `📖 Surah ${ar.englishName} (${ar.name})\n\n`;

      for (let i = 0; i < Math.min(ar.ayahs.length, 10); i++) {
        msg += `${i + 1}. 🕋 ${ar.ayahs[i].text}\n🇬🇧 ${en.ayahs[i].text}\n\n`;
      }

      if (ar.ayahs.length > 10) {
        msg += `... showing first 10 verses of ${ar.ayahs.length}. Use audio mode (/quran ${surahNum} audio) to listen!`;
      }

      return message.reply(msg);
    } catch (err) {
      return message.reply("❌ Error fetching surah data: " + err.message);
    }
  }
};
