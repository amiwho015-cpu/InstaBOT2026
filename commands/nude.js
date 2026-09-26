const axios = require("axios");

const baseApiUrl = async () => {
        const base = await axios.get("https://raw.githubusercontent.com/mahmud-aura/HINATA/main/baseApiUrl.json");
        return base.data.mahmud;
};

module.exports = {
        config: {
                name: "nude",
                version: "2.7",
                author: "MahMUD",
                cooldown: 10,
                role: 2,
                description: {
                        en: "Fetch NSFW/anime images from custom API",
                        vi: "Lấy ảnh NSFW/anime từ API"
                },
                category: "NSFW",
                guide: {
                        en: '   {pn} [type]: Fetch image of specified type' +
                                '\n   {pn} list: Show all valid types',
                        vi: '   {pn} [type]: Lấy ảnh theo thể loại' +
                                '\n   {pn} list: Hiển thị danh sách thể loại'
                }
        },

        langs: {
                en: {
                        invalidType: "• Invalid type! Use `{pn} list` to see valid options.",
                        listHeader: "• Available types:\n\n",
                        success: "✅ | Type: %1",
                        error: "× API error: %1. Contact MahMUD for help.\n•WhatsApp: 01836298139"
                },
                vi: {
                        invalidType: "• Thể loại không hợp lệ! Dùng `{pn} list` để xem các tùy chọn.",
                        listHeader: "Các thể loại có sẵn:\n\n",
                        success: "✅ | Thể loại: %1",
                        error: "× Lỗi: %1. Liên hệ MahMUD để được hỗ trợ.\n•WhatsApp: 01836298139"
                }
        },

        onStart: async function ({ api, message, args, event, getLang }) {
                const authorName = String.fromCharCode(77, 97, 104, 77, 85, 68);
                if (this.config.author !== authorName) {
                        return api.sendMessage("You are not authorized to change the author name.", event.threadID, event.messageID);
                }

                const subCommand = args[0] ? args[0].toLowerCase() : null;

                try {                
                        const listRes = await axios.get(`${await baseApiUrl()}/api/nude/list`);
                        const validTypes = listRes.data.validTypes || [];

                        if (subCommand === "list" || subCommand === "types") {
                                const typesList = validTypes.join(", ");
                                return api.sendMessage(getLang("listHeader") + typesList + `\n\n• Example: nude [type]`, event.threadID, event.messageID);
                        }

                        const type = subCommand || "hentai";

                        if (!validTypes.includes(type)) {
                                return api.sendMessage(getLang("invalidType"), event.threadID, event.messageID);
                        }

                        api.setMessageReaction("⌛", event.messageID, () => {}, true);

                        const response = await axios.get(`${await baseApiUrl()}/api/nude?type=${type}`);

                        if (response.data.error) {
                                api.setMessageReaction("❌", event.messageID, () => {}, true);
                                return api.sendMessage(response.data.error, event.threadID, event.messageID);
                        }

                        const imageUrl = response.data.imageUrl;
                        const imageStream = await global.utils.getStreamFromURL(imageUrl);

                        api.setMessageReaction("✅", event.messageID, () => {}, true);

                        return api.sendMessage({
                                body: getLang("success", response.data.type),
                                attachment: imageStream
                        }, event.threadID, event.messageID);

                } catch (err) {
                        console.error("error", err);
                        api.setMessageReaction("❌", event.messageID, () => {}, true);
                        return api.sendMessage(getLang("error", err.message), event.threadID, event.messageID);
                }
        }
};
