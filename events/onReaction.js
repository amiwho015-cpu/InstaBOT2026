"use strict";

/**
 * onReaction — runs for reaction events (observer/log role).
 *
 * Reaction-based UNSend is owned exclusively by commands/unsend.js (via the
 * dispatcher's cmd.onReaction broadcast). This script previously called
 * unsendMessage as well, so every hand-emoji reaction triggered TWO unsend
 * attempts (the second always failing against the bridge). It is now a
 * passive observer: useful for reaction analytics/logging, never mutating
 * thread state.
 */

const log = require("../src/logger");

const HAND_EMOJIS = [
	"✋", "👌", "👍", "👏", "🙌", "👐", "🤲", "🙏", "🗑️", "🗑"
];

module.exports = {
	config: {
		name: "onReaction",
		category: "system",
		eventType: "message_reaction"
	},

	// The loader/dispatcher invokes scripts via onEvent(...). onStart is kept
	// as an alias so any caller using the other name still works.
	onEvent: async function (ctx) { return module.exports.onStart(ctx); },

	onStart: async function ({ event }) {
		const reaction = typeof event?.reaction === "string"
			? event.reaction
			: event?.reaction?.emoji;
		if (!reaction || event.reactionStatus === "deleted") return;
		if (!HAND_EMOJIS.some(emoji => reaction.includes(emoji))) return;

		// Unsend execution itself happens in commands/unsend.js (single owner).
		log.info("REACTION", `${event.senderID || event.userID || "?"} reacted ${reaction} to ${event.targetMessageID || event.target_message_id || event.messageID || "?"}`);
	}
};
