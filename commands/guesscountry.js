const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

let cachedCountries = null;

function loadCountries() {
  if (cachedCountries && cachedCountries.length > 0) {
    return cachedCountries;
  }
  try {
    const jsonPath = path.join(__dirname, "assets", "countries.json");
    if (fs.existsSync(jsonPath)) {
      cachedCountries = fs.readJsonSync(jsonPath);
      return cachedCountries;
    }
  } catch (_) {}

  // Built-in fallback list of countries
  cachedCountries = [
    { name: "United States", official: "United States of America", code: "us", capital: "Washington, D.C.", alt: ["usa", "us", "america"] },
    { name: "United Kingdom", official: "United Kingdom of Great Britain and Northern Ireland", code: "gb", capital: "London", alt: ["uk", "britain", "england"] },
    { name: "Canada", official: "Canada", code: "ca", capital: "Ottawa", alt: [] },
    { name: "Australia", official: "Commonwealth of Australia", code: "au", capital: "Canberra", alt: [] },
    { name: "Germany", official: "Federal Republic of Germany", code: "de", capital: "Berlin", alt: ["deutschland"] },
    { name: "France", official: "French Republic", code: "fr", capital: "Paris", alt: [] },
    { name: "Japan", official: "Japan", code: "jp", capital: "Tokyo", alt: ["nippon", "nihon"] },
    { name: "Brazil", official: "Federative Republic of Brazil", code: "br", capital: "Brasília", alt: ["brasil"] },
    { name: "Argentina", official: "Argentine Republic", code: "ar", capital: "Buenos Aires", alt: [] },
    { name: "Bangladesh", official: "People's Republic of Bangladesh", code: "bd", capital: "Dhaka", alt: [] },
    { name: "India", official: "Republic of India", code: "in", capital: "New Delhi", alt: ["bharat"] },
    { name: "Pakistan", official: "Islamic Republic of Pakistan", code: "pk", capital: "Islamabad", alt: [] },
    { name: "Italy", official: "Italian Republic", code: "it", capital: "Rome", alt: ["italia"] },
    { name: "Spain", official: "Kingdom of Spain", code: "es", capital: "Madrid", alt: ["espana"] },
    { name: "Mexico", official: "United Mexican States", code: "mx", capital: "Mexico City", alt: [] },
    { name: "Saudi Arabia", official: "Kingdom of Saudi Arabia", code: "sa", capital: "Riyadh", alt: ["ksa"] },
    { name: "Turkey", official: "Republic of Turkey", code: "tr", capital: "Ankara", alt: ["turkiye"] },
    { name: "Egypt", official: "Arab Republic of Egypt", code: "eg", capital: "Cairo", alt: [] },
    { name: "South Korea", official: "Republic of Korea", code: "kr", capital: "Seoul", alt: ["korea"] },
    { name: "China", official: "People's Republic of China", code: "cn", capital: "Beijing", alt: [] }
  ];
  return cachedCountries;
}

