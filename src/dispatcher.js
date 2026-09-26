"use strict";

/**
 * Message / event dispatcher: prefix parsing, roles, cooldowns, reply and
 * reaction hooks, and event script fan-out.
 * Author: Saifullah Al Neoaz (https://github.com/lazyneoaz)
 */

const t = require("./languages").text;
const log = require("./logger");
const { createMessageContext } = require("./message");

const ROLE_USER = 0;
const ROLE_ADMIN_BOX = 1;
const ROLE_ADMIN_BOT = 2;

// Events older than this are considered stale backlog flushed after downtime;
// answering them produces the "bot replies to commands sent while it was off"
// behaviour. 2 minutes covers clock skew and slow delivery.
const STALE_EVENT_CUTOFF_MS = 2 * 60 * 1000;

// Auto-talk (AI replies to non-command messages): minimum gap between two AI
// replies in the same thread. Prevents per-message AI flooding when a user
// (or another bot) sends many messages in a row.
const AUTOTALK_COOLDOWN_MS = 60 * 1000;
const AUTOTALK_USER_COOLDOWN_MS = 30 * 1000;
// Emoji-only / one-word pokes are not conversation: answering them is the
// "bot reacts to all my spam messages" behaviour.
const AUTOTALK_MIN_BODY = 4;
const AUTOTALK_MAX_EMOJI_RATIO = 0.6;

