"use strict";

/**
 * platforms/instagram/adapter/apiWrapper.js
 *
 * Exposes a standardized, platform-neutral API surface for GoatBot/Floppa commands
 * while wrapping native Instagram ICA calls under the hood.
 *
 * Features:
 * - Transparent node-style callbacks and Promise support.
 * - Automatic typing indicator option and media dispatch routing.
 * - Graceful fallbacks for unsupported Facebook-only methods to avoid bot crashes.
 * - Outbound text-send deduplication (anti-spam): fallback chains and
 *   redelivered realtime events must never deliver the same body twice.
 */

const { dispatchMediaMessage } = require("../media/handler");
const logger = require("../../../utils/logger");

// ── outbound text dedup (anti-spam) ─────────────────────────────────────
// Keyed by threadID+body. The RPC bridge can time out AFTER the server
// actually delivered the message; the reply→plain fallback chains then send
// a second copy. Redelivered events can also re-run a command. This map
// makes identical text in the same thread within the window deliver once.
const recentOutbound = new Map(); // key -> { at, result }
const OUTBOUND_DEDUP_MS = 8000;

// ── bot-sent message registry (per thread) ──────────────────────────────
// Every message the bot successfully delivers is recorded here so unsend
// features can (a) find the bot's own messages without replying and
// (b) verify ownership without trusting stream echoes. Mirrors the working
// Floppa-Chatbot design.
const BOT_SENT_LIMIT_PER_THREAD = 50;
function recordBotSentMessage(threadID, messageID) {
	if (!threadID || !messageID) return;
	if (String(messageID).startsWith("rpc_timeout_") || String(messageID).startsWith("mock_")) return;
	global.botSentMessages = global.botSentMessages || new Map();
	const key = String(threadID);
	const list = global.botSentMessages.get(key) || [];
	list.push(String(messageID));
	while (list.length > BOT_SENT_LIMIT_PER_THREAD) list.shift();
	global.botSentMessages.set(key, list);
}
function forgetBotSentMessage(threadID, messageID) {
	if (!threadID || !messageID || !global.botSentMessages) return;
	const list = global.botSentMessages.get(String(threadID));
	if (!list) return;
	const idx = list.indexOf(String(messageID));
	if (idx !== -1) list.splice(idx, 1);
}

