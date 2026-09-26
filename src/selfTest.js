"use strict";

/**
 * selfTest.js — Admin-inbox self-test mode ("*selftest").
 *
 * Runs INSIDE the live bot process: builds synthetic events for the major
 * commands and pushes them through the real dispatcher, then DMs the admin a
 * pass/fail table. Every command runs against a sandbox admin thread id so no
 * real chat is touched. Media/network commands are exercised with short
 * prompts; failures carry the error text so bugs are visible in the bot DM.
 *
 * Enable: add your UID to config.adminBot, then send: *selftest
 * Narrow: *selftest <name> [name...]   (e.g. *selftest ping help unsend)
 */

const log = require("./logger");

// [name, args, timeoutMs, validate(replyBodies, apiCalls)]
const TESTS = [
	["ping", [], 8000, (b) => b.some(x => /pong|ping/i.test(x))],
	["help", [], 8000, (b) => b.some(x => /command|help|menu|category/i.test(x))],
	["uptime", [], 8000, (b) => b.some(x => /uptime|running|since|hour|min/i.test(x))],
	["info", [], 10000, (b) => b.length > 0],
	["unsend", [], 8000, () => true], // must not throw
	["coinflip", [], 8000, (b) => b.some(x => /head|tail|coin/i.test(x))],
	["dice", [], 8000, (b) => b.some(x => /[1-6]/.test(x))],
	["roll", [], 8000, (b) => b.length > 0],
	["joke", [], 12000, (b) => b.length > 0],
	["translate", ["hello", "bn"], 15000, (b) => b.length > 0],
	["weather", ["dhaka"], 20000, (b) => b.length > 0],
	["pinterest", ["cat"], 25000, (b) => b.length > 0],
	["img", ["sunset"], 25000, (b) => b.length > 0],
	["sing", ["test", "--top"], 45000, (b) => b.length > 0],
	["tiktok", ["funny"], 30000, (b) => b.length > 0],
	["alldl", ["https://www.youtube.com/watch?v=dQw4w9WgXcQ"], 45000, (b) => b.length > 0],
	["gpt", ["hi"], 45000, (b) => b.length > 0]
];

async function runSelfTest({ dispatcher, config, threadID, tests = TESTS } = {}) {
	const results = [];
	const sandboxThread = `selftest_${Date.now()}`;

	for (const [name, args, timeoutMs, validate] of tests) {
		if (threadID && threadID !== sandboxThread && threadID !== "__all__") {
			// single-test mode appends names to threadID; handled by caller
		}
		const apiCalls = [];
		const bodies = [];
		const startedAt = Date.now();
		let outcome = "ok";
		let detail = "";

		// Patch-free interception: wrap the dispatcher by driving synthetic
		// events through handle() and reading the bot's own message echoes
		// (selfListen events) is complex; instead we call the command layer via
		// a scoped dispatcher proxy that records sends from the message ctx.
		try {
			const sent = [];
			const shimApi = new Proxy({}, {
				get(target, prop) {
					if (prop === "getCurrentUserID") return () => String(config.adminBot?.[0] || "selftest");
					if (prop === "calls") return apiCalls;
					if (/^(send|unsend|react|get|mark|set|add|remove|change|stop|listen|music)/i.test(String(prop))) {
						return (...cbArgs) => {
							apiCalls.push({ method: String(prop), args: cbArgs.filter(a => typeof a !== "function").map(a => (typeof a === "object" && a !== null) ? "[obj]" : String(a).slice(0, 60)) });
							const cb = cbArgs.find(a => typeof a === "function");
							const payload = cbArgs[0];
							if (/^send/i.test(String(prop))) {
								const body = typeof payload === "string" ? payload : (payload && payload.body);
								if (body) bodies.push(String(body));
							}
							if (cb) { try { cb(null, { messageID: `st_${apiCalls.length}`, threadID: sandboxThread }); } catch (_) {} }
							return Promise.resolve({ messageID: `st_${apiCalls.length}`, threadID: sandboxThread });
						};
					}
					return undefined;
				}
			});

			const event = {
				type: "message",
				threadID: sandboxThread,
				senderID: String(config.adminBot?.[0] || "selftest_admin"),
				messageID: `st_evt_${name}_${Date.now()}`,
				body: `*${name}${args.length ? " " + args.join(" ") : ""}`,
				timestamp: Date.now(),
				isGroup: false,
				attachments: [],
				messageReply: { messageID: "st_target_img", senderID: String(config.adminBot?.[0] || "x"), attachments: [{ type: "photo", url: "https://i.imgur.com/direct.jpg" }] }
			};

			// Dispatch through the REAL dispatcher but with our recording api.
			// The dispatcher was constructed with the bot's api; to avoid
			// sending real messages we run with a dedicated shim dispatcher.
			const { createDispatcher } = require("./dispatcher");
			const { createMessageContext } = require("./message");
			const shimDb = {
				users: { ensure: () => ({ banned: { status: false }, data: {}, settings: {} }), get: () => null, update: () => {}, flush: () => {} },
				threads: { ensure: () => ({ adminIDs: [], settings: {}, members: [], isGroup: false, groupKnown: true }), get: () => null, update: () => {}, flush: () => {} },
				messages: { get: () => null }
			};
			const { createRegistry, loadAll } = require("./commandLoader");
			const registry = createRegistry();
			loadAll(registry);

			const shimDispatcher = createDispatcher({ api: shimApi, config, registry, database: shimDb });
			await Promise.race([
				shimDispatcher.handle(event),
				new Promise((_, reject) => setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs))
			]);

			const ok = validate(bodies, apiCalls);
			outcome = ok ? "ok" : "no_output";
			if (!ok) detail = bodies.length ? bodies[0].slice(0, 80) : "no message produced";
		} catch (err) {
			outcome = /timeout/.test(err.message) ? "timeout" : "error";
			detail = String(err.message || err).slice(0, 120);
		}

		results.push({ name, outcome, detail, ms: Date.now() - startedAt, sends: bodies.length });
	}
	return results;
}

function formatReport(results) {
	const okCount = results.filter(r => r.outcome === "ok").length;
	const lines = [
		`🧪 𝗦𝗘𝗟𝗙𝗧𝗘𝗦𝗧 ${okCount}/${results.length} passed`,
		""
	];
	for (const r of results) {
		const icon = r.outcome === "ok" ? "✅" : (r.outcome === "timeout" ? "⏱️" : "❌");
		lines.push(`${icon} ${r.name} (${r.ms}ms)${r.outcome !== "ok" ? ` — ${r.outcome}: ${r.detail}` : ""}`);
	}
	return lines.join("\n");
}

module.exports = { runSelfTest, formatReport, TESTS, log };
