"use strict";

/**
 * bridge/igFeedBridge.js
 *
 * Optional add-on: polls the Instagram home timeline with instagram-private-api
 * and publishes every new post to an MQTT topic.
 *
 * Runs NEXT TO the main DM bot (ICA engine) and reuses the same account.txt
 * (Netscape, JSON array or raw "a=b; c=d" cookie string) or ACCOUNT_COOKIE env.
 *
 * Enable with:  IG_FEED_BRIDGE=1
 * Optional env: MQTT_BROKER, MQTT_TOPIC, FEED_POLL_MS (min 30000), ACCOUNT_FILE
 */

const fs = require("fs");
const path = require("path");

class InstagramMedia {
	constructor(mediaData) {
		this.id = mediaData.id;
		this.caption = mediaData.caption_text;
		this.url = mediaData.url;
		this.username = mediaData.username;
	}

	async process() {
		if (!this.url) return;
		console.log(`[Wrapper] 🚀 Dynamic Media Intercepted from @${this.username}`);
		console.log(`[Wrapper] 🔗 Source Link: ${this.url}`);
	}
}

// ---------- cookie parsing (3 formats) ----------
function parseNetscape(text) {
	const out = [];
	for (const rawLine of text.split(/\r?\n/)) {
		let line = rawLine.trim();
		if (!line) continue;
		let httpOnly = false;
		if (line.startsWith("#HttpOnly_")) {
			httpOnly = true;
			line = line.slice("#HttpOnly_".length);
		}
		else if (line.startsWith("#")) continue;
		const p = line.split("\t");
		if (p.length < 7) continue;
		out.push({
			domain: p[0].trim(),
			path: p[2].trim() || "/",
			secure: p[3].trim().toUpperCase() === "TRUE",
			expires: parseInt(p[4].trim(), 10),
			name: p[5].trim(),
			value: p.slice(6).join("\t").trim(),
			httpOnly
		});
	}
	return out;
}

function parseJson(text) {
	let parsed;
	try { parsed = JSON.parse(text); } catch (_) { return []; }
	let arr;
	if (Array.isArray(parsed)) arr = parsed;
	else if (parsed && parsed.httpSession && parsed.httpSession.cookies) {
		const inner = parsed.httpSession.cookies;
		arr = inner.cookies || (Array.isArray(inner) ? inner : Object.values(inner));
	}
	else if (parsed && parsed.cookies) {
		const c = parsed.cookies;
		arr = Array.isArray(c) ? c : (Array.isArray(c.cookies) ? c.cookies : Object.values(c));
	}
	else arr = [];
	return arr
		.map(c => ({
			name: c.name || c.key,
			value: c.value,
			domain: c.domain || ".instagram.com",
			path: c.path || "/",
			secure: c.secure !== false,
			httpOnly: Boolean(c.httpOnly),
			expires: c.expirationDate || c.expires || 0
		}))
		.filter(c => c.name && c.value !== undefined);
}

function parseRaw(text) {
	return text.split(";").map(s => {
		const i = s.indexOf("=");
		if (i < 1) return null;
		return { name: s.slice(0, i).trim(), value: s.slice(i + 1).trim(), domain: ".instagram.com", path: "/", secure: true, httpOnly: false, expires: 0 };
	}).filter(Boolean);
}

function extractCookies(text) {
	const t = (text || "").trim();
	if (!t) return [];
	if (t.startsWith("[") || t.startsWith("{")) return parseJson(t);
	if (t.includes("\t")) return parseNetscape(t);
	return parseRaw(t);
}

function loadCookieText(config) {
	if (process.env.ACCOUNT_COOKIE && process.env.ACCOUNT_COOKIE.trim()) return process.env.ACCOUNT_COOKIE;
	const file = path.resolve(process.env.ACCOUNT_FILE || (config && config.ACCOUNT_FILE) || "./account.txt");
	if (!fs.existsSync(file)) throw new Error(`account.txt ফাইলটি ${file} পাথে পাওয়া যায়নি!`);
	return fs.readFileSync(file, "utf-8");
}

function injectCookies(ig, cookies) {
	let count = 0;
	for (const c of cookies) {
		let s = `${c.name}=${c.value}; Domain=${c.domain}; Path=${c.path}`;
		const exp = Number(c.expires);
		if (Number.isFinite(exp) && exp > 0) s += `; Expires=${new Date(exp * 1000).toUTCString()}`;
		if (c.secure) s += "; Secure";
		if (c.httpOnly) s += "; HttpOnly";
		try {
			ig.state.cookieJar.setCookieSync(s, "https://www.instagram.com/");
			count++;
		}
		catch (e) {
			console.error(`[FeedBridge] ⚠️ কুকি স্কিপ (${c.name}): ${e.message}`);
		}
	}
	return count;
}

// ---------- main ----------
async function startFeedBridge(config = {}) {
	// Lazy requires so the main bot still boots if the bridge is disabled.
	const mqtt = require("mqtt");
	const { IgApiClient } = require("instagram-private-api");

	const BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com:1883";
	const TOPIC = process.env.MQTT_TOPIC || "instagram/realtime/stream";
	const POLL_MS = Math.max(30000, parseInt(process.env.FEED_POLL_MS, 10) || 60000);

	const mqttClient = mqtt.connect(BROKER);
	mqttClient.on("connect", () => console.log("[FeedBridge] 📡 ✅ MQTT Broker Pipeline Connected."));
	mqttClient.on("error", err => console.error("[FeedBridge] ❌ MQTT এরর:", err.message));

	const ig = new IgApiClient();
	ig.state.generateDevice("instagram_bot");

	const cookies = extractCookies(loadCookieText(config));
	const n = injectCookies(ig, cookies);
	console.log(`[FeedBridge] 🍪 ${n}টি কুকি ইনজেক্ট হয়েছে।`);
	if (!n) throw new Error("কোনো কুকি পাওয়া যায়নি (account.txt ফরম্যাট চেক করো)।");

	console.log("[FeedBridge] 🔐 কুকি সেশন ভেরিফাই করা হচ্ছে...");
	const me = await ig.account.currentUser();
	console.log(`[FeedBridge] ✅ সেশন অ্যাক্টিভ! ইউজার: @${me.username}`);

	const timelineFeed = ig.feed.timeline();
	let lastSeenMediaId = null;
	let busy = false;

	const timer = setInterval(async () => {
		if (busy) return;
		busy = true;
		try {
			const items = await timelineFeed.items();
			if (items && items.length > 0) {
				const latest = items[0];
				if (latest.id !== lastSeenMediaId) {
					lastSeenMediaId = latest.id;
					const payload = {
						id: latest.id,
						caption_text: (latest.caption && latest.caption.text) || "No Caption",
						url: latest.media_type === 2
							? latest.video_versions && latest.video_versions[0] && latest.video_versions[0].url
							: latest.image_versions2 && latest.image_versions2.candidates && latest.image_versions2.candidates[0] && latest.image_versions2.candidates[0].url,
						username: latest.user && latest.user.username
					};
					await new InstagramMedia(payload).process();
					mqttClient.publish(TOPIC, JSON.stringify(payload));
					console.log("[FeedBridge] 📤 New post published to MQTT topic.");
				}
			}
		}
		catch (err) {
			console.error("[FeedBridge] ⚠️ ফিড রিড এরর:", err.message);
		}
		finally {
			busy = false;
		}
	}, POLL_MS);

	return {
		stop() {
			clearInterval(timer);
			mqttClient.end(true);
		}
	};
}

module.exports = { startFeedBridge, extractCookies, injectCookies, InstagramMedia };
