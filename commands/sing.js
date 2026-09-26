"use strict";

/**
 * `sing` — send the FULL song as an MP3 audio attachment.
 *
 * No lists, no menus, no extra text: one search, one song, one audio file.
 * Any text output is reserved for errors only.
 *
 * Usage: *sing <song name or YouTube link>   (-y still accepted and ignored
 * as a legacy flag)
 */

const fs = require("fs-extra");
const yts = require("yt-search");
const ytdl = require("@distube/ytdl-core");
const { downloadYouTubeAudio } = require("./music");

/** Collect a full-song audio URL from a track object, whatever key it uses. */
function pickAudioUrl(track) {
	if (!track || typeof track !== "object") return null;
	const keys = [
		"url", "downloadUrl", "download_url", "audioUrl", "audio_url",
		"progressive_download_url", "playback_url",
		"previewUrl", "preview_url", "streamUrl", "stream_url", "stream", "link", "src", "media"
	];
	for (const key of keys) {
		const value = track[key];
		if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
		if (value && typeof value === "object") {
			const nested = value.url || value.src || value.link || value.playback_url;
			if (typeof nested === "string" && /^https?:\/\//i.test(nested)) return nested;
		}
	}
	return null;
}

/** Normalize whatever the API returns into a list with a title, artist and URL. */
function normalizeTracks(data) {
	const list = Array.isArray(data) ? data
		: Array.isArray(data && data.tracks) ? data.tracks
			: Array.isArray(data && data.results) ? data.results
				: Array.isArray(data && data.data) ? data.data
					: Array.isArray(data && data.songs) ? data.songs : [];
	return list.map(entry => {
		const t = entry && entry.track ? entry.track : entry;
		return {
			title: t.title || t.name || t.song || "Unknown",
			artist: t.artist || t.display_artist || t.singer || t.channel || "Unknown",
			durationMs: t.durationMs || t.duration_ms || t.duration || 0,
			url: pickAudioUrl(entry) || pickAudioUrl(t)
		};
	}).filter(row => row.url);
}

/**
 * Find the best full-song audio for a query. Order:
 *   1. configured full-song music server,
 *   2. Instagram progressive audio,
 *   3. YouTube (first song-length video, downloaded as MP3).
 * Resolves to a track object with a playable `url`.
 */
async function findSong(query, message, config) {
	const music = (config && config.music) || { };

	// 1. Prefer a configured full-song server.
	if (music.enable !== false && music.apiUrl) {
		const url = music.apiUrl.includes("{query}")
			? music.apiUrl.replace("{query}", encodeURIComponent(query))
			: `${music.apiUrl}${music.apiUrl.includes("?") ? "&" : "?"}query=${encodeURIComponent(query)}`;
		const headers = { "Accept": "application/json" };
		if (music.apiToken) headers["Authorization"] = `Bearer ${music.apiToken}`;
		try {
			const res = await fetch(url, { headers });
			if (res.ok) {
				const tracks = normalizeTracks(await res.json());
				if (tracks.length) return tracks[0];
			}
		} catch (_) {}
	}

	// 2. Direct Instagram tracks if available with URLs.
	try {
		if (message && typeof message.musicSearch === "function") {
			const igResult = await message.musicSearch(query);
			const tracks = normalizeTracks(igResult || { });
			if (tracks.length) return tracks[0];
		}
	} catch (_) {}

	// 3. Fallback to YouTube: first song-length result.
	const r = await yts(query);
	const videos = (r && r.videos) || [];
	if (!videos.length) throw new Error(`no full songs found for "${query}"`);
	const songsOnly = videos.filter(v => (v.seconds || 0) >= 30 && (v.seconds || 0) <= 900);
	const video = songsOnly[0] || videos[0];
	return {
		title: video.title || "Unknown",
		artist: (video.author && video.author.name) || "YouTube",
		url: video.url,
		isYouTube: true
	};
}

/** Deliver the audio file only — no caption, no list, no extra text. */
async function sendSong(message, track) {
	if (!track || !track.url)
		return message.reply("That song is no longer available. Search again.");

	const deliver = attachment => {
		const payload = { attachment, textFirst: false };
		return message.send(payload)
			.catch(() => message.reply(payload));
	};

	// YouTube link: download as MP3 and send the file.
	if (track.isYouTube || /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(track.url)) {
		let tempPath = null;
		try {
			tempPath = await downloadYouTubeAudio(track.url, track.title);
			const sent = await deliver({ path: tempPath, type: "audio", mimetype: "audio/mpeg" });
			setTimeout(() => fs.unlink(tempPath).catch(() => {}), 30000);
			return sent;
		} catch (error) {
			if (tempPath) fs.unlink(tempPath).catch(() => {});
			return message.reply(`Could not send "${track.title || "the song"}": ${String(error.message || error)}`);
		}
	}

	// Direct audio URL from the music server or Instagram.
	try {
		return await deliver({ url: track.url, mimetype: track.mimetype || "audio/mpeg" });
	}
	catch (error) {
		return message.reply(`Could not send "${track.title || "the song"}": ${String(error.message || error)}`);
	}
}

module.exports = {
	config: {
		name: "sing",
		aliases: ["song"],
		author: "Neoaz 🐊 & frnAlt",
		category: "media",
		cooldown: 5,
		role: 0,
		description: { en: "Send the full song as MP3 audio — no list, no extra text" },
		usage: { en: "{p}sing <song name or link> | {p}sing -y <song name or link>" }
	},

	onStart: async function ({ message, args, event, config, api }) {
		const prefix = (config && config.prefix) !== undefined ? config.prefix : "*";

		const safeReact = async (emoji) => {
			try {
				if (message && typeof message.react === "function") return await message.react(emoji);
				if (api && typeof api.setMessageReaction === "function") {
					return await new Promise(resolve => {
						api.setMessageReaction(emoji, event.messageID, event.threadID, () => resolve(), true);
					});
				}
			} catch (_) {}
		};

		// Legacy -y flag and reply-to-message are both just query sources now.
		const cleanArgs = args.filter(a => !["-y", "--yt", "-yt", "-youtube", "--top"].includes(String(a).toLowerCase()));
		const reply = event.messageReply || event.repliedMessage;
		const query = cleanArgs.join(" ").trim() || (reply && (reply.body || reply.text)) || "";

		if (!query)
			return message.reply(`Usage: ${prefix}sing <song name or link>`);

		await safeReact("⏳");

		try {
			let track;
			if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(query)) {
				const directUrl = query.startsWith("http") ? query : `https://${query}`;
				try {
					const video = await yts({ videoId: ytdl.getURLVideoID(directUrl) });
					track = { title: video.title, artist: (video.author && video.author.name) || "YouTube", url: directUrl, isYouTube: true };
				} catch (_) {
					track = { title: "YouTube Audio", artist: "YouTube", url: directUrl, isYouTube: true };
				}
			} else {
				track = await findSong(query, message, config);
			}
			const sent = await sendSong(message, track);
			await safeReact("✅");
			return sent;
		} catch (error) {
			await safeReact("❌");
			return message.reply(`Song search failed: ${String(error.message || error)}`);
		}
	}
};
