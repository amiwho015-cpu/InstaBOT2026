"use strict";

/**
 * ica/src/igpClient.js  —  "IGP" engine
 *
 * Drop-in replacement for the old InstagramChatAPI client, built on top of
 * `instagram-private-api`. It exposes the same method names that
 * ica/index.js (buildApi) calls, so every command keeps working.
 *
 * Realtime: instagram_mqtt (MQTT push, near-instant). The inbox is also polled
 * as a safety net (every 30s while realtime is up, ICA_POLL_MS=4s while down).
 * ICA_REALTIME=0 disables MQTT and uses polling only.
 *
 * NOTE: written against instagram-private-api ^1.46. Calls that a given
 * library version does not have fail with a clear "unsupported" error
 * instead of crashing the bot.
 */

const EventEmitter = require("events");
const fs = require("fs");
const crypto = require("crypto");
const { extractCookies, injectCookies } = require("../../bridge/igFeedBridge");

const unsupported = (what) => Promise.reject(new Error(`IGP engine: ${what} is not supported`));

function done(promise, cb) {
	return promise.then(
		(r) => { if (typeof cb === "function") cb(null, r); return r; },
		(e) => { if (typeof cb === "function") { cb(e); return undefined; } throw e; }
	);
}

const firstUrl = (m) => m && (
	(m.video_versions && m.video_versions[0] && m.video_versions[0].url) ||
	(m.image_versions2 && m.image_versions2.candidates && m.image_versions2.candidates[0] && m.image_versions2.candidates[0].url) ||
	(m.carousel_media && firstUrl(m.carousel_media[0])) || null
);
const isVideo = (m) => Boolean(m && (m.media_type === 2 || m.video_versions));

class IgpClient extends EventEmitter {
	constructor(options = {}) {
		super();
		this.options = options;
		this.ig = null;
		this.userID = null;
		this.username = null;
		this.listenActive = false;
		this.listenerCallback = null;
		this._timer = null;
		this._busy = false;
		this._primed = false;
		this._startMicro = 0;
		this._lastTs = new Map();     // threadID -> last seen item timestamp (µs)
		this._seen = new Set();       // messageIDs already emitted
		this._msgThread = new Map();  // messageID -> threadID
		this._lastItem = new Map();   // threadID -> last item id
		this._failCount = 0;
		this._threadCache = new Map(); // threadID -> thread object (users, is_group)
		this.realtimeOn = false;
		this._rtBound = false;
		this._rtConnecting = false;
		this._rtRetry = 0;
		this._rtTimer = null;

		const self = this;
		// buildApi uses client.sendMessage.toThread / .reply
		this.sendMessage = {
			toThread: (threadID, message, cb) => done(self._send(threadID, message), cb),
			reply: (threadID, message, replyID, cb) => done(self._send(threadID, message, replyID), cb),
			toUser: (userID, message, cb) => done(self._send([String(userID)], message), cb)
		};
		this.threadManagement = {
			addUsers: (threadID, userIDs, cb) => done(self._repo("addUser", threadID, [].concat(userIDs).map(String)), cb),
			leave: (threadID, cb) => done(self._repo("leave", threadID), cb)
		};
		this.stories = {
			getUserStories: () => unsupported("getUserStories"),
			getFeedStories: () => unsupported("getFeedStories"),
			react: () => unsupported("reactToStory"),
			reply: () => unsupported("replyToStory")
		};
		this.live = {
			getLiveFeed: () => unsupported("getLiveFeed"),
			sendComment: () => unsupported("sendLiveComment"),
			sendHeart: () => unsupported("sendLiveHeart")
		};
		this.search = {
			users: (q, o, cb) => self.searchUsers(q, o, cb),
			hashtags: () => unsupported("searchHashtags"),
			places: () => unsupported("searchPlaces")
		};
	}

	// ---------------------------------------------------------------- auth
	_newIg(seed) {
		const { IgApiClient } = require("instagram-private-api");
		const ig = new IgApiClient();
		ig.state.generateDevice(String(seed || "instabot"));
		if (String(process.env.ICA_REALTIME || "1") !== "0") {
			try { return require("instagram_mqtt").withRealtime(ig); }
			catch (e) { console.warn("[IGP] instagram_mqtt unavailable, using polling only:", e.message); }
		}
		return ig;
	}