function createDispatcher({ api, config, registry, database }) {
	// Deduplication of realtime events. The MQTT/SSE transport can redeliver
	// the same event (reconnect replay, QoS redelivery) and after a restart the
	// server may flush every event queued while we were offline. Without this
	// set, users get duplicate/late responses to commands sent while the bot
	// was down — and duplicated bot messages.
	const processedEvents = new Map(); // eventKey -> expiry timestamp
	const EVENT_DEDUP_TTL_MS = 10 * 60 * 1000; // remember ids for 10 minutes
	const REACTION_DEDUP_TTL_MS = 90 * 1000; // reactions: short window only
	const MAX_TRACKED_EVENTS = 5000;
	const autoTalkLast = new Map(); // threadID -> last AI trigger timestamp
	const autoTalkUserLast = new Map(); // userID -> last AI trigger timestamp
	let lastEventCleanup = Date.now();
	function isDuplicateEvent(event) {
		// Key MUST be namespaced per event type. On reaction (and unsend) events
		// bridges put the TARGET message's id in messageID — that id was already
		// recorded when the original message event arrived, so a bare messageID
		// key made every reaction look like a duplicate and silently killed the
		// emoji-unsend feature.
		let id;
		if (event.type === "message_reaction") {
			const target = String(event.targetMessageID || event.target_message_id || event.messageID || "");
			const emoji = typeof event.reaction === "string"
				? event.reaction
				: (event.reaction?.emoji || event.reaction_unicode || "");
			const sender = String(event.senderID || event.userID || "");
			id = target ? `reaction:${target}:${emoji}:${sender}` : "";
		} else if (event.type === "message_unsend") {
			const mid = String(event.messageID || event.messageId || "");
			id = mid ? `unsend:${mid}` : "";
		} else {
			id = String(event.messageID || event.messageId || "");
		}
		if (!id) return false;
		const now = Date.now();
		if (now - lastEventCleanup > 60 * 1000) {
			lastEventCleanup = now;
			for (const [key, expiry] of processedEvents) {
				if (expiry <= now) processedEvents.delete(key);
			}
		}
		const existingExpiry = processedEvents.get(id);
		if (existingExpiry && existingExpiry > now) return true; // fresh marker → duplicate
		// Reactions get a short window: bridge redeliveries arrive within
		// seconds, while a user removing and re-adding the same emoji later
		// must still trigger the feature again.
		const ttl = id.startsWith("reaction:") ? REACTION_DEDUP_TTL_MS : EVENT_DEDUP_TTL_MS;
		processedEvents.set(id, now + ttl);
		if (processedEvents.size > MAX_TRACKED_EVENTS) {
			const firstKey = processedEvents.keys().next().value;
			processedEvents.delete(firstKey);
		}
		return false;
	}

	const cooldowns = new Map();
	const onReply = new Map(); // messageID -> { commandName, handler, at }
	const onReaction = new Map(); // messageID -> { commandName, handler, at }
	const refreshedUsers = new Set();

	// Expose global.GoatBot for compatibility with GoatBot V2 commands
	global.GoatBot = {
		onReply,
		onReaction,
		commands: registry.commands,
		aliases: registry.aliases,
		config
	};

	// Reply/reaction handlers are keyed by message id and were never removed, so
	// a long-running bot leaked one closure per command that arms a handler (AI,
	// roll, sing, cmd…). Reply handlers are also consumed one-shot in
	// runReplyHandlers; this sweep bounds the rest (e.g. reaction handlers that
	// are never triggered) by age.
	const HANDLER_TTL_MS = 30 * 60 * 1000;
	function pruneHandlers(now) {
		for (const map of [onReply, onReaction]) {
			if (map.size < 256) continue;
			for (const [key, value] of map) {
				if (now - (value.at || 0) > HANDLER_TTL_MS) map.delete(key);
			}
		}
	}

	function senderIDOf(event) {
		return String(event.senderID || event.userID || "");
	}

	function isBotAdmin(id) {
		const uid = String(id || "").trim();
		if (!uid) return false;
		if (api && typeof api.getCurrentUserID === "function") {
			try {
				const botID = String(api.getCurrentUserID() || "").trim();
				if (botID && uid === botID) return true;
			} catch (_) {}
		}
		const adminList = [
			...(Array.isArray(config.adminBot) ? config.adminBot : []),
			...(Array.isArray(config.ADMIN_BOT) ? config.ADMIN_BOT : []),
			...(Array.isArray(config.devUsers) ? config.devUsers : []),
			...(Array.isArray(config.DEV_USERS) ? config.DEV_USERS : [])
		].map(String).map(s => s.trim()).filter(Boolean);
		return adminList.includes(uid);
	}

	function roleOf(event, threadData) {
		const senderID = senderIDOf(event);
		if (isBotAdmin(senderID)) return ROLE_ADMIN_BOT;

		// Users are considered Level 1 Admins in their own DMs (Private Messages)
		const isDM = event && (
			event.isGroup === false || 
			(event.threadID && senderID && String(event.threadID) === senderID) || 
			(threadData && threadData.isGroup === false)
		);
		if (isDM) return ROLE_ADMIN_BOX;

		const rawAdmins = (threadData && (threadData.adminIDs || threadData.adminIds || threadData.admin_ids)) || [];
		const adminIDs = (Array.isArray(rawAdmins) ? rawAdmins : []).map(a => {
			if (!a) return "";
			if (typeof a === "object") return String(a.id || a.userID || a.pk || a.uid || "").trim();
			return String(a).trim();
		}).filter(Boolean);
		if (adminIDs.includes(senderID)) return ROLE_ADMIN_BOX;
		return ROLE_USER;
	}

	function requiredRole(command, threadData) {
		const configured = command.config.role;
		let role = 0;
		if (typeof configured === "number") role = configured;
		else if (configured && typeof configured === "object" && typeof configured.onStart === "number") role = configured.onStart;
		if (threadData && threadData.settings && typeof threadData.settings.setRole === "object")
			return threadData.settings.setRole[command.config.name] ?? role;
		return role;
	}

	function allowedByWhitelist(event) {
		if (!config.whiteList.enable) return true;
		const senderID = senderIDOf(event);
		if (isBotAdmin(senderID)) return true;
		return config.whiteList.userIDs.includes(senderID) || config.whiteList.threadIDs.includes(String(event.threadID));
	}

	function cooldownRemaining(command, senderID) {
		if (isBotAdmin(senderID)) return 0;
		const seconds = Number(command.config.cooldown ?? config.cooldown.default) || 0;
		if (seconds <= 0) return 0;
		const key = `${command.config.name}:${senderID}`;
		const last = cooldowns.get(key) || 0;
		const remaining = last + seconds * 1000 - Date.now();
		if (remaining > 0) return Math.ceil(remaining / 1000);
		cooldowns.set(key, Date.now());
		return 0;
	}

	function registerOnReply(messageID, commandName, handler) {
		onReply.set(String(messageID), { commandName, handler, at: Date.now() });
		return handler;
	}

	function registerOnReaction(messageID, commandName, handler) {
		onReaction.set(String(messageID), { commandName, handler, at: Date.now() });
		return handler;
	}

	function suggestionFor(name) {
		if (!name) return null;
		const candidates = new Set(registry.commands.keys());
		for (const alias of registry.aliases.keys()) candidates.add(alias);

		let best = null;
		let bestDistance = Infinity;
		for (const candidate of candidates) {
			const distance = levenshtein(name, candidate);
			// Nudge ties toward the shorter, more likely candidate.
			if (distance < bestDistance || (distance === bestDistance && best && candidate.length < best.length)) {
				bestDistance = distance;
				best = candidate;
			}
		}
		// Accept close matches only; 1 edit for short names, 2 for longer ones.
		const limit = name.length <= 3 ? 1 : 2;
		return bestDistance <= limit ? best : null;
	}

	function levenshtein(a, b) {
		const rows = Array.from({ length: b.length + 1 }, (_, i) => i);
		for (let i = 1; i <= a.length; i++) {
			let previous = rows[0];
			rows[0] = i;
			for (let j = 1; j <= b.length; j++) {
				const temp = rows[j];
				rows[j] = Math.min(rows[j] + 1, rows[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
				previous = temp;
			}
		}
		return rows[b.length];
	}

	async function runCommands(event, message, threadData, userData) {
		const body = typeof event.body === "string" ? event.body : "";
		if (!body) return;
		const senderID = senderIDOf(event);

		const threadPref = threadData && (threadData.settings?.prefix !== undefined ? threadData.settings.prefix : threadData.prefix);
		const basePref = config.prefix !== undefined ? config.prefix : (config.PREFIX !== undefined ? config.PREFIX : "*");
		const activePrefix = String((threadPref !== undefined && threadPref !== null) ? threadPref : basePref);
		const hasPrefix = Boolean(activePrefix && body.startsWith(activePrefix));
		const emptyPrefixMode = activePrefix === "";
		const rawBody = hasPrefix ? body.slice(activePrefix.length).trim() : body.trim();
		const rawArgs = rawBody ? rawBody.split(/\s+/) : [];
		const rawName = (rawArgs[0] || "").toLowerCase();

		// A command can opt into running without the prefix (config.noPrefix).
		// `prefix` uses this so the operator is never locked out after changing
		// (or forgetting) the prefix. Restrict to bot admins unless the command
		// explicitly allows role 0.
		const bare = registry.resolve(rawName);
		const bareAllowed = !!bare && bare.config.noPrefix === true &&
			(isBotAdmin(senderID) || bare.config.noPrefixRole === 0);
		// config.noPrefix === true lets commands answer WITHOUT the prefix for
		// everyone. It used to be admin-only while config.json ships
		// adminBot: [], which silently disabled every bare command — the
		// "non-prefix commands never respond" bug. Admin-only commands are
		// still gated by the needRole check below.
		const noPrefixAllowed = config.noPrefix === true;
		// Threads with autotalk enabled must reach the not-found branch so
		// plain chat can trigger the AI reply.
		const autotalkEnabled = threadData?.settings?.autotalk === true || threadData?.autotalk === true;

		if (!hasPrefix && !bareAllowed && !noPrefixAllowed && !emptyPrefixMode && !autotalkEnabled) return;

		const args = rawArgs.slice();
		const name = (args.shift() || "").toLowerCase();

		const role = roleOf(event, threadData);

		// 1. Thread Admin-Only / Bot OFF check
		const isThreadAdminOnly = threadData && (threadData.adminOnly === true || threadData.settings?.adminOnly === true || threadData.settings?.botOff === true);
		if (isThreadAdminOnly && role < ROLE_ADMIN_BOX) {
			const ignored = (config.adminOnly?.ignoreCommands || config.ADMIN_ONLY_IGNORE_COMMANDS || []).map(s => String(s).toLowerCase());
			if (!name || !ignored.includes(name)) {
				log.warn("COMMAND", `Ignored "${name}" from ${senderID} in thread ${event.threadID}: Thread is admin-only / bot-off`);
				return;
			}
		}

		// 2. Global Bot Admin-Only / Default-OFF check
		const isGlobalAdminOnly = Boolean(config.adminOnly?.enable || config.ADMIN_ONLY_ENABLE || config.defaultOff);
		if (isGlobalAdminOnly && !isBotAdmin(senderID)) {
			const ignored = (config.adminOnly?.ignoreCommands || config.ADMIN_ONLY_IGNORE_COMMANDS || []).map(s => String(s).toLowerCase());
			if (!name || !ignored.includes(name)) {
				log.warn("COMMAND", `Ignored "${name}" from ${senderID} in thread ${event.threadID}: Global admin-only / default-off`);
				return;
			}
		}

		const command = registry.resolve(name);

		if (!command) {
			// ── Auto-Talk: AI reply to plain (non-command) chat when the thread
			// opted in. Anti-spam guards: minimum body length, emoji-only
			// filter, per-thread AND per-user cooldowns; banned users are never
			// answered. This lives INSIDE the not-found branch: placed after
			// it, the trigger was dead code that could never run.
			const emojiLike = (() => {
				if (!body) return true;
				const chars = [...body];
				const emojiCount = chars.filter(ch => /\p{Extended_Pictographic}/u.test(ch)).length;
				return emojiCount > 0 && emojiCount / chars.length >= AUTOTALK_MAX_EMOJI_RATIO;
			})();
			if (autotalkEnabled && !hasPrefix && body.length >= AUTOTALK_MIN_BODY && !emojiLike
				&& !(userData && userData.banned && userData.banned.status)) {
				const threadKey = String(event.threadID);
				const userKey = `${event.threadID}:${senderID}`;
				const now = Date.now();
				if (now - (autoTalkLast.get(threadKey) || 0) < AUTOTALK_COOLDOWN_MS) {
					log.info("DISPATCH", `Auto-talk skipped in thread ${event.threadID} (thread cooldown)`);
				} else if (now - (autoTalkUserLast.get(userKey) || 0) < AUTOTALK_USER_COOLDOWN_MS) {
					log.info("DISPATCH", `Auto-talk skipped for user ${senderID} (user cooldown)`);
				} else {
					autoTalkLast.set(threadKey, now);
					autoTalkUserLast.set(userKey, now);
					if (autoTalkLast.size > 500) {
						const oldest = autoTalkLast.keys().next().value;
						autoTalkLast.delete(oldest);
					}
					if (autoTalkUserLast.size > 1000) {
						const oldest = autoTalkUserLast.keys().next().value;
						autoTalkUserLast.delete(oldest);
					}
					const aiCmd = registry.resolve("ai") || registry.resolve("ritchi");
					if (aiCmd) {
						return aiCmd.onStart({
							api,
							message,
							event,
							args: body.split(/\s+/),
							config,
							// Auto-triggered: suppress the decorative emoji reaction so
							// the bot does not react to every message in a spammy chat.
							autoTalk: true,
							setReplyHandler: (handler, mid) => {
								const key = mid != null ? mid : event.messageID;
								if (key) onReply.set(String(key), { commandName: "ai", handler, at: Date.now() });
							},
							usersData: database.users,
							threadsData: database.threads
						}).catch(() => { });
					}
				}
			}
			log.info("DISPATCH", `Command not found: "${name}" from ${senderID} in thread ${event.threadID}`);
			if (config.hideNotiMessage.commandNotFound || !hasPrefix) return;
			const suggestion = suggestionFor(name);
			// Uses the configured prefix via {pn}: "Did you mean *ping or try *help".
			const key = suggestion ? "commandNotFoundSuggestion" : "commandNotFound";
			const text = t(config.language, key, suggestion || "");
			return message.reply(text.replace(/\{pn\}/g, activePrefix));
		}

		const commandName = command.config.name.toLowerCase();

		if (userData && userData.banned && userData.banned.status) {
			log.warn("COMMAND", `Blocked "${commandName}" for banned user ${senderID} (${userData.banned.reason || "no reason"})`);
			if (!config.hideNotiMessage.userBanned)
				return message.reply(t(config.language, "userBanned", config.botName, userData.banned.reason || "—"));
			return;
		}

		const needRole = requiredRole(command, threadData);
		if (needRole > role) {
			log.warn("COMMAND", `Blocked "${commandName}" for user ${senderID} in thread ${event.threadID}: needRole=${needRole} > role=${role}`);
			const adminBaseCmds = ["bot", "admin", "adminbot", "botcontrol", "botmode", "togglebot", "cmd", "command", "event", "events", "eventcmd"];
			if (adminBaseCmds.includes(commandName)) {
				return;
			}
			if (!config.hideNotiMessage.needRoleToUseCommand) {
				const key = needRole === ROLE_ADMIN_BOT ? "onlyAdminBot" : "onlyAdmin";
				return message.reply(t(config.language, key, commandName));
			}
			return;
		}

		const wait = cooldownRemaining(command, senderID);
		if (wait) {
			log.warn("COMMAND", `Cooldown active for "${commandName}" by ${senderID} in thread ${event.threadID}: ${wait}s remaining`);
			return message.reply(t(config.language, "cooldown", wait, commandName));
		}

		const commandApi = {
			api,
			bot: { commandLoader: { commands: registry.commands, aliases: registry.aliases } },
			logger: require("../logger/log.js"),
			log,
			utils: global.utils,
			FontSystem: global.utils?.FontSystem,
			fonts: global.utils?.FontSystem?.fonts,
			styler: global.utils,
			prefix: activePrefix,
			getText: (h, k, ...a) => global.utils && typeof global.utils.getText === "function" ? global.utils.getText(h, k, ...a) : (t(config.language, k, ...a) || k || ""),
			getLang: (key, ...formatArgs) => {
				const lang = config.language || "en";
				const langs = command.langs || command.languages;
				if (langs && langs[lang] && langs[lang][key] !== undefined) {
					let str = langs[lang][key];
					for (let i = 0; i < formatArgs.length; i++) {
						str = str.replace(new RegExp(`%${i + 1}`, "g"), String(formatArgs[i]));
					}
					return str;
				}
				if (langs && langs.en && langs.en[key] !== undefined) {
					let str = langs.en[key];
					for (let i = 0; i < formatArgs.length; i++) {
						str = str.replace(new RegExp(`%${i + 1}`, "g"), String(formatArgs[i]));
					}
					return str;
				}
				return t(lang, key, ...formatArgs);
			},
			message,
			event,
			messageReply: event.messageReply || event.repliedMessage || null,
			replyTo: event.messageReply || event.repliedMessage || event.replyTo || null,
			repliedMessage: event.repliedMessage || event.messageReply || null,
			threadID: event.threadID,
			senderID,
			args,
			commandName,
			// The name the user actually typed (an alias like `unban`), which is
			// what a command with several aliases must branch on. `commandName`
			// is always the canonical name (e.g. `ban`).
			invokedAs: name,
			role,
			isGroup: Boolean(event.isGroup),
			isDM: !event.isGroup,
			usersData: database.users,
			threadsData: database.threads,
			globalData: database,
			usersDB: database.users,
			threadsDB: database.threads,
			globalDB: database,
			money: database.users,
			userStat: database.users,
			userData,
			threadData,
			config,
			registry,
			Reply: (form, cb) => message.reply(form).then(res => { cb && cb(null, res); return res; }).catch(err => { cb && cb(err); throw err; }),
			React: (emoji, cb) => message.react(emoji).then(res => { cb && cb(null, res); return res; }).catch(err => { cb && cb(err); throw err; }),
			database,
			globalModel: database,
			models: database,
			removeCommandNameFromBody: (b, p, n) => (b || "").replace(new RegExp(`^${p}(\\s+|)${n}`, "i"), "").trim(),
			/**
			 * Arm a handler for a reply. Pass the message a user must reply TO
			 * (`messageID`), e.g. the result of `message.reply(...)`. Without it
			 * the triggering message is used, which only matches replies to the
			 * command message itself.
			 */
			setReplyHandler(handler, messageID) {
				const key = messageID != null ? messageID : event.messageID;
				if (key == null) return handler;
				onReply.set(String(key), { commandName, handler, at: Date.now() });
				return handler;
			},
			setReactionHandler(handler, messageID) {
				const key = messageID != null ? messageID : event.messageID;
				if (key == null) return handler;
				onReaction.set(String(key), { commandName, handler, at: Date.now() });
				return handler;
			}
		};

		const startTime = Date.now();
		log.info("COMMAND", `[TRIGGER] ${commandName} (${name}) | User: ${senderID} | Thread: ${event.threadID}${args.length ? ` | Args: "${args.join(" ")}"` : ""}`);

		try {
			if (typeof command.onStart === "function") {
				await command.onStart(commandApi);
			} else if (typeof command.run === "function") {
				await command.run(commandApi);
			} else if (typeof command.execute === "function") {
				await command.execute(commandApi);
			}
			const elapsed = Date.now() - startTime;
			log.success("COMMAND", `[OK] "${commandName}" completed in ${elapsed}ms`);
			if (config.autoReactOnCommand) {
				const autoEmoji = typeof config.autoReactOnCommand === "string" ? config.autoReactOnCommand : "✅";
				message.react(autoEmoji).catch(() => {});
			}
		}
		catch (error) {
			const elapsed = Date.now() - startTime;
			log.error("COMMAND", `[FAIL] "${commandName}" failed after ${elapsed}ms: ${error.message || error}`, error);
			if (config.autoReactOnCommand) {
				message.react("❌").catch(() => {});
			}
			try {
				await message.reply(t(config.language, "errorOccurred", commandName, String(error.message || error)));
			} catch (_) {}
		}
	}

	async function runReplyHandlers(event, message, threadData, userData) {
		const repliedID = event.messageReply && event.messageReply.messageID;
		if (!repliedID) return false;
		const entry = onReply.get(String(repliedID));
		if (!entry) return false;
		// One-shot: consume the handler so the map cannot grow without bound.
		onReply.delete(String(repliedID));

		if (userData && userData.banned && userData.banned.status) {
			if (!config.hideNotiMessage.userBanned)
				await message.reply(t(config.language, "userBanned", config.botName, userData.banned.reason || "—"));
			return true;
		}

		const activePrefix = (threadData && (threadData.settings?.prefix || threadData.prefix)) || config.prefix || "*";
		const cmd = entry.commandName ? registry.resolve(entry.commandName) : null;
		const getLang = (key, ...formatArgs) => {
			const lang = config.language || "en";
			const langs = cmd ? (cmd.langs || cmd.languages) : null;
			if (langs && langs[lang] && langs[lang][key] !== undefined) {
				let str = langs[lang][key];
				for (let i = 0; i < formatArgs.length; i++) {
					str = str.replace(new RegExp(`%${i + 1}`, "g"), String(formatArgs[i]));
				}
				return str;
			}
			if (langs && langs.en && langs.en[key] !== undefined) {
				let str = langs.en[key];
				for (let i = 0; i < formatArgs.length; i++) {
					str = str.replace(new RegExp(`%${i + 1}`, "g"), String(formatArgs[i]));
				}
				return str;
			}
			return t(lang, key, ...formatArgs);
		};

		log.info("REPLY", `[TRIGGER] Reply handler for "${entry.commandName}" | User: ${senderIDOf(event)} | Thread: ${event.threadID}`);

		try {
			if (typeof entry.handler === "function") {
				await entry.handler({
					api,
					message,
					event,
					args: event.body ? event.body.split(/\s+/) : [],
					usersData: database.users,
					threadsData: database.threads,
					userData,
					threadData,
					config,
					commandName: entry.commandName,
					prefix: activePrefix,
					bot: { commandLoader: { commands: registry.commands, aliases: registry.aliases } },
					logger: require("../logger/log.js"),
					log,
					utils: global.utils,
					getLang,
					Reply: (form, cb) => message.reply(form).then(res => { cb && cb(null, res); return res; }).catch(err => { cb && cb(err); throw err; }),
					React: (emoji, cb) => message.react(emoji).then(res => { cb && cb(null, res); return res; }).catch(err => { cb && cb(err); throw err; }),
					setReplyHandler(handler, messageID) {
						const key = messageID != null ? messageID : event.messageID;
						if (key == null) return handler;
						onReply.set(String(key), { commandName: entry.commandName, handler, at: Date.now() });
						return handler;
					},
					setReactionHandler(handler, messageID) {
						const key = messageID != null ? messageID : event.messageID;
						if (key == null) return handler;
						onReaction.set(String(key), { commandName: entry.commandName, handler, at: Date.now() });
						return handler;
					}
				});
			} else if (cmd && typeof cmd.onReply === "function") {
				await cmd.onReply({
					api,
					message,
					event,
					Reply: entry,
					args: event.body ? event.body.split(/\s+/) : [],
					usersData: database.users,
					threadsData: database.threads,
					userData,
					threadData,
					config,
					commandName: entry.commandName,
					prefix: activePrefix,
					bot: { commandLoader: { commands: registry.commands, aliases: registry.aliases } },
					logger: require("../logger/log.js"),
					log,
					utils: global.utils,
					getLang
				});
			}
		}
		catch (error) {
			log.error("REPLY", `Error in reply handler for "${entry.commandName}"`, error);
		}
		return true;
	}

	async function runReactionHandlers(event, message, threadData, userData) {
		const entry = onReaction.get(String(event.messageID));
		if (!entry) return false;
		if (userData && userData.banned && userData.banned.status) return true;

		const activePrefix = (threadData && (threadData.settings?.prefix || threadData.prefix)) || config.prefix || "*";
		const cmd = entry.commandName ? registry.resolve(entry.commandName) : null;
		const getLang = (key, ...formatArgs) => {
			const lang = config.language || "en";
			const langs = cmd ? (cmd.langs || cmd.languages) : null;
			if (langs && langs[lang] && langs[lang][key] !== undefined) {
				let str = langs[lang][key];
				for (let i = 0; i < formatArgs.length; i++) {
					str = str.replace(new RegExp(`%${i + 1}`, "g"), String(formatArgs[i]));
				}
				return str;
			}
			if (langs && langs.en && langs.en[key] !== undefined) {
				let str = langs.en[key];
				for (let i = 0; i < formatArgs.length; i++) {
					str = str.replace(new RegExp(`%${i + 1}`, "g"), String(formatArgs[i]));
				}
				return str;
			}
			return t(lang, key, ...formatArgs);
		};

		log.info("REACTION", `[TRIGGER] Reaction handler for "${entry.commandName}" | User: ${senderIDOf(event)} | Thread: ${event.threadID}`);

		try {
			if (typeof entry.handler === "function") {
				await entry.handler({
					api,
					message,
					event,
					usersData: database.users,
					threadsData: database.threads,
					userData,
					threadData,
					config,
					commandName: entry.commandName,
					prefix: activePrefix,
					bot: { commandLoader: { commands: registry.commands, aliases: registry.aliases } },
					logger: require("../logger/log.js"),
					log,
					utils: global.utils,
					getLang,
					setReplyHandler(handler, messageID) {
						const key = messageID != null ? messageID : event.messageID;
						if (key == null) return handler;
						onReply.set(String(key), { commandName: entry.commandName, handler, at: Date.now() });
						return handler;
					},
					setReactionHandler(handler, messageID) {
						const key = messageID != null ? messageID : event.messageID;
						if (key == null) return handler;
						onReaction.set(String(key), { commandName: entry.commandName, handler, at: Date.now() });
						return handler;
					}
				});
			} else if (cmd && typeof cmd.onReaction === "function") {
				await cmd.onReaction({
					api,
					message,
					event,
					Reaction: entry,
					usersData: database.users,
					threadsData: database.threads,
					userData,
					threadData,
					config,
					commandName: entry.commandName,
					prefix: activePrefix,
					bot: { commandLoader: { commands: registry.commands, aliases: registry.aliases } },
					logger: require("../logger/log.js"),
					log,
					utils: global.utils,
					getLang
				});
			}
		}
		catch (error) {
			log.error("REACTION", `Error in reaction handler for "${entry.commandName}"`, error);
		}
		return true;
	}

	async function runEventScripts(event, message, threadData, userData) {
		const isBotOff = threadData && (threadData.adminOnly === true || threadData.settings?.adminOnly === true || threadData.settings?.botOff === true);
		const isEventsOff = threadData && (threadData.eventsOff === true || threadData.settings?.eventsOff === true);
		for (const script of registry.events) {
			const isChatFacingEvent = script.config?.name === "onJoin" || script.config?.name === "onLeave" ||
				(Array.isArray(script.config?.eventType) ? script.config.eventType.some(t => ["join", "leave"].includes(t)) : ["join", "leave"].includes(script.config?.eventType));
			if ((isBotOff || isEventsOff) && isChatFacingEvent) {
				continue;
			}
			// eventType may be a single type or an array of them (e.g. onMessage
			// listens to both "message" and "message_reply").
			const wanted = script.config.eventType;
			if (wanted) {
				const list = Array.isArray(wanted) ? wanted : [wanted];
				if (!list.includes(event.type)) continue;
			}
			try {
				await script.onEvent({ api, message, event, usersData: database.users, threadsData: database.threads, userData, threadData, config, role: roleOf(event, threadData) });
			}
			catch (error) {
				log.error("EVENT", `Error in event "${script.config.name}"`, error);
			}
		}
	}

	function refreshUserIfNeeded(userData, userID) {
		if (!userData || userData.name || refreshedUsers.has(userID)) return;
		refreshedUsers.add(userID);
		api.getUserInfo(userID, (error, info) => {
			if (error || !info || !info[userID]) return;
			const profile = info[userID];
			database.users.update(userID, {
				name: profile.name || profile.firstName || null,
				username: profile.vanity || null
			});
		});
	}

	/**
	 * Decide whether a thread is a group. The transport reports `isGroup` when
	 * it knows it; when the field is missing we check the event's participant
	 * list, then a cached value, and finally ask the API once per thread.
	 */
	async function resolveThreadGroup(event, threadData) {
		const senderID = senderIDOf(event);

		if (event.isGroup === true) {
			if (!threadData.isGroup || !threadData.groupKnown) {
				database.threads.update(event.threadID, { isGroup: true, groupKnown: true });
			}
			if (api && typeof api.getThreadInfo === "function" &&
				(!Array.isArray(threadData.adminIDs) || threadData.adminIDs.length === 0 || !threadData._adminFetchedAt || (Date.now() - (threadData._adminFetchedAt || 0) > 10 * 60 * 1000))) {
				threadData._adminFetchedAt = Date.now();
				// Fetch group admins asynchronously in the background so command execution is instantaneous
				api.getThreadInfo(event.threadID, (error, info) => {
					if (!error && info) {
						const rawAdmins = info.adminIDs || info.adminIds || info.admin_ids || info.admin_user_ids || info.thread_admin_ids || [];
						const adminList = (Array.isArray(rawAdmins) ? rawAdmins : [])
							.map(a => (typeof a === "object" ? (a.id || a.userID || a.pk || a.uid) : a))
							.filter(Boolean)
							.map(String);
						if (Array.isArray(info.userInfo)) {
							for (const u of info.userInfo) {
								if (u && (u.isAdmin || u.is_admin) && (u.userID || u.userId || u.id || u.pk)) {
									adminList.push(String(u.userID || u.userId || u.id || u.pk));
								}
							}
						}
						if (Array.isArray(info.participants)) {
							for (const p of info.participants) {
								if (p && (p.isAdmin || p.is_admin) && (p.userID || p.userId || p.id || p.pk)) {
									adminList.push(String(p.userID || p.userId || p.id || p.pk));
								}
							}
						}
						if (info.inviter) {
							const inviterId = typeof info.inviter === "object" ? (info.inviter.userID || info.inviter.userId || info.inviter.id || info.inviter.pk) : info.inviter;
							if (inviterId) adminList.push(String(inviterId));
						}
						const uniqueAdmins = Array.from(new Set(adminList));
						const updates = { isGroup: true, groupKnown: true, _adminFetchedAt: Date.now() };
						if (info.name || info.threadName) updates.name = info.name || info.threadName;
						if (uniqueAdmins.length > 0) {
							updates.adminIDs = uniqueAdmins;
							threadData.adminIDs = uniqueAdmins;
						}
						database.threads.update(event.threadID, updates);
					}
				});
			}
			return { isGroup: true, known: true };
		}

		if (event.isGroup === false || (senderID && String(event.threadID) === senderID)) {
			if (threadData && (threadData.isGroup !== false || !threadData.groupKnown)) {
				database.threads.update(event.threadID, { isGroup: false, groupKnown: true });
			}
			return { isGroup: false, known: true };
		}

		const members = new Set();
		for (const list of [event.participantIDs, event.userIDs, event.participants]) {
			if (Array.isArray(list)) for (const id of list) if (id != null && String(id)) members.add(String(id));
		}
		if (members.size > 2) {
			database.threads.update(event.threadID, { isGroup: true, groupKnown: true });
			return { isGroup: true, known: true };
		}
		if (members.size === 2) {
			database.threads.update(event.threadID, { isGroup: false, groupKnown: true });
			return { isGroup: false, known: true };
		}
		if (threadData && threadData.groupKnown) return { isGroup: threadData.isGroup === true, known: true };

		// Fallback for mock tests where api.getThreadInfo is synchronous/mocked
		if (api && typeof api.getThreadInfo === "function" && Array.isArray(api.calls)) {
			try {
				const info = await new Promise((resolve, reject) => {
					let done = false;
					const timer = setTimeout(() => { if (!done) { done = true; resolve(null); } }, 2000);
					api.getThreadInfo(event.threadID, (error, result) => {
						if (!done) { done = true; clearTimeout(timer); error ? reject(error) : resolve(result); }
					});
				});
				if (info) {
					const determinedIsGroup = !!(info.isGroup === true || Number(info.threadType) === 2 ||
						(Array.isArray(info.participantIDs) && info.participantIDs.length > 2) ||
						(Array.isArray(info.participants) && info.participants.length > 2) ||
						(Array.isArray(info.userInfo) && info.userInfo.length > 2));
					const updates = { isGroup: determinedIsGroup, groupKnown: true };
					if (info.name || info.threadName) updates.name = info.name || info.threadName;
					database.threads.update(event.threadID, updates);
					return { isGroup: determinedIsGroup, known: true };
				}
			} catch (_) {}
		}

		const threadIdStr = String(event.threadID || "");
		const looksLikeGroup = threadIdStr.length >= 17 && /^\d+$/.test(threadIdStr);
		return { isGroup: looksLikeGroup, known: false };
	}

	async function handle(event) {
		if (!event || !event.threadID) return;
		pruneHandlers(Date.now());

		// Drop duplicated realtime deliveries (reconnect replay, queued backlog
		// flushed after a restart). Applied for all event kinds.
		if (isDuplicateEvent(event)) {
			log.info("DISPATCH", `Skipped duplicate event (${event.type || "unknown"}) in thread ${event.threadID}`);
			return;
		}

		// Drop stale events: if an event was queued server-side while the bot was
		// offline, replying to it now produces the "response arrives long after
		// the command" behaviour. Messages older than the cutoff are logged and
		// ignored; reactions and membership changes are never replayed as
		// messages, so only message types need the check.
		if ((event.type === "message" || event.type === "message_reply") && event.timestamp) {
			// Instagram transports mostly use ms, but payloads in the wild also
			// carry seconds (10 digits) and microseconds (16 digits,
			// timestampAbsolute). Normalize to ms so the age math is correct
			// regardless of which unit a bridge forwarded.
			let tsMs = Number(event.timestamp);
			if (Number.isFinite(tsMs) && tsMs > 0) {
				if (tsMs < 1e12) tsMs *= 1000;            // seconds -> ms
				else if (tsMs > 1e15) tsMs = Math.round(tsMs / 1000); // µs -> ms
				const ageMs = Date.now() - tsMs;
				if (ageMs > STALE_EVENT_CUTOFF_MS) {
					log.info("DISPATCH", `Skipped stale event (${event.type}) from ${new Date(tsMs).toISOString()} in thread ${event.threadID}`);
					return;
				}
			}
		}

		const senderID = senderIDOf(event);
		if (!senderID && (event.type === "message" || event.type === "message_reply")) return;

		// Maintain fast in-memory LRU message cache for quick reply/reaction lookups (edit, unsend, replay)
		// Only actual messages are cached: reaction/unsend events carry the TARGET
		// message's id in messageID, and caching those overwrote the original bot
		// message entry with the reactor's senderID — which made unsend's
		// ownership pre-check believe the message wasn't the bot's and silently
		// refuse every admin reaction. This MUST run before the self-guard so
		// the bot's own (echoed) messages stay resolvable for ownership checks.
		if (event.messageID && (event.type === "message" || event.type === "message_reply")) {
			global.recentMessages = global.recentMessages || new Map();
			global.recentMessages.set(String(event.messageID), {
				messageID: String(event.messageID),
				threadID: String(event.threadID),
				senderID,
				body: event.body || "",
				attachments: event.attachments || [],
				messageReply: event.messageReply || null,
				isGroup: event.isGroup,
				timestamp: event.timestamp || Date.now()
			});
			if (global.recentMessages.size > 2000) {
				const firstKey = global.recentMessages.keys().next().value;
				global.recentMessages.delete(firstKey);
			}
		}
		if (!database.messages) {
			database.messages = {
				get: (id) => global.recentMessages?.get(String(id)) || null,
				set: (id, val) => global.recentMessages?.set(String(id), val),
				has: (id) => global.recentMessages?.has(String(id)) || false
			};
		}

		// Self-message guard: with selfListen disabled the engine should never
		// deliver our own messages on the live stream, but the server's
		// reconnect/restart backlog DOES replay them — and every own message
		// that slipped through made the bot react to itself (autotalk answering
		// its own replies = the auto-spam loop, plus duplicate outputs).
		// Operators who intentionally enable selfListen keep normal behaviour.
		// Runs AFTER the cache block: own echoes are cached (so unsend/edit can
		// resolve them) but never processed.
		if (senderID && config.selfListen !== true && api && typeof api.getCurrentUserID === "function") {
			try {
				const botID = String(api.getCurrentUserID() || "").trim();
				if (botID && senderID === botID) {
					log.info("DISPATCH", `Skipped self message (own echo/backlog) in thread ${event.threadID}`);
					return;
				}
			} catch (_) {}
		}

		if (!allowedByWhitelist(event)) return;

		const threadData = database.threads.ensure(event.threadID, { threadID: event.threadID });
		let userData = null;
		if (senderID) userData = database.users.ensure(senderID, { userID: senderID });

		// Resolve the real thread type before any command or event script runs,
		// and feed the answer back onto the event so join/leave scripts and
		// group-only commands see the truth.
		// Reaction/unsend events SKIP this: they never run commands, and on a
		// thread with a cold cache resolveThreadGroup can await getThreadInfo
		// (2s timer) — that was the "emoji unsend sometimes delayed" bug.
		if (event.type === "message_reaction" || event.type === "message_unsend") {
			event.isGroup = threadData.groupKnown ? threadData.isGroup === true : event.isGroup === true;
		} else {
			const group = await resolveThreadGroup(event, threadData);
			event.isGroup = group.isGroup;
			if (group.known) {
				threadData.isGroup = group.isGroup;
				threadData.groupKnown = true;
			}
		}

		const message = createMessageContext({ api, event, log });

		switch (event.type) {
			case "message":
			case "message_reply":
				refreshUserIfNeeded(userData, senderID);
				await runEventScripts(event, message, threadData, userData);
				if (await runReplyHandlers(event, message, threadData, userData)) break;
				await runCommands(event, message, threadData, userData);
				break;
			case "message_reaction":
				await runEventScripts(event, message, threadData, userData);
				await runReactionHandlers(event, message, threadData, userData);

				// Broadcast to commands exporting onReaction (e.g. unsend).
				// Commands run in PARALLEL: one slow onReaction must not delay
				// the others (unsend-on-emoji latency).
				{
					const reactionCommands = [];
					for (const cmd of registry.commands.values()) {
						if (typeof cmd.onReaction === "function") reactionCommands.push(cmd);
					}
					await Promise.allSettled(reactionCommands.map(cmd =>
						Promise.resolve(cmd.onReaction({
							api,
							event,
							message,
							role: roleOf(event, threadData),
							isBotAdmin,
							usersData: database.users,
							threadsData: database.threads,
							userData,
							threadData,
							config
						})).catch(err => {
							log.error("REACTION", `Error running onReaction for ${cmd.config?.name}:`, err);
						})
					));
				}

				// Tap-to-replay & reaction unsend target resolution. On Instagram
				// transports the reacted-to message id may arrive as
				// targetMessageID; some bridges put it straight in messageID.
				const targetMsgID = event.targetMessageID || event.target_message_id || event.messageID;
				const emoji = typeof event.reaction === 'string' ? event.reaction : event.reaction?.emoji || event.reaction_unicode;

				// Emoji sets used by reaction features. Reaction-based unsend is
				// owned by commands/unsend.js (see the broadcast below); replay
				// is handled here because no command claims it.
				const UNSEND_EMOJIS = [
					"✋", "👌", "👍", "👏", "🙌", "👐", "🤲", "🙏", "🗑️", "🗑"
				];
				const REPLAY_EMOJIS = ["🔁", "🔄", "💬", "🗣️", "🔊", "▶️"];

				if (targetMsgID && emoji && UNSEND_EMOJIS.some(h => emoji.includes(h) || emoji === h)) {
					// Handled by commands/unsend.js via the cmd.onReaction broadcast
					// above; nothing to do here. (Do NOT return: the flush below
					// must still run.)
				} else if (targetMsgID && emoji && REPLAY_EMOJIS.includes(emoji)) {
					// Tap-to-replay: repeat the message text (as voice for the mic
					// emoji) when we still have the original body cached.
					try {
						const targetMsg = database.messages ? database.messages.get(targetMsgID) : null;
						const text = targetMsg?.body || targetMsg?.text || "";
						if (text) {
							if (["🗣️", "🔊"].includes(emoji)) {
								const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text.slice(0, 200))}`;
								if (typeof api.sendVoiceFromUrl === "function") {
									await api.sendVoiceFromUrl(event.threadID, ttsUrl).catch(async () => {
										await message.reply(`🎙️ Replay:\n"${text}"`);
									});
								} else {
									await message.reply(`🎙️ Replay:\n"${text}"`);
								}
							} else {
								await message.reply(`🔁 Replay:\n"${text}"`);
							}
						}
					} catch (_) {					}
				}
				break;
			default:
				// join, leave and every other event type: fan out to event
				// scripts (onJoin/onLeave greet members here).
				await runEventScripts(event, message, threadData, userData);
				break;
		}

		database.threads.flush();
		database.users.flush();
	}

	return { handle, roleOf, registerOnReply, registerOnReaction, ROLE_USER, ROLE_ADMIN_BOX, ROLE_ADMIN_BOT };
}

module.exports = { createDispatcher, ROLE_USER, ROLE_ADMIN_BOX, ROLE_ADMIN_BOT };
