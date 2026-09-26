const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports = {
	config: {
		name: "logo",
		aliases: ["logogen", "makelogo"],
		version: "1.0",
		author: "frnAlt",
		role: 0,
		shortDescription: "Generate a logo using AI",
		longDescription: "Creates high quality vector-style logo design based on text prompt.",
		category: "media",
		guide: {
			en: "{pn} <description | logo name>"
		}
	},

	onStart: async function ({ api, event, args }) {
		const { threadID, messageID } = event;
		try {
			if (!args[0]) {
				return api.sendMessage("⚠️ You must provide a description for the logo.\nExample: logo Floppa Bot | modern | neon blue", threadID, messageID);
			}

			const prompt = args.join(" ");
			const msg = await api.sendMessage("🎨 Generating your logo... Please wait", threadID);

			const url = `https://image.pollinations.ai/prompt/${encodeURIComponent("Logo design, vector, minimal, clean, " + prompt)}?width=768&height=768&nologo=true&model=turbo`;

			const cacheDir = path.join(__dirname, "cache");
			if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

			const tempPath = path.join(cacheDir, `logo_${Date.now()}.png`);
			const response = await axios.get(url, { responseType: "arraybuffer" });
			fs.writeFileSync(tempPath, response.data);

			if (msg?.messageID) await api.unsendMessage(msg.messageID);

			await api.sendMessage({
				body: `✅ Logo generated based on:\n"${prompt}"`,
				attachment: fs.createReadStream(tempPath)
			}, threadID, () => {
				if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
			}, messageID);

		} catch (err) {
			console.error("Logo command error:", err.message);
			api.sendMessage("❌ An error occurred while generating the logo.", threadID, messageID);
		}
	}
};