	async loginWithCookies(credentials) {
		let list;
		if (Array.isArray(credentials)) {
			list = credentials.map(c => ({
				name: c.name || c.key, value: c.value,
				domain: c.domain || ".instagram.com", path: c.path || "/",
				secure: c.secure !== false, httpOnly: Boolean(c.httpOnly),
				expires: c.expirationDate || c.expires || 0
			})).filter(c => c.name && c.value !== undefined);
		}
		else if (typeof credentials === "string") list = extractCookies(credentials);
		else list = extractCookies(JSON.stringify(credentials || {}));

		if (!list.length) throw new Error("কোনো কুকি পাওয়া যায়নি (account.txt ফরম্যাট চেক করো)");
		const uid = (list.find(c => c.name === "ds_user_id") || {}).value;
		this.ig = this._newIg(uid);
		injectCookies(this.ig, list);

		const me = await this.ig.account.currentUser(); // throws if session dead
		this.userID = String(me.pk);
		this.username = me.username;
		this.emit("authenticated", { userID: this.userID });
		return { success: true, userID: this.userID };
	}

	async login(username, password) {
		this.ig = this._newIg(username);
		try {
			await this.ig.simulate.preLoginFlow().catch(() => {});
			const me = await this.ig.account.login(username, password);
			this.userID = String(me.pk);
			this.username = me.username;
			return { success: true, userID: this.userID };
		}
		catch (err) {
			const info = err && err.response && err.response.body;
			if (info && info.two_factor_required) {
				return { twoFactorRequired: true, twoFactorIdentifier: info.two_factor_info.two_factor_identifier, username: info.two_factor_info.username };
			}
			throw err;
		}
	}

	async verifyTwoFactor(code, identifier, cb) {
		return done((async () => {
			const me = await this.ig.account.twoFactorLogin({
				username: this.username, verificationCode: code,
				twoFactorIdentifier: identifier, verificationMethod: "1"
			});
			this.userID = String(me.pk);
			return { success: true, userID: this.userID };
		})(), cb);
	}

	async logout(cb) {
		this.stopListening();
		return done(this.ig ? this.ig.account.logout().catch(() => ({})) : Promise.resolve({}), cb);
	}

	getCurrentUserID() { return this.userID; }
	formatThreadID(id) { return String(id); }
	formatUserID(id) { return String(id); }

	// ----------------------------------------------------------- listening
	listen(callback) {
		if (!this.ig) {
			const e = new Error("Not authenticated. Call login() or loginWithCookies() first.");
			if (callback) return callback(e);
			throw e;
		}
		this.listenerCallback = callback || null;
		if (this.listenActive) return () => this.stopListening();

		this.listenActive = true;
		this._startMicro = Date.now() * 1000;
		const fastMs = Math.max(2500, parseInt(process.env.ICA_POLL_MS, 10) || this.options.pollMs || 4000);
		const slowMs = Math.max(15000, parseInt(process.env.ICA_SAFETY_POLL_MS, 10) || 30000);

		// Polling loop: fast while realtime is down, slow "safety net" while it is up.
		const loop = async () => {
			if (!this.listenActive) return;
			if (!this._busy) {
				this._busy = true;
				try {
					await this._poll();
					this._failCount = 0;
				}
				catch (err) {
					this._failCount++;
					const msg = (err && err.message) || String(err);
					const fatal = /login_required|checkpoint|challenge|not authorized|unauthorized/i.test(msg);
					if (fatal || this._failCount >= 8) {
						const cb = this.listenerCallback;
						this.stopListening();
						if (cb) cb(new Error(msg));
						this.emit("error", new Error(msg));
					}
				}
				finally { this._busy = false; }
			}
			if (!this.listenActive) return;
			this._timer = setTimeout(loop, this.realtimeOn ? slowMs : fastMs);
			if (this._timer.unref) this._timer.unref();
		};
		loop();

		if (this.ig.realtime) this._connectRealtime();
		this.emit("connected", { method: this.ig.realtime ? "realtime+polling" : "polling" });
		return () => this.stopListening();
	}

	stopListening() {
		this.listenActive = false;
		this.listenerCallback = null;
		this.realtimeOn = false;
		if (this._timer) clearTimeout(this._timer);
		if (this._rtTimer) clearTimeout(this._rtTimer);
		this._timer = null;
		this._rtTimer = null;
		try {
			const r = this.ig && this.ig.realtime && this.ig.realtime.disconnect && this.ig.realtime.disconnect();
			if (r && r.catch) r.catch(() => {});
		}
		catch (_) {}
		this.emit("disconnected");
	}

