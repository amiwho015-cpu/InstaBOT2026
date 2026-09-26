const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const baseApiUrl = async () => {
        const base = await axios.get("https://raw.githubusercontent.com/mahmudx7/HINATA/main/baseApiUrl.json");
        return base.data.mahmud;
};

module.exports = {
        config: {
                name: "tikedit",
                version: "1.7",
                author: "MahMUD",
                cooldown: 10,
                role: 0,
                description: {
                        bn: "টিকটক থেকে যেকোনো এডিট ভিডিও সার্চ করে ডাউনলোড করুন",
                        en: "Search and download any edit video from TikTok",
                        vi: "Tìm kiếm và tải xuống bất kỳ video chỉnh sửa nào từ TikTok"
                },
                category: "media",
                guide: {
                        bn: '   {pn} <নাম>: (যেমন: {pn} naruto edit)',
                        en: '   {pn} <keyword>: (Ex: {pn} naruto edit)',
                        vi: '   {pn} <từ khóa>: (VD: {pn} naruto edit)'
                }
        },

        langs: {
                bn: {
                        noInput: "× বেবি, কী ভিডিও খুঁজছো? নাম দাও! 🔍\nউদাহরণ: {pn} naruto edit",
                        tooLarge: "× ভিডিওটি ২৫ মেগাবাইটের বেশি বড়, তাই পাঠানো সম্ভব হয়নি।",
                        success: "🎬 | আপনার জন্য \"%1\" এর ভিডিও এখানে রয়েছে:",
                        error: "× সমস্যা হয়েছে: %1। প্রয়োজনে Contact MahMUD।"
                },
                en: {
                        noInput: "× Baby, please provide a search keyword! 🔍\nExample: {pn} naruto edit",
                        tooLarge: "× The video is larger than 25MB. Cannot send.",
                        success: "🎬 | Here's your TikTok edit for \"%1\":",
                        error: "× API error: %1. Contact MahMUD for help."
                },
                vi: {
                        noInput: "× Cưng ơi, hãy nhập từ khóa tìm kiếm! 🔍\nVD: {pn} naruto edit",
                        tooLarge: "× Video lớn hơn 25MB. Không thể gửi.",
                        success: "🎬 | Đây là video TikTok cho \"%1\":",
                        error: "× Lỗi: %1. Liên hệ MahMUD để hỗ trợ."
                }
        },

        onStart: async function ({ api, event, args, message, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                const keyword = args.join(" ");
                if (!keyword) return message.reply(getLang("noInput"));

                const cacheDir = path.join(__dirname, "cache");
                if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
                const videoPath = path.join(cacheDir, `tik_${Date.now()}.mp4`);

                try {
                        
                        api.setMessageReaction("⌛", event.messageID, () => {}, true);

                        const baseUrl = await baseApiUrl();
                        const response = await axios({
                                method: 'GET',
                                url: `${baseUrl}/api/tiksr`,
                                params: { sr: keyword },
                                responseType: 'stream'
                        });

                        const writer = fs.createWriteStream(videoPath);
                        response.data.pipe(writer);

                        await new Promise((resolve, reject) => {
                                writer.on('finish', resolve);
                                writer.on('error', reject);
                        });

                        const stats = fs.statSync(videoPath);
                        if (stats.size > 26214400) { 
                                api.setMessageReaction("❌", event.messageID, () => {}, true);
                                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                                return message.reply(getLang("tooLarge"));
                        }

                        await message.reply({
                                body: getLang("success", keyword),
                                attachment: fs.createReadStream(videoPath)
                        }, () => {
                                api.setMessageReaction("✅", event.messageID, () => {}, true);
                                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                        });

                } catch (err) {
                        console.error("TikTok Search Error:", err);
                        api.setMessageReaction("❌", event.messageID, () => {}, true);
                        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
                        return message.reply(getLang("error", err.message));
                }
        }
};
