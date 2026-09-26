"use strict";

// Broad hand-emoji list (mirrors the working Floppa-Chatbot unsend): any
// hand gesture or trash emoji reacting on a bot message deletes it.
const HAND_EMOJIS = [
	"✋", "🖐️", "🖐", "🤚", "👋", "👌", "👍", "👎", "✍️", "🤝",
	"🖕", "👊", "🤛", "🤜", "🤞", "🫰", "🤟", "🤘", "🤙",
	"👈", "👉", "👆", "👇", "☝️", "👏", "🙌", "👐", "🤲", "🙏",
	"🗑️", "🗑"
];

const MAX_BATCH_UNSEND = 25;

module.exports = {
	config: {
		name: "unsend",
		aliases: ["u", "delete", "del"],
		author: "Neoaz 🐊",
		category: "utility",
		cooldown: 1,
		role: 0,
		description: { en: "Unsend bot messages: reply with unsend, use unsend <count>, or react with a hand emoji on the bot's message" },
		usage: { en: "Reply to a bot message with {p}unsend | {p}unsend <number> | react with ✋ on the bot's message" }
	},

	onStart: async function ({ message, event, api, args }) {
		const botID = String((api && typeof api.getCurrentUserID === "function" && api.getCurrentUserID()) || "").trim();
		const threadID = event.threadID;

		// Mode 1: unsend the last N bot messages in this thread.
		if (args && args.length && /^\d+$/.test(args[0])) {
			const count = Math.min(parseInt(args[0], 10) || 0, MAX_BATCH_UNSEND);
			if (count <= 0) return message.reply("Please enter a valid number greater than 0.");
			const registry = global.botSentMessages;
			const threadBotMsgs = (registry && registry.get(String(threadID))) || [];
			if (!threadBotMsgs.length)
				return message.reply("No recent bot messages recorded in this chat to unsend.");
			const toUnsend = threadBotMsgs.splice(-count);
			let unsent = 0;
			for (const mid of toUnsend.reverse()) {
				try {
					await new Promise((resolve, reject) => {
						const r = api.unsendMessage(mid, threadID, (e, res) => e ? reject(e) : resolve(res));
						if (r && typeof r.then === "function") r.then(resolve, reject);
					});
					unsent++;
					await new Promise(r => setTimeout(r, 250));
				} catch (_) { /* already gone or too old */ }
			}
			if (!unsent) return message.reply("Could not unsend messages. They may have already been unsent or are too old.");
			return message.reply(`Cleaned up ${unsent} bot message(s).`);
		}

		// Mode 2: unsend the replied-to message.
		const replied = event.messageReply || event.repliedMessage;
		if (replied && replied.messageID) {
			// If the replied message is provably someone else's (and not the
			// bot's), say so instead of firing a doomed RPC.
			const cached = global.recentMessages && global.recentMessages.get(String(replied.messageID));
			if (botID && cached && cached.senderID && String(cached.senderID) !== botID && cached.isBot !== true) {
				return message.reply("I can only unsend messages sent by me!");
			}
			if (message && typeof message.unsend === "function") {
				return message.unsend(replied.messageID).catch(() => {});
			}
			await new Promise(resolve => {
				try {
					const r = api.unsendMessage(replied.messageID, threadID, () => resolve());
					if (r && typeof r.then === "function") r.then(() => resolve(), () => resolve());
				} catch (_) { resolve(); }
			});
			return;
		}

		// Mode 3: no reply, no count — remove the newest bot message here.
		const registry = global.botSentMessages;
		const threadBotMsgs = (registry && registry.get(String(threadID))) || [];
		if (threadBotMsgs.length) {
			const lastMID = threadBotMsgs[threadBotMsgs.length - 1];
			try {
				await new Promise((resolve, reject) => {
					const r = api.unsendMessage(lastMID, threadID, (e, res) => e ? reject(e) : resolve(res));
					if (r && typeof r.then === "function") r.then(resolve, reject);
				});
				return;
			} catch (_) { /* fall through to notice */ }
		}
		return message.reply("No bot message to unsend. Reply to a bot message with unsend, or use unsend <number>.");
	},

	/**
	 * Reaction unsend: reacting with a hand/trash emoji on a message removes
	 * it. Instagram only lets the bot unsend its OWN messages, so the target
	 * must be the bot's — verified via the send-time registry
	 * (global.botSentMessages) first, then the stream-echo cache.
	 *
	 * Authorisation (any one of):
	 *   - bot admin (injected checker OR config.adminBot/devUsers)
	 *   - thread admin / DM participant (dispatcher-computed role >= 1)
	 */
	onReaction: async function ({ api, event, role, isBotAdmin, config }) {
		const reaction = typeof event?.reaction === "string"
			? event.reaction
			: event?.reaction?.emoji || event?.reaction_unicode;
		if (!reaction) return;
		if (event.reactionStatus === "deleted" || event.reaction_status === "deleted") return;
		if (!HAND_EMOJIS.some(h => reaction.includes(h) || reaction === h)) return;

		// On Instagram transports the reacted-to message id may arrive as
		// targetMessageID or directly as messageID; accept both.
		const targetID = String(event.targetMessageID || event.target_message_id || event.messageID || "").trim();
		const threadID = event.threadID || event.thread_id;
		if (!targetID || !threadID) return;
		if (!api || typeof api.unsendMessage !== "function") return;

		// ── authorisation ──
		const senderID = String(event.senderID || event.userID || "").trim();
		let authorised = false;
		if (senderID) {
			if (typeof isBotAdmin === "function") {
				try { authorised = isBotAdmin(senderID) === true; } catch (_) { authorised = false; }
			}
			if (!authorised && config) {
				const admins = [
					...(Array.isArray(config.adminBot) ? config.adminBot : []),
					...(Array.isArray(config.ADMIN_BOT) ? config.ADMIN_BOT : []),
					...(Array.isArray(config.devUsers) ? config.devUsers : []),
					...(Array.isArray(config.DEV_USERS) ? config.DEV_USERS : [])
				].map(String);
				authorised = admins.includes(senderID);
			}
			if (!authorised && Number(role) >= 1) authorised = true;
		}
		if (!authorised) return;

		// ── ownership pre-check (bot can only unsend its own messages) ──
		// The send-time registry is authoritative: if the id is listed there,
		// it is the bot's — unsend without further checks. The echo cache can
		// veto only when it positively identifies a DIFFERENT human sender.
		const inRegistry = global.botSentMessages?.get?.(String(threadID))?.includes(targetID)
			|| (global.botSentMessages && typeof global.botSentMessages.values === "function"
				? [...global.botSentMessages.values()].some(list => list.includes(targetID))
				: false);
		if (!inRegistry) {
			const botID = String((typeof api.getCurrentUserID === "function" && api.getCurrentUserID()) || "").trim();
			const cached = global.recentMessages?.get?.(targetID);
			if (cached?.senderID && botID && String(cached.senderID) !== botID && cached.isBot !== true) return;
		}

		try {
			await new Promise((resolve, reject) => {
				try {
					const result = api.unsendMessage(targetID, threadID, (error, res) => error ? reject(error) : resolve(res));
					if (result && typeof result.then === "function") result.then(resolve, reject);
				} catch (e) { reject(e); }
			});
			// Keep the registry in sync (apiWrapper also forgets on success).
			const list = global.botSentMessages?.get?.(String(threadID));
			if (list) {
				const idx = list.indexOf(targetID);
				if (idx !== -1) list.splice(idx, 1);
			}
		} catch (_) { /* refused (not bot's message / already gone) — stay silent */ }
	}
};