	async destroy() { this.stopListening(); }

	// ------------------------------------------------ realtime (instagram_mqtt)
	async _connectRealtime() {
		if (this._rtConnecting || !this.listenActive || !this.ig.realtime) return;
		this._rtConnecting = true;
		try {
			const { GraphQLSubscriptions, SkywalkerSubscriptions } = require("instagram_mqtt");
			const rt = this.ig.realtime;
			if (!this._rtBound) {
				this._rtBound = true;
				rt.on("message", (w) => { this._onRealtimeMessage(w).catch(() => {}); });
				const down = (why) => {
					if (this.realtimeOn) console.warn("[IGP] realtime MQTT dropped:", why);
					this.realtimeOn = false;
					this._scheduleRealtimeRetry();
				};
				rt.on("error", (e) => down((e && e.message) || String(e)));
				rt.on("close", () => down("closed"));
			}
			const irisData = await this.ig.feed.directInbox().request();
			await rt.connect({
				graphQlSubs: [GraphQLSubscriptions.getAppPresenceSubscription()],
				skywalkerSubs: [SkywalkerSubscriptions.directSub(this.ig.state.cookieUserId)],
				irisData
			});
			this.realtimeOn = true;
			this._rtRetry = 0;
			console.log("[IGP] realtime MQTT connected (polling is now only a safety net)");
		}
		catch (err) {
			this.realtimeOn = false;
			console.warn("[IGP] realtime MQTT failed, falling back to polling:", (err && err.message) || err);
			this._scheduleRealtimeRetry();
		}
		finally { this._rtConnecting = false; }
	}

	_scheduleRealtimeRetry() {
		if (!this.listenActive || this._rtTimer || this._rtRetry >= 20) return;
		this._rtRetry++;
		const delay = Math.min(120000, 5000 * Math.pow(2, Math.min(this._rtRetry, 5)));
		this._rtTimer = setTimeout(() => { this._rtTimer = null; this._connectRealtime(); }, delay);
		if (this._rtTimer.unref) this._rtTimer.unref();
	}

	async _onRealtimeMessage(w) {
		const m = w && w.message;
		if (!m) return;
		const pathM = typeof m.path === "string" ? m.path.match(/threads\/([^/]+)\/items\/([^/]+)/) : null;
		const tid = String(m.thread_id || (pathM && pathM[1]) || "");
		const mid = String(m.item_id || (pathM && pathM[2]) || "");
		if (!tid || !mid) return;

		if (m.op === "remove") {
			this._emitEvent({ type: "message_unsent", threadID: tid, messageID: mid, senderID: String(m.user_id || "") });
			return;
		}
		if (m.op && m.op !== "add") return; // "replace" = reactions/seen updates

		let thread = this._threadCache.get(tid);
		if (!thread) {
			try {
				thread = (await this.ig.feed.directThread({ thread_id: tid, oldest_cursor: "" }).request()).thread;
				this._threadCache.set(tid, thread);
			}
			catch (_) { thread = { thread_id: tid, users: [], is_group: false }; }
		}
		this._lastItem.set(tid, mid);
		const ts = Number(m.timestamp);
		if (ts > (this._lastTs.get(tid) || 0)) this._lastTs.set(tid, ts);
		this._dispatchItem(thread, Object.assign({}, m, { item_id: mid }));
	}

	// ----------------------------------------------------- shared dispatch
	_emitEvent(event) {
		if (this.listenerCallback) this.listenerCallback(null, event);
		this.emit("event", event);
		this.emit(event.type, event);
	}

	_dispatchItem(thread, item) {
		const tid = String(thread.thread_id);
		const mid = String(item.item_id);
		if (this._seen.has(mid)) return;
		this._seen.add(mid);
		if (this._seen.size > 5000) this._seen.delete(this._seen.values().next().value);
		this._msgThread.set(mid, tid);
		if (this._msgThread.size > 5000) this._msgThread.delete(this._msgThread.keys().next().value);

		const event = this._toEvent(thread, item);
		if (!event) return;
		if (String(item.user_id) === this.userID && !this.options.selfListen) return;
		this._emitEvent(event);
	}