// A timed-out send RPC usually DELIVERED (the response was lost, not the
// message). Retrying after a timeout posts a second copy minutes later —
// the duplicate-output bug. Media fallbacks must treat timeouts as
// "assume delivered" exactly like the text path does.
function isTimeoutError(err) {
	const msg = (err && (err.message || JSON.stringify(err))) || String(err || "");
	return /timed? ?out/i.test(msg) || (err && (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT"));
}

function outboundKey(threadID, payload) {
	const body = typeof payload === "string" ? payload : (payload && payload.body != null ? String(payload.body) : "");
	if (!body) return null;
	return `${threadID}::${body.slice(0, 300)}`;
}

// Attach thread context and register a successfully sent message in the
// bot-sent registry. Used by the media wrappers whose raw results often
// carry only a bare messageID.
function recordBotSend(res, threadID) {
	if (res && res.messageID) recordBotSentMessage(threadID, res.messageID);
	if (res && typeof res === "object" && !res.threadID && threadID) res.threadID = threadID;
	return res;
}

function createAPIWrapper(rawClient, config = {}) {
	const ig = rawClient;

	function wrapCallback(promise, callback) {
		if (typeof callback === "function") {
			promise.then(
				res => callback(null, res),
				err => callback(err, null)
			);
			return undefined;
		}
		return promise;
	}

	function isLikelyMedia(val) {
		if (!val) return false;
		if (Buffer.isBuffer(val) || (val && val.buffer && Buffer.isBuffer(val.buffer))) return true;
		if (typeof val === "object" && (val.path || val.url || val.stream || typeof val.pipe === "function")) return true;
		if (typeof val === "string") {
			if (/^https?:\/\//i.test(val)) return true;
			if (val.includes("/") || val.includes("\\") || /\.(jpe?g|png|webp|gif|bmp|mp4|mov|webm|mp3|wav|ogg|m4a)(\?|$)/i.test(val)) return true;
		}
		return false;
	}

	function normalizeMediaCall(a, b, c, d) {
		let threadID, pathOrUrl, opts = {}, callback;
		if (isLikelyMedia(a) && !isLikelyMedia(b)) {
			pathOrUrl = a;
			threadID = String(b);
			if (typeof c === "function") {
				callback = c;
				opts = typeof d === "object" && d !== null ? d : { replyToMessageID: d };
			} else {
				callback = typeof d === "function" ? d : undefined;
				opts = typeof c === "object" && c !== null ? c : { caption: typeof c === "string" ? c : "", replyToMessageID: d };
			}
		} else {
			threadID = String(a);
			pathOrUrl = b;
			if (typeof c === "function") {
				callback = c;
				opts = {};
			} else if (typeof c === "object" && c !== null) {
				opts = c;
				callback = typeof d === "function" ? d : undefined;
			} else if (typeof c === "string") {
				opts = { caption: c, replyToMessageID: d };
				callback = typeof d === "function" ? d : undefined;
			} else {
				callback = typeof d === "function" ? d : undefined;
			}
		}
		return { threadID, pathOrUrl, opts, callback };
	}

	const wrapper = {
		_raw: ig,

		getCurrentUserID: () => {
			if (!ig) return null;
			if (typeof ig.getCurrentUserID === "function") {
				const id = ig.getCurrentUserID();
				return typeof id === "object" ? (id?.userID || id?.userId || String(id)) : String(id);
			}
			return ig._userID || null;
		},

		sendMessage: async (form, threadID, arg3, arg4) => {
			let callback;
			let replyToMessageID;

			if (typeof threadID === "function") {
				callback = threadID;
				threadID = null;
			}
			if (typeof arg3 === "function") {
				callback = arg3;
				replyToMessageID = arg4;
			} else if (typeof arg3 === "string" || typeof arg3 === "number") {
				replyToMessageID = String(arg3);
				if (typeof arg4 === "function") callback = arg4;
			} else if (arg3 && typeof arg3 === "object") {
				if (arg3.replyToMessageID || arg3.replyTo) {
					replyToMessageID = String(arg3.replyToMessageID || arg3.replyTo);
				}
				if (typeof arg4 === "function") callback = arg4;
			} else if (typeof arg4 === "function") {
				callback = arg4;
			} else if (arg4) {
				replyToMessageID = String(arg4);
			}

			if (!threadID && form && typeof form === "object") {
				threadID = form.threadID || form.threadId;
			}

			const promise = (async () => {
				if (config.TYPING_INDICATOR && threadID && ig && typeof ig.sendTypingIndicator === "function") {
					ig.sendTypingIndicator(threadID).catch(() => {});
				}

				const hasMedia = form && typeof form === "object" && Boolean(
					form.attachment || form.attachments || form.photo || form.image || form.video || form.audio || form.voice
				);

				if (hasMedia) {
					return await dispatchMediaMessage(wrapper, threadID, form, replyToMessageID);
				}

				const payload = (form && typeof form === "object") ? form : String(form || "");

				// ── outbound anti-spam dedup (plain text only) ──
				const dedupKey = outboundKey(threadID, payload);
				if (dedupKey) {
					const existing = recentOutbound.get(dedupKey);
					if (existing) {
						const age = Date.now() - existing.at;
						if (age < OUTBOUND_DEDUP_MS) {
							if (existing.result) {
								logger.info(`[DEDUP] Suppressed duplicate send in thread ${threadID} (already delivered ${Math.round(age / 1000)}s ago)`);
								return existing.result;
							}
							// Same text in flight from another call: don't add another copy.
							logger.info(`[DEDUP] Suppressed concurrent duplicate send in thread ${threadID}`);
							return { messageID: "dedup_" + Date.now(), threadID, duplicate: true };
						}
						recentOutbound.delete(dedupKey);
					}
					recentOutbound.set(dedupKey, { at: Date.now(), result: null });
				}
				const recordSend = (res) => {
					if (dedupKey && res) {
						recentOutbound.set(dedupKey, { at: Date.now(), result: res });
						if (recentOutbound.size > 500) {
							const cutoff = Date.now() - OUTBOUND_DEDUP_MS;
							for (const [k, v] of recentOutbound) if (v.at < cutoff) recentOutbound.delete(k);
						}
					}
					if (res && res.messageID) recordBotSentMessage(threadID, res.messageID);
					return res;
				};
				const dropMarker = () => { if (dedupKey) recentOutbound.delete(dedupKey); };

				// A send RPC that TIMES OUT (the bridge's 60s cap) usually means the
				// server actually delivered the message but the response was lost.
				// Falling back after a timeout both re-sends the same content (the
				// "bot replies twice, second copy arrives very late" bug) and keeps
				// the command hanging for another full timeout window. Definitive
				// errors (bad request, cannot-reply-to-media, etc.) still fall back.
				const isTimeoutErr = (e) => {
					const msg = (e && (e.message || JSON.stringify(e))) || String(e || "");
					return /timed? ?out/i.test(msg) || (e && (e.code === "ECONNABORTED" || e.code === "ETIMEDOUT"));
				};
				const assumeDelivered = (stage) => {
					logger.warn(`Send RPC timed out at ${stage}; assuming delivered to avoid a duplicate send (no fallback)`);
					return recordSend({ messageID: "rpc_timeout_" + Date.now(), threadID, assumedDelivered: true });
				};

				try {
					if (replyToMessageID && ig && typeof ig.replyToMessage === "function") {
						try {
							const textToSend = typeof payload === "object" && payload !== null ? (payload.body != null ? payload.body : payload) : payload;
							return recordSend(await ig.replyToMessage(threadID, textToSend, replyToMessageID));
						} catch (err) {
							if (isTimeoutErr(err)) return assumeDelivered("reply");
							// definitive failure → continue into the sendMessage chain
						}
					}

					if (ig) {
						if (typeof ig.sendMessage === "function") {
							if (replyToMessageID) {
								try {
									return recordSend(await new Promise((resolve, reject) => {
										ig.sendMessage(payload, threadID, (err, res) => err ? reject(err) : resolve(res), replyToMessageID);
									}));
								} catch (replyErr) {
									if (isTimeoutErr(replyErr)) return assumeDelivered("reply");
									// Bridges occasionally reject with undefined/empty errors;
									// stringify so the log line always carries the reason.
									const replyErrText = replyErr?.message || (replyErr && JSON.stringify(replyErr)) || String(replyErr) || "unknown error";
									logger.warn(`Failed to send reply to message ${replyToMessageID}, falling back to plain send: ${replyErrText}`);
									try {
										return recordSend(await new Promise((resolve, reject) => {
											ig.sendMessage(payload, threadID, (err, res) => err ? reject(err) : resolve(res));
										}));
									} catch (plainErr) {
										if (isTimeoutErr(plainErr)) return assumeDelivered("plain send");
										if (typeof payload === "object" && payload !== null && payload.body != null) {
											try {
												return recordSend(await new Promise((resolve, reject) => {
													ig.sendMessage(String(payload.body), threadID, (err, res) => err ? reject(err) : resolve(res));
												}));
											} catch (bodyErr) {
												if (isTimeoutErr(bodyErr)) return assumeDelivered("plain text");
												throw bodyErr;
											}
										}
										throw plainErr;
									}
								}
							}
							try {
								return recordSend(await new Promise((resolve, reject) => {
									ig.sendMessage(payload, threadID, (err, res) => err ? reject(err) : resolve(res));
								}));
							} catch (sendErr) {
								if (isTimeoutErr(sendErr)) return assumeDelivered("plain send");
								if (typeof payload === "object" && payload !== null && payload.body != null) {
									const sendErrText = sendErr?.message || (sendErr && JSON.stringify(sendErr)) || String(sendErr) || "unknown error";
									logger.warn(`Failed to send rich payload, falling back to plain text: ${sendErrText}`);
									try {
										return recordSend(await new Promise((resolve, reject) => {
											ig.sendMessage(String(payload.body), threadID, (err, res) => err ? reject(err) : resolve(res));
										}));
									} catch (bodyErr) {
										if (isTimeoutErr(bodyErr)) return assumeDelivered("plain text");
										throw bodyErr;
									}
								}
								throw sendErr;
							}
						}
						if (ig.sendMessage && typeof ig.sendMessage.toThread === "function") {
							return recordSend(await ig.sendMessage.toThread(threadID, replyToMessageID ? { body: typeof payload === "object" ? payload.body : payload, replyTo: replyToMessageID } : payload));
						}
						if (typeof ig.sendDirectMessage === "function") {
							return recordSend(await ig.sendDirectMessage(threadID, typeof payload === "object" ? payload.body : payload));
						}
					}
					dropMarker();
					return { messageID: "mock_" + Date.now() };
				} catch (err) {
					dropMarker();
					throw err;
				}
			})();

			return wrapCallback(promise, callback);
		},

		replyToMessage: async (threadID, message, replyToMessageID, callback) => {
			const promise = (async () => {
				const text = typeof message === "object" && message !== null ? (message.body != null ? String(message.body) : "") : String(message || "");
				if (ig && typeof ig.replyToMessage === "function") {
					try {
						return await ig.replyToMessage(threadID, text, replyToMessageID);
					} catch (_) {}
				}
				return await wrapper.sendMessage(message, threadID, undefined, replyToMessageID);
			})();
			return wrapCallback(promise, callback);
		},

		sendPhoto: async (arg1, arg2, arg3, arg4) => {
			const { threadID, pathOrUrl, opts, callback } = normalizeMediaCall(arg1, arg2, arg3, arg4);
			const promise = (async () => {
				const replyTo = opts.replyToMessageID || opts.replyTo;
				if (ig && typeof ig.sendPhoto === "function") {
					try {
						return recordBotSend(await ig.sendPhoto(threadID, pathOrUrl, opts), threadID);
					} catch (err) {
						// A timed-out photo RPC usually DELIVERED — never re-send it.
						if (isTimeoutError(err)) {
							logger.warn(`sendPhoto RPC timed out; assuming delivered (no duplicate fallback)`);
							return { threadID, messageID: "rpc_timeout_" + Date.now(), assumedDelivered: true };
						}
						if (replyTo) {
							const fallbackOpts = Object.assign({}, opts, { replyToMessageID: undefined, replyTo: undefined });
							return recordBotSend(await ig.sendPhoto(threadID, pathOrUrl, fallbackOpts), threadID);
						}
						throw err;
					}
				}
				if (ig && typeof ig.sendImage === "function") {
					if (replyTo) {
						try {
							return recordBotSend(await ig.sendImage(pathOrUrl, threadID, opts.caption || "", undefined, replyTo), threadID);
						} catch (err) {
							if (isTimeoutError(err)) {
								logger.warn(`sendImage RPC timed out; assuming delivered (no duplicate fallback)`);
								return { threadID, messageID: "rpc_timeout_" + Date.now(), assumedDelivered: true };
							}
							return await ig.sendImage(pathOrUrl, threadID, opts.caption || "");
						}
					}
					return recordBotSend(await ig.sendImage(pathOrUrl, threadID, opts.caption || ""), threadID);
				}
				return await wrapper.sendMessage({ body: opts.caption || "", attachment: pathOrUrl, replyTo }, threadID, undefined, replyTo);
			})();
			return wrapCallback(promise, callback);
		},

		sendImage: async (source, threadID, caption = "", callback, replyToMessageID) => {
			if (typeof caption === "function") {
				callback = caption;
				caption = "";
			}
			return wrapper.sendPhoto(threadID, source, { caption, replyToMessageID }, callback);
		},

		sendVideo: async (arg1, arg2, arg3, arg4) => {
			const { threadID, pathOrUrl, opts, callback } = normalizeMediaCall(arg1, arg2, arg3, arg4);
			const promise = (async () => {
				const replyTo = opts.replyToMessageID || opts.replyTo;
				if (ig && typeof ig.sendVideo === "function") {
					if (ig.sendVideoFromUrl || ig.sendMedia) {
						if (replyTo) {
							try {
								return recordBotSend(await ig.sendVideo(threadID, pathOrUrl, opts, undefined, replyTo), threadID);
							} catch (err) {
								if (isTimeoutError(err)) {
									logger.warn("sendVideo RPC timed out; assuming delivered (no duplicate fallback)");
									return { threadID, messageID: "rpc_timeout_" + Date.now(), assumedDelivered: true };
								}
								const fallbackOpts = Object.assign({}, opts, { replyToMessageID: undefined, replyTo: undefined });
								return recordBotSend(await ig.sendVideo(threadID, pathOrUrl, fallbackOpts), threadID);
							}
						}
						return recordBotSend(await ig.sendVideo(threadID, pathOrUrl, opts), threadID);
					} else {
							return recordBotSend(await new Promise((resolve, reject) => {
								const cb = (err, res) => err ? reject(err) : resolve(res);
								if (replyTo) {
									ig.sendVideo(pathOrUrl, threadID, cb, replyTo);
								} else {
									ig.sendVideo(pathOrUrl, threadID, cb);
								}
							}), threadID);
						}
				}
				return await wrapper.sendMessage({ body: opts.caption || "", attachment: pathOrUrl, replyTo }, threadID, undefined, replyTo);
			})();
			return wrapCallback(promise, callback);
		},

		sendVoice: async (arg1, arg2, arg3, arg4) => {
			const { threadID, pathOrUrl, opts, callback } = normalizeMediaCall(arg1, arg2, arg3, arg4);
			const promise = (async () => {
				const replyTo = opts.replyToMessageID || opts.replyTo;
				if (ig && typeof ig.sendVoice === "function") {
					try {
						return recordBotSend(await ig.sendVoice(threadID, pathOrUrl, opts), threadID);
					} catch (err) {
						if (isTimeoutError(err)) {
							logger.warn("sendVoice RPC timed out; assuming delivered (no duplicate fallback)");
							return { threadID, messageID: "rpc_timeout_" + Date.now(), assumedDelivered: true };
						}
						if (replyTo) {
							const fallbackOpts = Object.assign({}, opts, { replyToMessageID: undefined, replyTo: undefined });
							return recordBotSend(await ig.sendVoice(threadID, pathOrUrl, fallbackOpts), threadID);
						}
						throw err;
					}
				}
				if (ig && typeof ig.sendAudio === "function") {
					return recordBotSend(await new Promise((resolve, reject) => {
						const cb = (err, res) => err ? reject(err) : resolve(res);
						if (replyTo) {
							try {
								ig.sendAudio(pathOrUrl, threadID, cb, replyTo);
							} catch (_) {
								ig.sendAudio(pathOrUrl, threadID, cb);
							}
						} else {
							ig.sendAudio(pathOrUrl, threadID, cb);
						}
						}), threadID);
					}
					return await wrapper.sendMessage({ attachment: pathOrUrl, replyTo }, threadID, undefined, replyTo);
			})();
			return wrapCallback(promise, callback);
		},

		sendAudio: async (source, threadID, callback, replyToMessageID) => {
			return wrapper.sendVoice(threadID, source, { replyToMessageID }, callback);
		},

		sendGIF: async (threadID, url, opts = {}, callback) => {
			if (typeof opts === "function") {
				callback = opts;
				opts = {};
			}
			const promise = (async () => {
				if (ig && typeof ig.sendGIF === "function") {
					return await ig.sendGIF(threadID, url, opts);
				}
				return await wrapper.sendMessage({ attachment: url }, threadID);
			})();
			return wrapCallback(promise, callback);
		},

		sendReaction: async (reaction, messageID, threadID, callback) => {
			if (typeof threadID === "function") {
				callback = threadID;
				threadID = undefined;
			}
			const promise = (async () => {
				if (ig && typeof ig.setMessageReaction === "function") {
					return await ig.setMessageReaction(reaction || "", messageID, threadID);
				}
				if (ig && typeof ig.sendReaction === "function") {
					return await ig.sendReaction(reaction || "", messageID, threadID);
				}
				return { success: false, unsupported: true };
			})();
			return wrapCallback(promise, callback);
		},

		setMessageReaction: (reaction, messageID, threadIDOrCallback, callbackOrForce, maybeForce) => {
			let threadID = undefined;
			let callback = undefined;
			if (typeof threadIDOrCallback === "function") {
				callback = threadIDOrCallback;
			} else {
				threadID = threadIDOrCallback;
				if (typeof callbackOrForce === "function") {
					callback = callbackOrForce;
				}
			}
			return wrapper.sendReaction(reaction, messageID, threadID, callback);
		},

		unsendMessage: async (messageID, threadIDOrCallback, maybeCallback) => {
			let threadID = undefined;
			let callback = undefined;
			if (typeof threadIDOrCallback === "function") {
				callback = threadIDOrCallback;
			} else {
				threadID = threadIDOrCallback;
				if (typeof maybeCallback === "function") callback = maybeCallback;
			}
			const promise = (async () => {
				// Ownership pre-check: only skip the RPC when the registry PROVES the
				// message is someone else's. The botSentMessages registry (recorded
				// at send time) is authoritative; the stream-echo cache is only a
				// fallback and its absence must never block a legitimate unsend.
				const known = global.botSentMessages && global.botSentMessages.size
					? [...global.botSentMessages.values()].some(list => list.includes(String(messageID)))
					: false;
				if (!known && global.recentMessages && typeof global.recentMessages.get === "function") {
					const cached = global.recentMessages.get(String(messageID));
					const currentUID = wrapper.getCurrentUserID();
					if (cached && cached.senderID && currentUID && String(cached.senderID) !== String(currentUID) && cached.isBot !== true) {
						const err = new Error("Cannot unsend message sent by another user");
						err.code = "NOT_OWN_MESSAGE";
						throw err;
					}
				}
				if (ig && typeof ig.unsendMessage === "function") {
					const res = await ig.unsendMessage(messageID, threadID);
					forgetBotSentMessage(threadID, messageID);
					return res;
				}
				return { success: false, unsupported: true };
			})();
			return wrapCallback(promise, callback);
		},

		getUserInfo: async (userID, callback) => {
			const promise = (async () => {
				if (!userID) return {};
				if (ig && typeof ig.getUserInfo === "function") {
					const res = await ig.getUserInfo(userID);
					if (res && typeof res === "object") {
						const uid = String(res.userID || res.userId || res.id || userID);
						return { [uid]: res, ...res };
					}
					return res || {};
				}
				return {};
			})();
			return wrapCallback(promise, callback);
		},

		getUserInfoByUsername: async (username, callback) => {
			const promise = (async () => {
				if (!username) return null;
				if (ig && typeof ig.getUserInfoByUsername === "function") {
					return await ig.getUserInfoByUsername(username);
				}
				return null;
			})();
			return wrapCallback(promise, callback);
		},

		getThreadInfo: async (threadID, callback) => {
			const promise = (async () => {
				if (ig && typeof ig.getThreadInfo === "function") {
					return await ig.getThreadInfo(threadID);
				}
				return null;
			})();
			return wrapCallback(promise, callback);
		},

		getThread: (threadID, callback) => wrapper.getThreadInfo(threadID, callback),

		getThreadList: async (opts, callback) => {
			if (typeof opts === "function") {
				callback = opts;
				opts = {};
			}
			const promise = (async () => {
				if (ig && typeof ig.getThreadList === "function") {
					return await ig.getThreadList(opts);
				}
				if (ig && typeof ig.getInbox === "function") {
					return await ig.getInbox(opts);
				}
				return [];
			})();
			return wrapCallback(promise, callback);
		},

		getInbox: (opts, callback) => wrapper.getThreadList(opts, callback),

		getThreadHistory: async (threadID, amount = 20, timestamp = null, callback) => {
			const promise = (async () => {
				if (ig && typeof ig.getThreadHistory === "function") {
					return await ig.getThreadHistory(threadID, amount, timestamp);
				}
				return [];
			})();
			return wrapCallback(promise, callback);
		},

		markAsRead: async (threadID, read = true, callback) => {
			const promise = (async () => {
				if (ig && typeof ig.markAsRead === "function") {
					return await ig.markAsRead(threadID, read);
				}
				return { success: true };
			})();
			return wrapCallback(promise, callback);
		},

		markAsSeen: (threadID, callback) => wrapper.markAsRead(threadID, true, callback),

		sendTypingIndicator: (threadID, callback) => {
			if (ig && typeof ig.sendTypingIndicator === "function") {
				return ig.sendTypingIndicator(threadID, callback);
			}
			if (typeof callback === "function") callback(null, () => {});
			return () => {};
		},

		stopTypingIndicator: (threadID, callback) => {
			if (ig && typeof ig.stopTypingIndicator === "function") {
				return ig.stopTypingIndicator(threadID, callback);
			}
			if (typeof callback === "function") callback(null);
			return Promise.resolve();
		},

		sendTextEffect: async (text, threadID, effect, callback) => {
			const promise = (async () => {
				if (ig && typeof ig.sendTextEffect === "function") {
					return await ig.sendTextEffect(text, threadID, effect);
				}
				return await wrapper.sendMessage(text, threadID);
			})();
			return wrapCallback(promise, callback);
		},

		sendAvatarTextEffect: async (text, threadID, effect, callback) => {
			const promise = (async () => {
				if (ig && typeof ig.sendAvatarTextEffect === "function") {
					return await ig.sendAvatarTextEffect(text, threadID, effect);
				}
				return await wrapper.sendMessage(text, threadID);
			})();
			return wrapCallback(promise, callback);
		},

		sendMusic: async (threadID, track, callback) => {
			const promise = (async () => {
				if (ig && typeof ig.sendMusic === "function") {
					return await ig.sendMusic(threadID, track);
				}
				return { success: false, unsupported: true };
			})();
			return wrapCallback(promise, callback);
		},

		musicSearch: async (query, callback) => {
			const promise = (async () => {
				if (ig && typeof ig.musicSearch === "function") {
					return await ig.musicSearch(query);
				}
				return [];
			})();
			return wrapCallback(promise, callback);
		},

		addUserToGroup: async (userIDs, threadID, callback) => {
			const list = Array.isArray(userIDs) ? userIDs : [userIDs];
			const promise = (async () => {
				if (ig && typeof ig.addUserToGroup === "function") {
					return await ig.addUserToGroup(list, threadID);
				}
				if (ig && typeof ig.addUserToThread === "function") {
					return await ig.addUserToThread(list, threadID);
				}
				return { success: false, unsupported: true };
			})();
			return wrapCallback(promise, callback);
		},

		addUserToThread: (userIDs, threadID, callback) => wrapper.addUserToGroup(userIDs, threadID, callback),

		removeUserFromGroup: async (userID, threadID, callback) => {
			const promise = (async () => {
				if (ig && typeof ig.removeUserFromGroup === "function") {
					return await ig.removeUserFromGroup(userID, threadID);
				}
				if (ig && typeof ig.removeUserFromThread === "function") {
					return await ig.removeUserFromThread(userID, threadID);
				}
				return { success: false, unsupported: true };
			})();
			return wrapCallback(promise, callback);
		},

		removeUserFromThread: (userID, threadID, callback) => wrapper.removeUserFromGroup(userID, threadID, callback),

		leaveGroup: async (threadID, callback) => {
			const promise = (async () => {
				if (ig && typeof ig.leaveGroup === "function") {
					return await ig.leaveGroup(threadID);
				}
				return { success: false, unsupported: true };
			})();
			return wrapCallback(promise, callback);
		},

		changeThreadTitle: async (threadID, title, callback) => {
			const promise = (async () => {
				if (ig && typeof ig.changeThreadTitle === "function") {
					return await ig.changeThreadTitle(threadID, title);
				}
				if (ig && typeof ig.setTitle === "function") {
					return await ig.setTitle(title, threadID);
				}
				return { success: false, unsupported: true };
			})();
			return wrapCallback(promise, callback);
		},

		setTitle: (title, threadID, callback) => wrapper.changeThreadTitle(threadID, title, callback),

		// ── Graceful Fallbacks for Facebook-Specific Methods ──
		changeThreadColor: async (color, threadID, callback) => {
			const result = { success: false, unsupported: true, message: "Thread themes/colors are not supported on Instagram Direct." };
			return wrapCallback(Promise.resolve(result), callback);
		},

		changeNickname: async (nickname, threadID, userID, callback) => {
			const result = { success: false, unsupported: true, message: "Thread nicknames are not supported on Instagram Direct." };
			return wrapCallback(Promise.resolve(result), callback);
		},

		addFriend: async (userID, callback) => {
			const result = { success: false, unsupported: true, message: "Friend requests are a Facebook-only feature." };
			return wrapCallback(Promise.resolve(result), callback);
		},

		removeFriend: async (userID, callback) => {
			const result = { success: false, unsupported: true, message: "Friends list is a Facebook-only feature." };
			return wrapCallback(Promise.resolve(result), callback);
		},

		changeAdminStatus: async (threadID, userID, isAdmin, callback) => {
			const result = { success: false, unsupported: true, message: "Changing admin status is unsupported on Instagram Direct." };
			return wrapCallback(Promise.resolve(result), callback);
		},

		listen: (callback) => {
			if (ig && typeof ig.listen === "function") {
				return ig.listen(callback);
			}
			if (ig && typeof ig.listenMqtt === "function") {
				return ig.listenMqtt(callback);
			}
			throw new Error("Underlying ICA listener not available");
		},

		listenMqtt: (callback) => wrapper.listen(callback),

		stopListening: () => {
			if (ig && typeof ig.stopListening === "function") {
				return ig.stopListening();
			}
		}
	};

	return new Proxy(wrapper, {
		get(target, prop, receiver) {
			if (prop in target) return target[prop];
			if (ig && prop in ig) {
				const val = ig[prop];
				return typeof val === "function" ? val.bind(ig) : val;
			}
			return undefined;
		}
	});
}

module.exports = { createAPIWrapper };
