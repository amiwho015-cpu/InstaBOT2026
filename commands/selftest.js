"use strict";

/**
 * selftest — admin-only live self-test.
 *
 * Runs synthetic events through the real command layer with a recording api
 * and DMs the results to the admin. Nothing is sent to real chats: the shim
 * api records every send instead of delivering.
 *
 * Usage: *selftest                (full suite)
 *        *selftest ping help      (only these commands)
 */

const { runSelfTest, formatReport, TESTS } = require("../src/selfTest");

module.exports = {
	config: {
		name: "selftest",
		aliases: ["testbot", "diag"],
		author: "frnAlt",
		category: "admin",
		cooldown: 5,
		role: 2,
		description: { en: "Run a live self-test of the bot's commands and DM the report" },
		usage: { en: "{p}selftest [command ...]" }
	},

	onStart: async function ({ api, message, event, args, config, role }) {
		// role: 2 = bot admin (dispatcher resolves it; double-check anyway)
		const uid = String(event.senderID || event.userID || "").trim();
		const isBotAdmin =
			role >= 2 ||
			(Array.isArray(config.adminBot) && config.adminBot.map(String).includes(uid)) ||
			(Array.isArray(config.devUsers) && config.devUsers.map(String).includes(uid)) ||
			(typeof api.getCurrentUserID === "function" && String(api.getCurrentUserID()) === uid);
		if (!isBotAdmin) {
			return message.reply("🔒 Bot admin only.");
		}

		await message.reply("🧪 Running self-test… results in a moment.");

		let tests = TESTS;
		if (args && args.length) {
			const wanted = args.map(a => String(a).toLowerCase());
			tests = TESTS.filter(t => wanted.includes(t[0].toLowerCase()));
			if (!tests.length) {
				return message.reply(`No known test matches: ${args.join(", ")}\nAvailable: ${TESTS.map(t => t[0]).join(", ")}`);
			}
		}

		const results = await runSelfTest({ config, tests });
		return message.reply(formatReport(results));
	}
};