	async _poll() {
		const threads = await this.ig.feed.directInbox().items();
		for (const thread of threads) {
			const tid = String(thread.thread_id);
			this._threadCache.set(tid, thread);
			const items = (thread.items || []).slice().sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
			if (!items.length) continue;
			const newest = Number(items[items.length - 1].timestamp);
			this._lastItem.set(tid, items[items.length - 1].item_id);
			let base = this._lastTs.get(tid);
			if (base === undefined) base = this._primed ? this._startMicro : newest; // first run: baseline only
			this._lastTs.set(tid, Math.max(base, newest));

			for (const item of items) {
				if (Number(item.timestamp) <= base) continue;
				this._dispatchItem(thread, item);
			}
		}
		this._primed = true;
	}

	_toEvent(thread, item) {
		const tid = String(thread.thread_id);
		const users = thread.users || [];
		const participantIDs = users.map(u => String(u.pk)).concat(this.userID ? [this.userID] : []);
		const ev = {
			type: "message",
			senderID: String(item.user_id),
			threadID: tid,
			messageID: String(item.item_id),
			timestamp: Math.floor(Number(item.timestamp) / 1000),
			isGroup: Boolean(thread.is_group),
			participantIDs,
			body: "",
			attachments: [],
			mentions: {}
		};
		const att = (type, url) => { if (url) ev.attachments.push({ type, url }); };

		switch (item.item_type) {
			case "text": ev.body = item.text || ""; break;
			case "link": ev.body = (item.link && item.link.text) || ""; break;
			case "like": ev.body = "❤️"; break;
			case "media": att(isVideo(item.media) ? "video" : "photo", firstUrl(item.media)); break;
			case "media_share": att(isVideo(item.media_share) ? "video" : "photo", firstUrl(item.media_share));
				ev.body = (item.media_share && item.media_share.caption && item.media_share.caption.text) || ""; break;
			case "clip": { const c = item.clip && item.clip.clip; att("video", firstUrl(c)); break; }
			case "reel_share": ev.body = (item.reel_share && item.reel_share.text) || "";
				{ const m = item.reel_share && item.reel_share.media; att(isVideo(m) ? "video" : "photo", firstUrl(m)); } break;
			case "story_share": { const m = item.story_share && item.story_share.media; att(isVideo(m) ? "video" : "photo", firstUrl(m)); break; }
			case "raven_media": case "visual_media": case "felt_media": {
				const m = (item.visual_media && item.visual_media.media) || (item.raven_media && item.raven_media.media) || item.media;
				att(isVideo(m) ? "video" : "photo", firstUrl(m)); break;
			}
			case "animated_media": att("animated_image", item.animated_media && item.animated_media.images && item.animated_media.images.fixed_height && item.animated_media.images.fixed_height.url); break;
			case "voice_media": att("audio", item.voice_media && item.voice_media.media && item.voice_media.media.audio && item.voice_media.media.audio.audio_src); break;
			case "placeholder": case "action_log": return null;
			default: if (item.text) ev.body = item.text; else return null;
		}

		const r = item.replied_to_message;
		if (r) {
			ev.replyTo = String(r.item_id);
			ev.repliedMessage = {
				messageID: String(r.item_id),
				senderID: String(r.user_id),
				body: r.text || "",
				attachments: [],
				timestamp: r.timestamp ? Math.floor(Number(r.timestamp) / 1000) : null
			};
		}
		return ev;
	}

	// ----------------------------------------------------------- sending
	_thread(target) { return this.ig.entity.directThread(target); }

	async _toBuffer(src) {
		if (Buffer.isBuffer(src)) return src;
		if (src && typeof src === "object") {
			if (src.buffer && Buffer.isBuffer(src.buffer)) return src.buffer;
			if (typeof src.pipe === "function" || src.stream) {
				const stream = src.stream || src;
				const chunks = [];
				for await (const c of stream) chunks.push(Buffer.from(c));
				return Buffer.concat(chunks);
			}
			if (src.path) return this._toBuffer(String(src.path));
			if (src.url) return this._toBuffer(String(src.url));
		}
		if (typeof src === "string") {
			if (/^https?:\/\//i.test(src)) {
				const axios = require("axios");
				const res = await axios.get(src, { responseType: "arraybuffer", timeout: 60000 });
				return Buffer.from(res.data);
			}
			return fs.readFileSync(src);
		}
		throw new Error("Unsupported media source");
	}

