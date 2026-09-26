const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const BASE_API = "https://metabyneokex.vercel.app/videos";

async function downloadFile(url, tempDir, filename) {
    const tempFilePath = path.join(tempDir, filename);
    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            timeout: 180000
        });
        await fs.writeFile(tempFilePath, response.data);
        return tempFilePath;
    } catch (e) {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        throw new Error(`Failed to download video: ${e.message}`);
    }
}

module.exports = {
    config: {
        name: "animate",
        aliases: ["anim", "vido", "mvid"],
        version: "2.0",
        author: "frnAlt",
        cooldown: 30,
        role: 0,
        longDescription: "Generate or edit videos using Meta AI.",
        category: "ai-video",
        guide: {
            en: "To generate: {pn} <prompt>\nTo animate image: Reply to an image with {pn} <prompt>"
        }
    },

    onStart: async function({ message, args, event, api }) {
        const prompt = args.join(" ");
        const cacheDir = path.join(__dirname, 'cache');
        if (!fs.existsSync(cacheDir)) await fs.mkdirp(cacheDir);

        if (!prompt) return message.reply("Please provide a prompt.");

        let repliedImgUrl = null;
        if (global.utils && typeof global.utils.extractImageUrl === "function") {
            repliedImgUrl = global.utils.extractImageUrl(event, [], { allowAvatar: false });
        }
        if (!repliedImgUrl && event.messageReply?.attachments?.length > 0) {
            for (const a of event.messageReply.attachments) {
                const u = a.url || a.largePreviewUrl || a.large_preview_url || a.previewUrl || a.preview_url || a.thumbnailUrl || a.thumbnail_url || a.image || a.photoUrl;
                if (u) { repliedImgUrl = u; break; }
            }
        }
        
        const isEdit = !!repliedImgUrl;
        const endpoint = isEdit ? `${BASE_API}/edit` : `${BASE_API}/generate`;
        const params = {
            prompt: prompt,
            poll_attempts: 25,
            poll_wait_seconds: 3
        };

        if (isEdit) {
            params.img_url = repliedImgUrl;
        }

        message.reaction("⏳", event.messageID);

        try {
            const response = await axios.get(endpoint, {
                params: params,
                timeout: 350000
            });

            const data = response.data;
            if (!data.success || !data.video_urls || data.video_urls.length === 0) {
                throw new Error("Action failed or API returned no video.");
            }

            const videoUrl = data.video_urls[0];
            const videoPath = await downloadFile(videoUrl, cacheDir, `meta_vid_${Date.now()}.mp4`);

            await message.reply({
                attachment: fs.createReadStream(videoPath)
            });

            message.reaction("👍", event.messageID);
            setTimeout(() => {
                if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            }, 10000);

        } catch (error) {
            message.reaction("👎", event.messageID);
            const errMsg = error.response?.data?.detail?.[0]?.msg || error.message;
            message.reply(`❌ Error: ${errMsg}`);
        }
    }
};
