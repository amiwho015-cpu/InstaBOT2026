const axios = require("axios");
const fs = require("fs");
const path = require("path");

const mahmud = async () => {
        const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        return base.data.mahmud;
};

module.exports = {
        config: {
                name: "fakechat",
                aliases: ["fc", "fake", "ফেকচ্যাট"],
                version: "1.7",
                author: "MahMUD",
                cooldown: 5,
                role: 0,
                description: {
                        bn: "কাউকে দিয়ে ফেক চ্যাট মেসেজ তৈরি করুন",
                        en: "Generate a fake chat message for someone",
                        vi: "Tạo tin nhắn trò chuyện giả cho ai đó"
                },
                category: "fun",
                guide: {
                        bn: '   {pn} <@tag/reply> <text>: ফেক মেসেজ তৈরি করুন'
                                + '\n   {pn} <uid> <text>: UID দিয়ে তৈরি করুন',
                        en: '   {pn} <@tag/reply> <text>: Create fake chat'
                                + '\n   {pn} <uid> <text>: Create via UID',
                        vi: '   {pn} <@tag/reply> <văn bản>: Tạo trò chuyện giả'
                                + '\n   {pn} <uid> <văn bản>: Tạo qua UID'
                }
        },

        langs: {
                bn: {
                        noTarget: "× বেবি, কাউকে মেনশন দাও, রিপ্লাই করো অথবা UID দাও! 🗨️",
                        noText: "× বেবি, চ্যাটে কি লিখবে সেই টেক্সট তো দাও! ✍️",
                        success: "🗨️ Fake chat generated for: %1",
                        error: "× সমস্যা হয়েছে: %1। প্রয়োজনে Contact MahMUD।"
                },
                en: {
                        noTarget: "× Baby, please reply, mention, or provide user UID! 🗨️",
                        noText: "× Baby, please provide the text for the fake chat! ✍️",
                        success: "🗨️ Fake chat generated for: %1",
                        error: "× API error: %1. Contact MahMUD for help."
                },
                vi: {
                        noTarget: "× Cưng ơi, vui lòng phản hồi, gắn thẻ hoặc cung cấp UID! 🗨️",
                        noText: "× Cưng ơi, vui lòng nhập nội dung tin nhắn giả! ✍️",
                        success: "🗨️ Đã tạo đoạn chat giả cho: %1",
                        error: "× Lỗi: %1. Liên hệ MahMUD để hỗ trợ."
                }
        },

        onStart: async function ({ api, event, args, message, usersData, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                try {
                        const { mentions, messageReply } = event;
                        let targetId;
                        let userText = args.join(" ").trim();

                        if (messageReply) {
                                targetId = messageReply.senderID;
                        } else if (Object.keys(mentions).length > 0) {
                                targetId = Object.keys(mentions)[0];
                                const mentionName = mentions[targetId];
                                userText = args.join(" ").replace(new RegExp(`@?${mentionName}`, "gi"), "").trim();
                        } else if (args.length > 0 && /^\d+$/.test(args[0])) {
                                targetId = args[0];
                                userText = args.slice(1).join(" ").trim();
                        }

                        if (!targetId) return message.reply(getLang("noTarget"));
                        if (!userText) return message.reply(getLang("noText"));

                        let userName = "Unknown";
                        try {
                                userName = (await usersData.getName(targetId)) || targetId;
                        } catch {
                                userName = targetId;
                        }

                        const baseUrl = await mahmud();
                        const apiUrl = `${baseUrl}/api/fakechat?id=${targetId}&name=${encodeURIComponent(userName)}&text=${encodeURIComponent(userText)}`;

                        const cacheDir = path.join(__dirname, "cache");
                        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
                        const filePath = path.join(cacheDir, `fakechat_${Date.now()}.png`);

                        const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
                        fs.writeFileSync(filePath, Buffer.from(response.data, "binary"));

                        return message.reply({
                                body: getLang("success", userName),
                                attachment: fs.createReadStream(filePath)
                        }, () => {
                                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
                        });

                } catch (err) {
                        console.error("Fakechat Error:", err);
                        return message.reply(getLang("error", err.message));
                }
        }
};