	async _toJpeg(buf) {
		try {
			const { Jimp } = require("jimp");
			const img = await Jimp.read(buf);
			return await img.getBuffer("image/jpeg");
		}
		catch (_) { return buf; }
	}

	_remember(res, tid) {
		const p = (res && res.payload) || res || {};
		const id = p.item_id || (p.message_metadata && p.message_metadata[0] && p.message_metadata[0].item_id);
		const threadID = String(p.thread_id || tid || "");
		if (id) {
			this._msgThread.set(String(id), threadID);
			this._seen.add(String(id)); // never treat our own send as incoming
		}
		return { messageID: id ? String(id) : null, threadID, timestamp: Date.now() };
	}

	async _send(target, message, replyID) {
		if (!this.ig) throw new Error("Not authenticated");
		const tid = Array.isArray(target) ? null : String(target);
		const t = this._thread(Array.isArray(target) ? target : String(target));

		let body = "";
		let attachment = null;
		let url = null;
		if (typeof message === "string") body = message;
		else if (message && typeof message === "object") {
			body = message.body != null ? String(message.body) : "";
			attachment = message.attachment || null;
			url = message.url || null;
		}

		if (attachment) {
			const list = [].concat(attachment);
			let last;
			for (const a of list) last = await this._sendMedia(t, tid, a, body);
			return last;
		}
		if (url) return this._remember(await t.broadcastLink(body || url, [url]), tid);
		if (!body) throw new Error("Empty message");

		if (replyID && tid) {
			try {
				const res = await this.ig.directThread.broadcast({
					item: "text",
					threadIds: [tid],
					form: { text: body, replied_to_item_id: String(replyID), replied_to_client_context: crypto.randomUUID() }
				});
				return this._remember(res, tid);
			}
			catch (_) { /* fall back to a plain message below */ }
		}
		return this._remember(await t.broadcastText(body), tid);
	}

	async _sendMedia(t, tid, src, caption) {
		const buf = await this._toBuffer(src);
		const name = String((src && (src.path || src.url)) || (typeof src === "string" ? src : "")).toLowerCase();
		const video = /\.(mp4|mov|webm)(\?|$)/.test(name);
		const audio = /\.(mp3|m4a|wav|ogg|aac|opus)(\?|$)/.test(name);
		if (audio) {
			if (typeof t.broadcastVoice === "function") return this._remember(await t.broadcastVoice({ file: buf }), tid);
			throw new Error("IGP engine: voice messages are not supported");
		}
		if (video) return this._remember(await t.broadcastVideo({ video: buf, transcodeDelay: 5000 }), tid);
		const res = this._remember(await t.broadcastPhoto({ file: await this._toJpeg(buf), allowFullAspectRatio: true }), tid);
		if (caption) await t.broadcastText(caption).catch(() => {});
		return res;
	}

	sendDirectMessage(userID, message, cb) { return this.sendMessage.toUser(userID, message, cb); }
	replyToMessage(threadID, message, replyID, cb) { return this.sendMessage.reply(threadID, message, replyID, cb); }

	_media(threadID, src, opts, cb) {
		if (typeof opts === "function") { cb = opts; opts = {}; }
		opts = opts || {};
		return done((async () => {
			const t = this._thread(String(threadID));
			return this._sendMedia(t, String(threadID), src, opts.caption || "");
		})(), cb);
	}
	sendPhoto(t, s, o, cb) { return this._media(t, s, o, cb); }
	sendVideo(t, s, o, cb) { return this._media(t, s, o, cb); }
	sendVoice(t, s, o, cb) { return this._media(t, s, o, cb); }
	sendPhotoFromUrl(t, u, o, cb) { return this._media(t, u, o, cb); }
	sendVideoFromUrl(t, u, o, cb) { return this._media(t, u, o, cb); }
	sendVoiceFromUrl(t, u, o, cb) { return this._media(t, u, o, cb); }
	sendGIF(threadID, url, opts, cb) {
		if (typeof opts === "function") { cb = opts; opts = {}; }
		return done(this._thread(String(threadID)).broadcastLink(url, [url]).then(r => this._remember(r, String(threadID))), cb);
	}