function normalize(text) {
  if (!text || typeof text !== "string") return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(the|republic|of|kingdom|state|states|islands|island|democratic|people|peoples|federation|federal)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isAnswerCorrect(userGuess, country) {
  const normGuess = normalize(userGuess);
  if (!normGuess) return false;

  const validAnswers = [
    country.name,
    country.official,
    country.code,
    ...(country.alt || [])
  ].map(normalize).filter(Boolean);

  // Direct match
  if (validAnswers.includes(normGuess)) return true;

  // Partial exact match for longer country names
  for (const ans of validAnswers) {
    if (ans.length >= 4 && (normGuess === ans || normGuess.startsWith(ans) || ans.startsWith(normGuess))) {
      return true;
    }
  }

  return false;
}

module.exports = {
  config: {
    name: "guesscountry",
    aliases: ["flagquiz", "guessflag", "guesstheflag", "flag", "countryflag"],
    version: "1.0.0",
    author: "frnAlt",
    cooldown: 5,
    role: 0,
    shortDescription: { en: "Guess the country by its flag" },
    longDescription: { en: "Fun interactive flag quiz game! Guess the country name by replying to the flag image." },
    category: "game",
    guide: { en: "{pn} - Start a new flag guessing game" }
  },

  onStart: async function ({ message, event, api }) {
    const countries = loadCountries();
    if (!countries || countries.length === 0) {
      return message.reply("❌ Unable to load country dataset. Please try again later.");
    }

    const country = countries[Math.floor(Math.random() * countries.length)];
    const flagUrl = `https://flagcdn.com/w320/${country.code.toLowerCase()}.png`;

    const cacheDir = path.join(__dirname, "cache");
    await fs.ensureDir(cacheDir);
    const tmpFile = path.join(cacheDir, `flag_${Date.now()}_${Math.random().toString(36).substring(7)}.png`);

    try {
      const response = await axios.get(flagUrl, {
        responseType: "arraybuffer",
        timeout: 10000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      await fs.writeFile(tmpFile, Buffer.from(response.data));

      const firstLetter = country.name.charAt(0).toUpperCase();
      const length = country.name.length;

      const bodyText =
`🚩 𝗚𝗨𝗘𝗦𝗦 𝗧𝗛𝗘 𝗖𝗢𝗨𝗡𝗧𝗥𝗬! 🚩

Can you guess which country this flag belongs to?
👉 Tap to reply with your answer!
⏱️ You have 45 seconds to guess.
💡 Hint: Starts with "${firstLetter}" (${length} letters)`;

      await message.reply(
        {
          body: bodyText,
          attachment: fs.createReadStream(tmpFile)
        },
        (err, info) => {
          fs.remove(tmpFile).catch(() => {});
          if (err || !info?.messageID) return;

          const quizMessageID = info.messageID;

          // Timer: automatically unsend the quiz flag message after 45 seconds if no correct answer
          const timeoutId = setTimeout(async () => {
            if (global.GoatBot?.onReply?.has(quizMessageID)) {
              global.GoatBot.onReply.delete(quizMessageID);

              // Automatically unsend the quiz flag image
              if (api && api.unsendMessage) {
                api.unsendMessage(quizMessageID, event.threadID).catch(() => {});
              }

              // Send timeout announcement
              await message.reply(
                `⏰ Time's up! No one guessed the country in time.\n\n🏳️ The correct country was: ${country.name}\n🏛️ Capital: ${country.capital || "N/A"}`,
                (err2, info2) => {
                  if (!err2 && info2?.messageID) {
                    setTimeout(() => {
                      if (typeof message.unsend === "function") {
                        message.unsend(info2.messageID).catch(() => {});
                      } else if (api && api.unsendMessage) {
                        api.unsendMessage(info2.messageID, event.threadID).catch(() => {});
                      }
                    }, 10000);
                  }
                }
              );
            }
          }, 45000);

          global.GoatBot.onReply.set(quizMessageID, {
            commandName: "guesscountry",
            messageID: quizMessageID,
            threadID: event.threadID,
            country,
            timeoutId,
            startTime: Date.now()
          });
        }
      );
    } catch (error) {
      if (tmpFile) fs.remove(tmpFile).catch(() => {});
      console.error("[GUESSCOUNTRY ERROR]:", error.message);
      return message.reply("❌ Failed to fetch country flag. Please try again in a few moments.");
    }
  },

  onReply: async function ({ message, event, Reply, api, usersData }) {
    if (!Reply || !Reply.country) return;

    const country = Reply.country;
    const userGuess = String(event.body || "").trim();

    if (isAnswerCorrect(userGuess, country)) {
      // Clear the timeout to prevent unsend on timeout
      if (Reply.timeoutId) {
        clearTimeout(Reply.timeoutId);
      }

      // Remove from onReply map immediately
      if (global.GoatBot?.onReply) {
        global.GoatBot.onReply.delete(Reply.messageID);
      }

      // Automatically unsend the quiz flag image
      if (api && api.unsendMessage && Reply.messageID) {
        api.unsendMessage(Reply.messageID, event.threadID).catch(() => {});
      }

      // React ✅
      if (api && api.setMessageReaction) {
        api.setMessageReaction("👍", event.messageID, () => {}, true);
      }

      // Award coins and experience if usersData is available
      const rewardCoin = 500;
      const rewardExp = 100;
      let userName = "Player";

      try {
        if (usersData?.get && usersData?.set) {
          const userData = await usersData.get(event.senderID);
          userName = userData?.name || "Player";
          await usersData.set(event.senderID, {
            money: (userData.money || 0) + rewardCoin,
            exp: (userData.exp || 0) + rewardExp
          });
        }
      } catch (_) {}

      return message.reply(
        `🎉 Congratulations ${userName}! You guessed correctly!\n\n🏳️ Country: ${country.name}\n🏛️ Capital: ${country.capital || "N/A"}\n💰 Reward: +${rewardCoin} coins & +${rewardExp} EXP!`,
        (err, info) => {
          if (!err && info?.messageID) {
            setTimeout(() => {
              if (typeof message.unsend === "function") {
                message.unsend(info.messageID).catch(() => {});
              } else if (api && api.unsendMessage) {
                api.unsendMessage(info.messageID, event.threadID).catch(() => {});
              }
            }, 8000);
          }
        }
      );
    } else {
      // React ❌ on wrong guess
      if (api && api.setMessageReaction) {
        api.setMessageReaction("👎", event.messageID, () => {}, true);
      }

      // Incorrect answer feedback: shows, and automatically unsends after user sees it (5 seconds)
      return message.reply(
        `❌ "${userGuess}" is not correct! Keep trying... (Reply to the flag image)`,
        (err, info) => {
          if (!err && info?.messageID) {
            setTimeout(() => {
              if (typeof message.unsend === "function") {
                message.unsend(info.messageID).catch(() => {});
              } else if (api && api.unsendMessage) {
                api.unsendMessage(info.messageID, event.threadID).catch(() => {});
              }
            }, 5000);
          }
        }
      );
    }
  }
};
