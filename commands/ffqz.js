const axios = require("axios");

const baseApiUrl = async () => {
        const base = await axios.get(
                "https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json"
        );
        return base.data.mahmud;
};

module.exports = {
        config: {
                name: "freefire",
                aliases: ["ffqz", "ffgame", "ffquiz", "ff"],
                version: "1.7",
                author: "MahMUD",
                cooldown: 10,
                role: 0,
                description: {
                        bn: "ফ্রি ফায়ার ক্যারেক্টার দেখে নাম অনুমান করার খেলা",
                        en: "Guess the Free Fire character name by looking at the image",
                        vi: "Đoán tên nhân vật Free Fire bằng cách nhìn vào hình ảnh"
                },
                category: "game",
                guide: {
                        bn: '   {pn}: গেমটি শুরু করতে লিখুন',
                        en: '   {pn}: Type to start the game',
                        vi: '   {pn}: Nhập để bắt đầu trò chơi'
                }
        },

        langs: {
                bn: {
                        start: "একটি ফ্রি ফায়ার ক্যারেক্টার এসেছে! নাম বলতে পারো বেবি?",
                        correct: "✅ | একদম সঠিক উত্তর বেবি!\n\nতুমি জিতেছো %1 কয়েন এবং %2 এক্সপি।",
                        wrong: "❌ | উত্তরটি ভুল হয়েছে বেবি!\n\n🔥 সঠিক উত্তর ছিল: %1",
                        notYour: "× বেবি, এটি তোমার জন্য নয়! নিজের জন্য গেম শুরু করো। >🐸",
                        error: "× সমস্যা হয়েছে: %1। প্রয়োজনে Contact MahMUD।"
                },
                en: {
                        start: "A random Free Fire character has appeared! Guess the name.",
                        correct: "✅ | Correct answer, baby!\n\nYou have earned %1 coins and %2 exp.",
                        wrong: "❌ | Wrong Answer, baby!\n\nThe Correct answer was: %1",
                        notYour: "× This is not your game, baby! >🐸",
                        error: "× API error: %1. Contact MahMUD for help."
                },
                vi: {
                        start: "🔫 | Một nhân vật Free Fire đã xuất hiện! Đoán tên đi cưng. 😘",
                        correct: "✅ | Đáp án chính xác cưng ơi!\n\nBạn nhận được %1 xu và %2 exp.",
                        wrong: "❌ | Sai rồi cưng ơi!\n\n🔥 Đáp án đúng là: %1",
                        notYour: "× Đây không phải trò chơi của bạn cưng à! >🐸",
                        error: "× Lỗi: %1. Liên hệ MahMUD để được hỗ trợ."
                }
        },

        onReply: async function ({ api, event, Reply, usersData, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68); 
                if (module.exports.config.author !== authorName) return;

                const { character, author } = Reply;
                const getCoin = 500;
                const getExp = 121;
                
                if (event.senderID !== author) {
                        return api.sendMessage(getLang("notYour"), event.threadID, event.messageID);
                }

                const reply = event.body.trim().toLowerCase();
                const userData = await usersData.get(event.senderID);
                
                await api.unsendMessage(Reply.messageID);

                if (reply === character.toLowerCase()) {
                        userData.money += getCoin;
                        userData.exp += getExp;
                        await usersData.set(event.senderID, userData);

                        return api.sendMessage(getLang("correct", getCoin, getExp), event.threadID, event.messageID);
                } else {
                        return api.sendMessage(getLang("wrong", character), event.threadID, event.messageID);
                }
        },

        onStart: async function ({ api, event, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68); 
                if (this.config.author !== authorName) return;

                try {
                        const apiUrl = await baseApiUrl();
                        const apiRes = await axios.get(`${apiUrl}/api/freefire`);
                        const randomCharacter = apiRes.data?.freefire;

                        if (!randomCharacter || !randomCharacter.name || !randomCharacter.imgurLink) return;

                        const imageStream = await axios({
                                url: randomCharacter.imgurLink,
                                method: "GET",
                                responseType: "stream",
                                headers: { "User-Agent": "Mozilla/5.0" }
                        });

                        return api.sendMessage({
                                        body: getLang("start"),
                                        attachment: imageStream.data
                                },
                                event.threadID,
                                (err, info) => {
                                        if (err) return;
                                        global.GoatBot.onReply.set(info.messageID, {
                                                commandName: this.config.name,
                                                type: "reply",
                                                messageID: info.messageID,
                                                author: event.senderID,
                                                character: randomCharacter.name
                                        });

                                        setTimeout(() => {
                                                api.unsendMessage(info.messageID);
                                        }, 40000);
                                },
                                event.messageID
                        );
                } catch (error) {
                        return api.sendMessage(getLang("error", error.message), event.threadID, event.messageID);
                }
        }
};