	unsendMessage(messageID, threadIDOrCb, cb) {
		let tid = typeof threadIDOrCb === "function" ? undefined : threadIDOrCb;
		if (typeof threadIDOrCb === "function") cb = threadIDOrCb;
		tid = tid || this._msgThread.get(String(messageID));
		if (!tid) return done(Promise.reject(new Error("threadID unknown for this message")), cb);
		return done(this._thread(String(tid)).deleteItem(String(messageID)).then(() => ({ success: true })), cb);
	}

	_reaction(status, reaction, messageID, threadID, cb) {
		if (typeof threadID === "function") { cb = threadID; threadID = undefined; }
		const tid = threadID || this._msgThread.get(String(messageID));
		if (!tid) return done(Promise.reject(new Error("threadID unknown for this message")), cb);
		const ctx = crypto.randomUUID();
		const form = {
			action: "send_item",
			thread_ids: `[${tid}]`,
			client_context: ctx,
			offline_threading_id: ctx,
			_uuid: this.ig.state.uuid,
			item_type: "reaction",
			reaction_type: "like",
			reaction_status: status,
			node_type: "item",
			item_id: String(messageID),
			send_attribution: "direct_thread"
		};
		if (reaction) form.emoji = reaction;
		return done(this.ig.request.send({ url: "/api/v1/direct_v2/threads/broadcast/reaction/", method: "POST", form }).then(() => ({ success: true })), cb);
	}
	sendReaction(reaction, messageID, threadID, cb) { return this._reaction("created", reaction || "❤️", messageID, threadID, cb); }
	removeReaction(messageID, threadID, cb) { return this._reaction("deleted", "", messageID, threadID, cb); }

	// ------------------------------------------------------------ threads
	_mapThread(th) {
		const users = th.users || [];
		const admins = (th.admin_user_ids || []).map(String);
		const ids = users.map(u => String(u.pk));
		if (this.userID) ids.push(this.userID);
		const userInfo = users.map(u => ({
			userID: String(u.pk), id: String(u.pk), name: u.full_name || u.username,
			vanity: u.username, isAdmin: admins.includes(String(u.pk))
		}));
		return {
			threadID: String(th.thread_id),
			name: th.thread_title || users.map(u => u.username).join(", "),
			threadName: th.thread_title,
			isGroup: Boolean(th.is_group),
			threadType: th.is_group ? 2 : 1,
			participantIDs: ids,
			userInfo,
			adminIDs: admins,
			inviter: th.inviter ? String(th.inviter.pk) : null,
			muted: Boolean(th.muted),
			snippet: th.last_permanent_item && th.last_permanent_item.text || "",
			timestamp: th.last_activity_at ? Math.floor(Number(th.last_activity_at) / 1000) : null
		};
	}

	getThreadInfo(threadID, cb) {
		return done((async () => {
			const res = await this.ig.feed.directThread({ thread_id: String(threadID), oldest_cursor: "" }).request();
			return this._mapThread(res.thread);
		})(), cb);
	}

	getInbox(options, cb) {
		if (typeof options === "function") { cb = options; options = {}; }
		const limit = (options && options.limit) || 20;
		return done(this.ig.feed.directInbox().items().then(l => l.slice(0, limit).map(t => this._mapThread(t))), cb);
	}

	getPendingRequests(options, cb) {
		if (typeof options === "function") { cb = options; options = {}; }
		return done(this.ig.feed.directPending().items().then(l => l.map(t => this._mapThread(t))), cb);
	}

	searchThreads(query, options, cb) {
		if (typeof options === "function") { cb = options; options = {}; }
		const q = String(query || "").toLowerCase();
		return done(this.getInbox({ limit: 50 }).then(l => l.filter(t => (t.name || "").toLowerCase().includes(q))), cb);
	}

	getThreadHistory(threadID, amount, timestamp, cb) {
		if (typeof amount === "function") { cb = amount; amount = 20; }
		if (typeof timestamp === "function") { cb = timestamp; timestamp = null; }
		return done((async () => {
			const res = await this.ig.feed.directThread({ thread_id: String(threadID), oldest_cursor: "" }).request();
			const th = res.thread;
			return (th.items || []).map(i => this._toEvent(th, i)).filter(Boolean)
				.filter(e => !timestamp || e.timestamp < Number(timestamp))
				.slice(0, amount || 20).reverse();
		})(), cb);
	}

