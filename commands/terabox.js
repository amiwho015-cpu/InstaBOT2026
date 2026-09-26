const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
	config: {
		name: "terabox",
		aliases: ["tb"],
		version: "3.1",
		author: "frnAlt",
		cooldown: 5,
		role: 0,
		shortDescription: "Download video/file directly from Terabox",
		longDescription: "Fetch and download files directly using Terabox Downloader API.",
		category: "media",
		guide: {
			en: "{pn} <terabox_url>"
		}
	},

	onStart: async function ({ api, event, args }) {
		try {
			if (args.length === 0) {
				return api.sendMessage(
					"⚠️ Please provide a Terabox link.\nExample: terabox <url>",
					event.threadID,
					event.messageID
				);
			}

			const url = args.join(" ");
			const apiUrl = `https://nexalo-api.vercel.app/api/terabox-downloader?url=${encodeURIComponent(url)}`;

			api.sendMessage("⏳ Fetching file, please wait...", event.threadID, event.messageID);

			const res = await axios.get(apiUrl);
			const data = res.data;

			if (!data.success || !data.downloadUrl) {
				return api.sendMessage("❌ Failed to fetch Terabox file.", event.threadID, event.messageID);
			}

			const { title, size, mimetype, downloadUrl, platform } = data;

			const sizeMB = (parseInt(size) / (1024 * 1024)).toFixed(2);
			const sizeGB = (parseInt(size) / (1024 * 1024 * 1024)).toFixed(2);
			const readableSize = sizeGB >= 1 ? `${sizeGB} GB` : `${sizeMB} MB`;

			if (parseInt(size) <= 25 * 1024 * 1024) {
				const cacheDir = path.join(__dirname, "cache");
				if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

				const safeFileName = `tb_${Date.now()}_file`;
				const filePath = path.join(cacheDir, safeFileName);

				const writer = fs.createWriteStream(filePath);
				const response = await axios({
					url: downloadUrl,
					method: "GET",
					responseType: "stream",
					maxRedirects: 5
				});

				response.data.pipe(writer);

				writer.on("finish", () => {
					api.sendMessage(
						{
							body: `✅ Downloaded from ${platform || "Terabox"}\n📂 ${title}\n📦 ${readableSize}\n📄 ${mimetype}`,
							attachment: fs.createReadStream(filePath)
						},
						event.threadID,
						() => {
							if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
						}
					);
				});

				writer.on("error", () => {
					api.sendMessage("❌ Error downloading file.", event.threadID, event.messageID);
				});
			} else {
				api.sendMessage(
					`⚠️ File exceeds Messenger limit (25MB).\n\n✅ Source: ${platform || "Terabox"}\n📂 ${title}\n📦 Size: ${readableSize}\n📄 Type: ${mimetype}\n🔗 Direct Link: ${downloadUrl}`,
					event.threadID,
					event.messageID
				);
			}
		} catch (err) {
			console.error("Terabox Error:", err.message);
			api.sendMessage("❌ An error occurred while processing the Terabox link.", event.threadID, event.messageID);
		}
	}
};
