const axios = require("axios");
const fs = require("fs");
const path = require("path");

const baseApiUrl = async () => {
        const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        return base.data.mahmud;
};

module.exports = {
        config: {
                name: "marry",
                aliases: ["biye"],
                version: "1.7",
                author: "MahMUD",
                cooldown: 10,
                role: 0,
                description: {
                        en: "Generate a marriage image by mentioning someone",
                        vi: "Tạo hình ảnh kết hôn bằng cách gắn thẻ ai đó"
                },
                category: "love",
                guide: {
                        en: '   {pn} <@tag>: Tag someone to marry',
                        vi: '   {pn} <@tag>: Gắn thẻ ai đó để kết hôn'
                }
        },

        langs: {
                en: {
                        noTarget: "× Baby, please mention someone to marry! 💍",
                        success: "Here’s your marriage image baby! 🙈",
                        error: "× API error: %1. Contact MahMUD for help.\n•WhatsApp: 01836298139"
                },
                vi: {
                        noTarget: "× Cưng ơi, hãy gắn thẻ ai đó để kết hôn đi! 💍",
                        success: "Ảnh kết hôn của cưng đây! 🙈",
                        error: "× Lỗi: %1. Liên hệ MahMUD để hỗ trợ.\n•WhatsApp: 01836298139"
                }
        },

        onStart: async function ({ api, event, message, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                const mentions = Object.keys(event.mentions);
                if (mentions.length === 0) return message.reply(getLang("noTarget"));

                const senderID = event.senderID;
                const targetID = mentions[0];
                const cacheDir = path.join(__dirname, "cache");
                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
                const imgPath = path.join(cacheDir, `marry_${senderID}_${targetID}.png`);

                try {
                        api.setMessageReaction("⏳", event.messageID, () => {}, true);

                        const response = await axios.post(`${await baseApiUrl()}/api/marry`, 
                                { senderID, targetID }, 
                                { responseType: "arraybuffer" }
                        );

                        fs.writeFileSync(imgPath, Buffer.from(response.data));

                        return message.reply({
                                body: getLang("success"),
                                attachment: fs.createReadStream(imgPath)
                        }, () => {
                                api.setMessageReaction("✅", event.messageID, () => {}, true);
                                if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
                        });

                } catch (err) {
                        console.error("Marry Error:", err);
                        api.setMessageReaction("❌", event.messageID, () => {}, true);
                        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
                        return message.reply(getLang("error", err.message));
                }
        }
};