	_repo(method, threadID, ...args) {
		const repo = this.ig.directThread;
		if (!repo || typeof repo[method] !== "function") return unsupported(method);
		return repo[method](String(threadID), ...args);
	}
	deleteThread(threadID, cb) { return done(this._repo("hide", threadID), cb); }
	approveRequest(threadID, cb) { return done(this._repo("approve", threadID), cb); }
	declineRequest(threadID, cb) { return done(this._repo("decline", threadID), cb); }
	muteThread(threadID, cb) { return done(this._repo("mute", threadID), cb); }
	unmuteThread(threadID, cb) { return done(this._repo("unmute", threadID), cb); }
	changeThreadTitle(threadID, title, cb) { return done(this._repo("updateTitle", threadID, String(title)), cb); }
	changeNickname(_u, _t, _n, cb) { return done(unsupported("changeNickname"), cb); }

	_typing(threadID, on) {
		try {
			const d = this.ig.realtime && this.ig.realtime.direct;
			if (this.realtimeOn && d && typeof d.indicateActivity === "function") {
				return Promise.resolve(d.indicateActivity({ threadId: String(threadID), isActive: on })).then(() => ({})).catch(() => ({}));
			}
		}
		catch (_) {}
		return Promise.resolve({});
	}
	sendTypingIndicator(t, cb) { return done(this._typing(t, true), cb); }
	stopTypingIndicator(t, cb) { return done(this._typing(t, false), cb); }

	markAsRead(threadID, read, cb) {
		if (typeof read === "function") { cb = read; read = true; }
		const item = this._lastItem.get(String(threadID));
		if (read === false || !item) return done(Promise.resolve({}), cb);
		return done(this._thread(String(threadID)).markItemSeen(item).then(() => ({})).catch(() => ({})), cb);
	}
	markAsUnread(_t, cb) { return done(unsupported("markAsUnread"), cb); }

	// -------------------------------------------------------------- users
	_mapUser(u) {
		return {
			userID: String(u.pk), id: String(u.pk),
			name: u.full_name || u.username, firstName: (u.full_name || u.username || "").split(" ")[0],
			vanity: u.username, username: u.username,
			profilePicUrl: u.profile_pic_url, isPrivate: u.is_private, isVerified: u.is_verified,
			followers: u.follower_count, following: u.following_count, bio: u.biography
		};
	}

	getUserInfo(userID, cb) {
		return done((async () => {
			const out = {};
			for (const id of [].concat(userID).map(String)) {
				try { out[id] = this._mapUser(await this.ig.user.info(id)); }
				catch (e) { out[id] = { userID: id, name: id }; }
			}
			return out;
		})(), cb);
	}

	getUserInfoByUsername(username, cb) {
		return done(this.ig.user.searchExact(String(username)).then(u => ({ [String(u.pk)]: this._mapUser(u) })), cb);
	}

	searchUsers(query, options, cb) {
		if (typeof options === "function") { cb = options; options = {}; }
		return done(this.ig.user.search(String(query)).then(r => (r.users || []).map(u => this._mapUser(u))), cb);
	}

	searchReels(_q, _o, cb) { return done(unsupported("searchReels"), cb); }

	// ------------------------------------------------------------ session
	getHealth() {
		return { status: this.listenActive ? "ok" : "idle", listening: this.listenActive, userID: this.userID, engine: this.realtimeOn ? "igp-realtime" : "igp-polling", realtime: this.realtimeOn, failures: this._failCount };
	}

	serialize() {
		let cookies = [];
		try { cookies = this.ig ? this.ig.state.cookieJar.serializeSync().cookies : []; } catch (_) {}
		return { userID: this.userID, username: this.username, cookies };
	}
	getSession() { return this.serialize(); }
	async loadSession(state) {
		if (typeof state === "string") state = JSON.parse(state);
		return this.loginWithCookies((state && state.cookies) || state);
	}
	async deserialize(state) { return this.loadSession(state); }
	async saveSession(file) { if (file) fs.writeFileSync(file, JSON.stringify(this.serialize(), null, 2)); }
	async loadSessionFromFile(file) { return this.loadSession(fs.readFileSync(file, "utf-8")); }

	async initDatabase() { return null; }
	scheduleTask() { return null; }
	stopTask() { return null; }
}

module.exports = IgpClient;
