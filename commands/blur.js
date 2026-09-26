const axios = require("axios");

const mahmud = async () => {
        const response = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        return response.data.mahmud;
};

module.exports = {
        config: {
                name: "blur",
                version: "1.7",
                author: "MahMUD",
                cooldown: 5,
                role: 0,
                description: {
                        bn: "যেকোনো ছবিকে ব্লার বা ঝাপসা করুন (১-১০০ লেভেল)",
                        en: "Blur any image (Level 1-100)",
                        vi: "Làm mờ bất kỳ hình ảnh nào (Cấp độ 1-100)"
                },
                category: "image",
                guide: {
                        bn: '   {pn} <লেভেল>: ছবির রিপ্লাই দিয়ে ব্যবহার করুন\n   {pn} <url> <লেভেল>: ছবির লিঙ্ক দিয়ে ব্যবহার করুন',
                        en: '   {pn} <level>: Reply to an image\n   {pn} <url> <level>: Provide an image URL',
                        vi: '   {pn} <cấp độ>: Phản hồi một hình ảnh\n   {pn} <url> <cấp độ>: Cung cấp liên kết hình ảnh'
                }
        },

        langs: {
                bn: {
                        invalidLevel: "× বেবি, ব্লার লেভেল ১ থেকে ১০০ এর মধ্যে দাও! ❌",
                        noImg: "× বেবি, একটি ছবিতে রিপ্লাই দাও অথবা ছবির লিঙ্ক দাও! 🖼️",
                        wait: "বেবি, একটু অপেক্ষা করো... আমি ব্লার করছি! <😘",
                        success: "এই নাও তোমার %1% ব্লার করা ছবি বেবি! <😘",
                        error: "× সমস্যা হয়েছে: %1। প্রয়োজনে Contact MahMUD।"
                },
                en: {
                        invalidLevel: "× Baby, please enter a blur level between 1–100! ❌",
                        noImg: "× Baby, please reply to an image or provide a URL! 🖼️",
                        wait: "Baby, please wait a moment while I blur it! <😘",
                        success: "Here's your %1% blurred image baby! <😘",
                        error: "× API error: %1. Contact MahMUD for help."
                },
                vi: {
                        invalidLevel: "× Cưng ơi, vui lòng nhập cấp độ mờ từ 1-100! ❌",
                        noImg: "× Cưng ơi, vui lòng phản hồi ảnh hoặc cung cấp liên kết! 🖼️",
                        wait: "Chờ chút nhé cưng, anh đang làm mờ ảnh! <😘",
                        success: "Ảnh mờ %1% của cưng đây! <😘",
                        error: "× Lỗi: %1. Liên hệ MahMUD để hỗ trợ."
                }
        },

        onStart: async function ({ api, args, message, event, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                try {
                        let imageUrl;
                        let blurLevel = 40;

                        if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) {
                                imageUrl = event.messageReply.attachments[0].url;
                                if (args[0] && !isNaN(args[0])) {
                                        const level = parseInt(args[0]);
                                        if (level >= 1 && level <= 100) blurLevel = level;
                                        else return message.reply(getLang("invalidLevel"));
                                }
                        } else if (args[0]?.startsWith("http")) {
                                imageUrl = args[0];
                                if (args[1] && !isNaN(args[1])) {
                                        const level = parseInt(args[1]);
                                        if (level >= 1 && level <= 100) blurLevel = level;
                                        else return message.reply(getLang("invalidLevel"));
                                }
                        } else {
                                return message.reply(getLang("noImg"));
                        }

                        api.setMessageReaction("😘", event.messageID, () => {}, true);
                        const waitMsg = await message.reply(getLang("wait"));

                        const apiUrl = await mahmud();
                        const imgStream = `${apiUrl}/api/blur/mahmud?url=${encodeURIComponent(imageUrl)}&blurLevel=${blurLevel}`;

                        const stream = await global.utils.getStreamFromURL(imgStream);

                        api.setMessageReaction("✅", event.messageID, () => {}, true);
                        if (waitMsg?.messageID) api.unsendMessage(waitMsg.messageID);

                        return message.reply({
                                body: getLang("success", blurLevel),
                                attachment: stream
                        });

                } catch (err) {
                        console.error("Blur Error:", err);
                        return message.reply(getLang("error", err.message));
                }
        }
};
