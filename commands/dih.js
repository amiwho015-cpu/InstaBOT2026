/**
 * @author frnAlt & Gtajisan
 * Dih Grower Game Command (scripts/cmds/dih.js)
 * 
 * Complete port of the popular Telegram DickGrowerBot:
 * - Daily dih growth roll once every 24 hours (-10 to +30 cm)
 * - Daily streak multiplier (+5 per consecutive day up to 20 days)
 * - Chat & Global leaderboards (top) with tap-to-challenge / tap-to-inspect
 * - Daily election of the Dih of the Day (bonus centimeters)
 * - Dih Fight (PVP duel with bets in cm, tag or tap-to-reply)
 * - Canvas graphics: Battle VS clash card, Duel result card, and Passport stat card
 * - Dih Loan (debt relief resetting negative lengths to 0 cm on credit)
 * - Dih Passport / Profile stats with visual ruler scale
 * - Interactive tap-to-relay menu for fast chat gameplay
 * - Admin length import/migration
 * 
 * Replaces all sensitive keywords with "dih" to bypass bad-word filters safely.
 */

"use strict";

const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage, isCanvasAvailable } = require(path.join(process.cwd(), "func/canvasHelper.js"));
const { readJSONSafe, writeJSONSafeSync } = require(path.join(process.cwd(), "database/controller/safeStorage.js"));

const DB_FILE = path.join(process.cwd(), "database/data/dihData.json");
const CACHE_DIR = path.join(__dirname, "cache");
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const STREAK_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

// Helper to access safe persistent database
function getDihData() {
    return readJSONSafe(DB_FILE, { threads: {} });
}

function saveDihData(data) {
    writeJSONSafeSync(DB_FILE, data);
}

function getThreadDih(data, threadID) {
    if (!data.threads) data.threads = {};
    if (!data.threads[threadID]) {
        data.threads[threadID] = {
            users: {},
            lastDotd: null
        };
    }
    return data.threads[threadID];
}

function getUserDih(threadDih, userID, name = "Unknown") {
    if (!threadDih.users) threadDih.users = {};
    if (!threadDih.users[userID]) {
        threadDih.users[userID] = {
            name: name,
            length: 0,
            streak: 0,
            lastGrow: 0,
            lastGrowDelta: 0,
            totalGrows: 0,
            fightsWon: 0,
            fightsLost: 0,
            debt: 0,
            dotdCount: 0
        };
    } else if (name && name !== "Unknown" && threadDih.users[userID].name !== name) {
        threadDih.users[userID].name = name;
    }
    return threadDih.users[userID];
}

function getRankings(threadDih) {
    const list = Object.entries(threadDih.users || {}).map(([id, u]) => ({
        id,
        name: u.name || `User ${id}`,
        length: typeof u.length === "number" ? u.length : 0,
        streak: u.streak || 0,
        lastGrow: u.lastGrow || 0,
        totalGrows: u.totalGrows || 0,
        fightsWon: u.fightsWon || 0,
        fightsLost: u.fightsLost || 0,
        debt: u.debt || 0,
        dotdCount: u.dotdCount || 0
    }));
    list.sort((a, b) => b.length - a.length);
    return list;
}

// ─────────────────────────────────────────────────────────────
// Canvas Graphics Generation Helpers
// ─────────────────────────────────────────────────────────────

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

async function loadAvatarSafe(url, name, fallbackColor = "#6366f1") {
    if (url && typeof loadImage === "function") {
        try {
            const res = await axios.get(url, {
                responseType: "arraybuffer",
                timeout: 5000,
                headers: { "User-Agent": "Mozilla/5.0" }
            });
            return await loadImage(Buffer.from(res.data));
        } catch (_) {}
    }
    // Canvas fallback avatar with user initial
    const fallbackCanvas = createCanvas(128, 128);
    const fctx = fallbackCanvas.getContext("2d");
    fctx.fillStyle = fallbackColor;
    fctx.beginPath();
    fctx.arc(64, 64, 64, 0, Math.PI * 2);
    fctx.fill();
    fctx.fillStyle = "#ffffff";
    fctx.font = "bold 52px sans-serif";
    fctx.textAlign = "center";
    fctx.textBaseline = "middle";
    const initial = (name || "U").trim().charAt(0).toUpperCase();
    fctx.fillText(initial, 64, 64);
    return await loadImage(fallbackCanvas.toBuffer("image/png"));
}

/**
 * Generates an HD Canvas card for Dih Fights (Challenge or Clash Results)
 */
async function generateFightCard({ challenger, opponent, bet, winner = null, isResult = false, challengerAvatar = null, opponentAvatar = null }) {
    if (!isCanvasAvailable || typeof createCanvas !== "function") return null;

    const width = 800;
    const height = 440;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 1. Arena Background Gradient
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#080612");
    bg.addColorStop(0.5, "#150e24");
    bg.addColorStop(1, "#070d1e");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Decorative grid pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = isResult ? "rgba(234, 179, 8, 0.5)" : "rgba(168, 85, 247, 0.4)";
    ctx.lineWidth = 3;
    drawRoundedRect(ctx, 12, 12, width - 24, height - 24, 20);
    ctx.stroke();

    // 2. Header Title
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isResult ? "#facc15" : "#ffffff";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(isResult ? "🏆 DIH BATTLE RESULTS 🏆" : "⚔️ DIH BATTLE CHALLENGE ⚔️", width / 2, 45);

    // Stake Badge
    ctx.fillStyle = "rgba(234, 179, 8, 0.15)";
    drawRoundedRect(ctx, width / 2 - 90, 68, 180, 32, 16);
    ctx.fill();
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, width / 2 - 90, 68, 180, 32, 16);
    ctx.stroke();
    ctx.fillStyle = "#fef08a";
    ctx.font = "bold 15px sans-serif";
    ctx.fillText(`STAKE: ${bet} CM`, width / 2, 84);

    // Load Avatars
    const cImg = await loadAvatarSafe(challengerAvatar, challenger.name, "#e11d48");
    const oImg = await loadAvatarSafe(opponentAvatar, opponent.name, "#0284c7");

    // 3. Left Fighter (Challenger)
    const cX = 190;
    const cY = 205;
    const avatarRadius = 60;
    const isCWinner = winner && winner.id === challenger.id;
    const isCLoser = winner && winner.id !== challenger.id;

    // Outer Glow Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(cX, cY, avatarRadius + 6, 0, Math.PI * 2);
    ctx.fillStyle = isCWinner ? "#eab308" : isCLoser ? "#475569" : "#f43f5e";
    ctx.shadowColor = isCWinner ? "#eab308" : "#f43f5e";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();

    // Clip & Draw Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(cX, cY, avatarRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(cImg, cX - avatarRadius, cY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    ctx.restore();

    // Name & Length
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    const cDisplayName = challenger.name.length > 14 ? challenger.name.slice(0, 13) + "…" : challenger.name;
    ctx.fillText(cDisplayName, cX, cY + 82);

    ctx.fillStyle = isCWinner ? "#4ade80" : isCLoser ? "#f87171" : "#fda4af";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`${challenger.length} cm`, cX, cY + 106);

    // Role Tag Pill
    const cTagText = isResult ? (isCWinner ? "👑 WINNER (+ " + bet + "cm)" : "💀 DEFEATED (- " + bet + "cm)") : "CHALLENGER";
    ctx.fillStyle = isCWinner ? "rgba(34, 197, 94, 0.2)" : isCLoser ? "rgba(239, 68, 68, 0.2)" : "rgba(244, 63, 94, 0.2)";
    drawRoundedRect(ctx, cX - 75, cY + 120, 150, 24, 12);
    ctx.fill();
    ctx.fillStyle = isCWinner ? "#4ade80" : isCLoser ? "#f87171" : "#fb7185";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(cTagText, cX, cY + 132);

    // 4. Center VS Clash Emblem
    ctx.save();
    ctx.font = "bold 44px sans-serif";
    ctx.fillStyle = "#facc15";
    ctx.shadowColor = "rgba(234, 179, 8, 0.8)";
    ctx.shadowBlur = 20;
    ctx.fillText("VS", width / 2, cY);
    ctx.restore();

    // 5. Right Fighter (Opponent)
    const oX = 610;
    const oY = 205;
    const isOWinner = winner && winner.id === opponent.id;
    const isOLoser = winner && winner.id !== opponent.id;

    // Outer Glow Ring
    ctx.save();
    ctx.beginPath();
    ctx.arc(oX, oY, avatarRadius + 6, 0, Math.PI * 2);
    ctx.fillStyle = isOWinner ? "#eab308" : isOLoser ? "#475569" : "#06b6d4";
    ctx.shadowColor = isOWinner ? "#eab308" : "#06b6d4";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();

    // Clip & Draw Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(oX, oY, avatarRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(oImg, oX - avatarRadius, oY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    ctx.restore();

    // Name & Length
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    const oDisplayName = opponent.name.length > 14 ? opponent.name.slice(0, 13) + "…" : opponent.name;
    ctx.fillText(oDisplayName, oX, oY + 82);

    ctx.fillStyle = isOWinner ? "#4ade80" : isOLoser ? "#f87171" : "#7dd3fc";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`${opponent.length} cm`, oX, oY + 106);

    // Role Tag Pill
    const oTagText = isResult ? (isOWinner ? "👑 WINNER (+ " + bet + "cm)" : "💀 DEFEATED (- " + bet + "cm)") : "DEFENDER";
    ctx.fillStyle = isOWinner ? "rgba(34, 197, 94, 0.2)" : isOLoser ? "rgba(239, 68, 68, 0.2)" : "rgba(6, 182, 212, 0.2)";
    drawRoundedRect(ctx, oX - 75, oY + 120, 150, 24, 12);
    ctx.fill();
    ctx.fillStyle = isOWinner ? "#4ade80" : isOLoser ? "#f87171" : "#38bdf8";
    ctx.font = "bold 12px sans-serif";
    ctx.fillText(oTagText, oX, oY + 132);

    // 6. Bottom Status Banner
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    drawRoundedRect(ctx, 40, 375, width - 80, 42, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    drawRoundedRect(ctx, 40, 375, width - 80, 42, 12);
    ctx.stroke();

    ctx.font = "bold 14px sans-serif";
    if (isResult) {
        ctx.fillStyle = "#facc15";
        ctx.fillText(`🎉 Victory goes to ${winner.name}! Centimeters transferred automatically.`, width / 2, 396);
    } else {
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(`👉 ${opponent.name}, reply ACCEPT to fight or DECLINE to forfeit! (60s)`, width / 2, 396);
    }

    return canvas.toBuffer("image/png");
}

/**
 * Generates an HD Canvas Passport & Stat Card with Visual Ruler
 */
async function generateStatsCard({ user, rank, totalPlayers, avatarUrl = null, nextAttemptText = "Ready now" }) {
    if (!isCanvasAvailable || typeof createCanvas !== "function") return null;

    const width = 800;
    const height = 450;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // 1. Background Gradient
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, "#080614");
    bg.addColorStop(0.6, "#120e26");
    bg.addColorStop(1, "#071324");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Neon Frame
    ctx.strokeStyle = "rgba(147, 51, 234, 0.35)";
    ctx.lineWidth = 2.5;
    drawRoundedRect(ctx, 12, 12, width - 24, height - 24, 20);
    ctx.stroke();

    // 2. Left Column: Player Identity Card
    const avatar = await loadAvatarSafe(avatarUrl, user.name, "#7c3aed");
    const aX = 140;
    const aY = 120;
    const aR = 55;

    // Glowing avatar border
    ctx.save();
    ctx.beginPath();
    ctx.arc(aX, aY, aR + 5, 0, Math.PI * 2);
    ctx.fillStyle = "#a855f7";
    ctx.shadowColor = "#a855f7";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();

    // Draw avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(aX, aY, aR, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, aX - aR, aY - aR, aR * 2, aR * 2);
    ctx.restore();

    // Name
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    const nameStr = user.name.length > 15 ? user.name.slice(0, 14) + "…" : user.name;
    ctx.fillText(nameStr, aX, aY + 78);

    // Rank Badge
    ctx.fillStyle = "rgba(234, 179, 8, 0.2)";
    drawRoundedRect(ctx, aX - 65, aY + 98, 130, 26, 13);
    ctx.fill();
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, aX - 65, aY + 98, 130, 26, 13);
    ctx.stroke();
    ctx.fillStyle = "#fef08a";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText(`RANK #${rank} / ${totalPlayers}`, aX, aY + 111);

    // Big Length Display
    ctx.fillStyle = "#c084fc";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(`${user.length} CM`, aX, aY + 175);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px sans-serif";
    ctx.fillText("WEAPON LENGTH", aX, aY + 208);

    // Divider
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(270, 40);
    ctx.lineTo(270, height - 40);
    ctx.stroke();

    // 3. Right Column: Visual Ruler & Statistics
    // Ruler Section
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("📏 VISUAL RULER SCALE", 300, 52);

    const rulerX = 300;
    const rulerY = 70;
    const rulerW = 450;
    const rulerH = 34;

    // Ruler bar background
    ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
    drawRoundedRect(ctx, rulerX, rulerY, rulerW, rulerH, 10);
    ctx.fill();

    // Ruler progress fill
    const displayLength = Math.max(0, Math.min(100, user.length));
    const fillW = Math.round((displayLength / 100) * rulerW);
    if (fillW > 0) {
        const fillGrad = ctx.createLinearGradient(rulerX, 0, rulerX + fillW, 0);
        fillGrad.addColorStop(0, "#8b5cf6");
        fillGrad.addColorStop(1, "#ec4899");
        ctx.fillStyle = fillGrad;
        drawRoundedRect(ctx, rulerX, rulerY, fillW, rulerH, 10);
        ctx.fill();
    }

    // Ruler centimeter tick marks
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    for (let cm = 0; cm <= 100; cm += 10) {
        const tickX = rulerX + (cm / 100) * rulerW;
        const tickHeight = cm % 20 === 0 ? 12 : 6;
        ctx.beginPath();
        ctx.moveTo(tickX, rulerY);
        ctx.lineTo(tickX, rulerY + tickHeight);
        ctx.stroke();
    }

    // 4. Statistics Grid (4 Cards: 2x2)
    const cards = [
        { label: "DAILY STREAK", val: `${user.streak || 0} Day(s)`, icon: "🔥", color: "#f97316" },
        { label: "PVP FIGHT RECORD", val: `${user.fightsWon || 0}W / ${user.fightsLost || 0}L`, icon: "⚔️", color: "#38bdf8" },
        { label: "DIH OF THE DAY", val: `${user.dotdCount || 0} Titles`, icon: "👑", color: "#eab308" },
        { label: "NEXT GROWTH ROLL", val: nextAttemptText, icon: "⏰", color: "#4ade80" }
    ];

    const startX = 300;
    const startY = 135;
    const cWidth = 215;
    const cHeight = 85;
    const gapX = 20;
    const gapY = 18;

    cards.forEach((card, i) => {
        const row = Math.floor(i / 2);
        const col = i % 2;
        const x = startX + col * (cWidth + gapX);
        const y = startY + row * (cHeight + gapY);

        ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
        drawRoundedRect(ctx, x, y, cWidth, cHeight, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, x, y, cWidth, cHeight, 12);
        ctx.stroke();

        ctx.font = "bold 18px sans-serif";
        ctx.fillText(card.icon, x + 14, y + 28);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(card.label, x + 42, y + 28);

        ctx.fillStyle = card.color;
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(card.val, x + 14, y + 62);
    });

    // 5. Debt Notice or Fun Motto Banner
    const bannerY = 345;
    ctx.fillStyle = user.debt > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(147, 51, 234, 0.12)";
    drawRoundedRect(ctx, 300, bannerY, rulerW, 55, 12);
    ctx.fill();
    ctx.strokeStyle = user.debt > 0 ? "#ef4444" : "rgba(147, 51, 234, 0.3)";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 300, bannerY, rulerW, 55, 12);
    ctx.stroke();

    ctx.textAlign = "center";
    if (user.debt > 0) {
        ctx.fillStyle = "#f87171";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(`💳 OUTSTANDING LOAN DEBT: ${user.debt} CM`, 300 + rulerW / 2, bannerY + 28);
    } else {
        ctx.fillStyle = "#c084fc";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(`🥒 Ready to battle! Challenge friends with: !dih fight <bet> @user`, 300 + rulerW / 2, bannerY + 28);
    }

    return canvas.toBuffer("image/png");
}

module.exports = {
    config: {
        name: "dih",
        aliases: ["grow", "dihgrow", "dihfight"],
        version: "2.0.0",
        author: "frnAlt",
        cooldown: 2,
        role: 0,
        shortDescription: {
            en: "Grow your dih daily, battle friends in PVP fights with Canvas cards, and climb the top!"
        },
        longDescription: {
            en: "A complete port of the famous Telegram DickGrowerBot. Measure & grow your dih once every 24h (-10 to +30 cm) with streak multipliers, challenge friends in Dih Fights with HD Canvas cards, elect Dih of the Day, take emergency loans, and top the leaderboard with tap-to-relay support."
        },
        category: "game",
        guide: {
            en: "{pn} [grow] — Measure & grow your dih once every 24h\n" +
                "{pn} top [global] — View chat or global top dihs\n" +
                "{pn} fight <cm> [@user / reply] — Challenge someone to a dih duel with Canvas card\n" +
                "{pn} ofday — Elect or view today's crowned Dih of the Day\n" +
                "{pn} loan — Reset negative length to 0 cm on credit\n" +
                "{pn} stats [@user / reply] — View HD Passport Canvas card with visual ruler\n" +
                "{pn} import <cm> [@user / reply] — Admin import/adjust dihs\n" +
                "{pn} help — Display game instructions"
        }
    },

    onStart: async function ({ api, event, args, message, usersData }) {
        const senderID = String(event.senderID || event.userID || event.author || "");
        const senderName = (await usersData.getName(senderID).catch(() => null)) || `User ${senderID}`;
        const threadID = String(event.threadID);

        const dihData = getDihData();
        const threadDih = getThreadDih(dihData, threadID);
        const user = getUserDih(threadDih, senderID, senderName);

        const subCmd = (args[0] || "").toLowerCase();

        // ──────────────── 1. LEADERBOARD (top) ────────────────
        if (subCmd === "top" || subCmd === "leaderboard" || subCmd === "rank") {
            const isGlobal = (args[1] || "").toLowerCase() === "global";

            if (isGlobal) {
                const globalUsers = new Map();
                for (const t of Object.values(dihData.threads || {})) {
                    for (const [uid, u] of Object.entries(t.users || {})) {
                        const existing = globalUsers.get(uid);
                        if (!existing || (u.length || 0) > existing.length) {
                            globalUsers.set(uid, { ...u, id: uid });
                        }
                    }
                }
                const globalRankings = Array.from(globalUsers.values()).sort((a, b) => b.length - a.length);
                if (globalRankings.length === 0) {
                    return message.reply("🌱 No dihs have grown across the entire network yet! Type '!dih' to be the first.");
                }

                const medals = ["🥇", "🥈", "🥉"];
                let msg = `🌍 ═══ GLOBAL TOP DIHS ═══ 🌍\n\n`;
                const topCount = Math.min(10, globalRankings.length);
                for (let i = 0; i < topCount; i++) {
                    const p = globalRankings[i];
                    const medal = medals[i] || `${i + 1}.`;
                    const streakStr = p.streak > 1 ? ` 🔥${p.streak}d` : "";
                    msg += `${medal} ${p.name} — ${p.length} cm${streakStr}\n`;
                }
                msg += `\n═════════════════════════\n`;
                const myGlobalRank = globalRankings.findIndex(r => r.id === senderID) + 1;
                if (myGlobalRank > 0) {
                    msg += `📏 Your global position: #${myGlobalRank}`;
                }
                return message.reply(msg);
            }

            const rankings = getRankings(threadDih);
            if (rankings.length === 0) {
                return message.reply("🌱 No dihs have grown in this chat yet! Type '!dih' to measure yours first.");
            }

            const todayStr = new Date().toISOString().slice(0, 10);
            const medals = ["🥇", "🥈", "🥉"];
            let msg = `🏆 ═══ TOP DIHS IN THIS CHAT ═══ 🏆\n\n`;
            const topCount = Math.min(10, rankings.length);
            for (let i = 0; i < topCount; i++) {
                const p = rankings[i];
                const medal = medals[i] || `${i + 1}.`;
                const streakStr = p.streak > 1 ? ` 🔥${p.streak}d` : "";
                const dotdStr = (threadDih.lastDotd?.winnerID === p.id && threadDih.lastDotd?.date === todayStr) ? " 👑" : "";
                msg += `${medal} ${p.name} — ${p.length} cm${streakStr}${dotdStr}\n`;
            }

            msg += `\n═════════════════════════\n`;
            const myRank = rankings.findIndex(r => r.id === senderID) + 1;
            if (myRank > 0 && user.totalGrows > 0) {
                msg += `📏 Your position in the top is ${myRank} (${user.length} cm)\n\n`;
            } else {
                msg += `💡 Type '!dih' to measure yours and enter the leaderboard!\n\n`;
            }
            msg += `👉 Tap to relay: Reply with 'fight <rank> [bet]' (e.g. 'fight 1 10') to challenge, or '<rank>' to view stats!`;

            const sent = await message.reply(msg);
            if (sent?.messageID && global.GoatBot?.onReply) {
                global.GoatBot.onReply.set(sent.messageID, {
                    commandName: "dih",
                    type: "topRelay",
                    threadID: threadID,
                    rankings: rankings.slice(0, 10).map(r => ({ id: r.id, name: r.name })),
                    timestamp: Date.now()
                });
            }
            return;
        }

        // ──────────────── 2. DIH FIGHT (pvp / duel) ────────────────
        if (subCmd === "fight" || subCmd === "pvp" || subCmd === "duel" || event.commandName === "dihfight") {
            let opponentID = null;
            let opponentName = null;

            // Opponent from message reply
            if (event.messageReply && event.messageReply.senderID) {
                opponentID = String(event.messageReply.senderID);
            }
            // Opponent from mentions
            else if (event.mentions && Object.keys(event.mentions).length > 0) {
                opponentID = Object.keys(event.mentions)[0];
                opponentName = event.mentions[opponentID]?.replace(/^@/, "").trim();
            }
            // Opponent from numeric arg
            else {
                for (const a of args) {
                    if (/^\d{10,25}$/.test(a) && a !== senderID) {
                        opponentID = a;
                        break;
                    }
                }
            }

            // Parse bet amount (defaults to 5 cm if not specified)
            let bet = null;
            for (const a of args) {
                const num = parseInt(a);
                if (!isNaN(num) && num > 0 && String(num) === a) {
                    bet = num;
                    break;
                }
            }
            if (!bet) bet = 5; // Default friendly bet

            if (!opponentID) {
                return message.reply(
                    "⚔️ Please tag a user (@mention) or reply to their message to challenge them to a Dih Fight!\n" +
                    "Example: !dih fight 15 @friend or reply to their message with '!dih fight 10'"
                );
            }

            if (opponentID === senderID) {
                return message.reply("😅 You cannot fight your own dih!");
            }

            const botID = String(api.getCurrentUserID());
            if (opponentID === botID) {
                return message.reply("🤖 The bot has no physical dih to fight with!");
            }

            if (user.totalGrows === 0) {
                return message.reply("🌱 You haven't grown your dih yet! Type '!dih' to grow yours first.");
            }

            if (user.length < bet) {
                return message.reply(`❌ You only have ${user.length} cm! You cannot place a bet of ${bet} cm.`);
            }

            const opponentUser = threadDih.users[opponentID];
            if (!opponentUser || opponentUser.totalGrows === 0) {
                opponentName = opponentName || (await usersData.getName(opponentID).catch(() => null)) || `User ${opponentID}`;
                return message.reply(`❌ ${opponentName} has not grown their dih yet in this chat!`);
            }

            if (opponentUser.length < bet) {
                return message.reply(`❌ ${opponentUser.name} only has ${opponentUser.length} cm and cannot cover a bet of ${bet} cm.`);
            }

            opponentName = opponentName || opponentUser.name || (await usersData.getName(opponentID).catch(() => null)) || `User ${opponentID}`;

            // Fetch avatars for battle card
            const cAvatar = await usersData.getAvatarUrl(senderID).catch(() => null);
            const oAvatar = await usersData.getAvatarUrl(opponentID).catch(() => null);

            let cardBuffer = null;
            try {
                cardBuffer = await generateFightCard({
                    challenger: { id: senderID, name: user.name, length: user.length },
                    opponent: { id: opponentID, name: opponentName, length: opponentUser.length },
                    bet: bet,
                    isResult: false,
                    challengerAvatar: cAvatar,
                    opponentAvatar: oAvatar
                });
            } catch (_) {}

            const bodyText =
                `⚔️ ═══ DIH FIGHT CHALLENGE ═══ ⚔️\n\n` +
                `🤺 ${user.name} (${user.length} cm) challenged ${opponentName} (${opponentUser.length} cm) to a Dih Fight!\n` +
                `💰 Bet: ${bet} cm on the line!\n\n` +
                `👉 @${opponentName}, reply to this message with "accept" to duel, or "decline" to forfeit.\n` +
                `⏳ Challenge expires in 60 seconds.`;

            let challengeMsg;
            if (cardBuffer) {
                await fs.ensureDir(CACHE_DIR);
                const tempPath = path.join(CACHE_DIR, `dih_fight_${Date.now()}.png`);
                await fs.writeFile(tempPath, cardBuffer);
                challengeMsg = await message.reply({
                    body: bodyText,
                    attachment: fs.createReadStream(tempPath)
                }, [opponentID]);
                setTimeout(() => {
                    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
                }, 15000);
            } else {
                challengeMsg = await message.reply(bodyText, [opponentID]);
            }

            if (challengeMsg?.messageID && global.GoatBot?.onReply) {
                global.GoatBot.onReply.set(challengeMsg.messageID, {
                    commandName: "dih",
                    type: "dihFight",
                    challengerID: senderID,
                    challengerName: user.name,
                    opponentID: opponentID,
                    opponentName: opponentName,
                    bet: bet,
                    threadID: threadID,
                    challengerAvatar: cAvatar,
                    opponentAvatar: oAvatar,
                    messageID: challengeMsg.messageID,
                    timestamp: Date.now()
                });
            }
            return;
        }

        // ──────────────── 3. DIH OF THE DAY (ofday / dotd) ────────────────
        if (subCmd === "ofday" || subCmd === "dotd" || subCmd === "dihofday") {
            const todayStr = new Date().toISOString().slice(0, 10);

            if (threadDih.lastDotd && threadDih.lastDotd.date === todayStr) {
                const winner = threadDih.users[threadDih.lastDotd.winnerID];
                return message.reply(
                    `👑 ═══ DIH OF THE DAY ═══ 👑\n\n` +
                    `Today's crowned Dih of the Day in this chat is:\n` +
                    `✨ ${threadDih.lastDotd.winnerName} ✨\n\n` +
                    `🎁 Bonus awarded: +${threadDih.lastDotd.bonus} cm!\n` +
                    `📏 Current length: ${winner ? winner.length : "?"} cm\n` +
                    `⏰ Next election tomorrow!`
                );
            }

            // Only active players who grew in the last 7 days qualify
            const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            const eligible = Object.entries(threadDih.users || {}).filter(([_, u]) => {
                return u.lastGrow && u.lastGrow >= oneWeekAgo && u.totalGrows > 0;
            });

            if (eligible.length === 0) {
                return message.reply(
                    `🗳️ No eligible dihs for today's election!\n` +
                    `Players must have grown their dih at least once in the last 7 days.\n` +
                    `Type '!dih' to grow yours and qualify!`
                );
            }

            // Select random active winner
            const [winnerID, winnerUser] = eligible[Math.floor(Math.random() * eligible.length)];
            const bonus = Math.floor(Math.random() * 6) + 10; // +10 to +15 cm

            winnerUser.length = (winnerUser.length || 0) + bonus;
            winnerUser.dotdCount = (winnerUser.dotdCount || 0) + 1;

            threadDih.lastDotd = {
                date: todayStr,
                winnerID: winnerID,
                winnerName: winnerUser.name || `User ${winnerID}`,
                bonus: bonus,
                timestamp: Date.now()
            };

            saveDihData(dihData);

            return message.reply(
                `🌟 ═══ ELECTION: DIH OF THE DAY ═══ 🌟\n\n` +
                `🗳️ The votes are in and the ruler has spoken!\n` +
                `👑 Today's crowned Dih of the Day in this chat is:\n` +
                `✨ ${winnerUser.name} ✨\n\n` +
                `🎁 Bonus: +${bonus} cm awarded!\n` +
                `📏 Current length: ${winnerUser.length} cm\n` +
                `🥒 All hail today's mighty ruler!`
            );
        }

        // ──────────────── 4. LOAN (debt relief) ────────────────
        if (subCmd === "loan" || subCmd === "debt") {
            if (user.length >= 0) {
                return message.reply(
                    `🛡️ Your dih is currently ${user.length} cm!\n` +
                    `The Dih Bank only provides emergency loans for dihs stuck in the negative.`
                );
            }

            const debtAmount = Math.abs(user.length);
            user.debt = (user.debt || 0) + debtAmount;
            user.length = 0;
            saveDihData(dihData);

            return message.reply(
                `🏦 ═══ DIH EMERGENCY LOAN APPROVED ═══ 🏦\n\n` +
                `Your negative length (-${debtAmount} cm) has been reset to 0 cm on credit!\n` +
                `💳 Current outstanding debt: ${user.debt} cm\n\n` +
                `💡 50% of your future positive daily rolls will automatically go toward repaying this loan until fully cleared.`
            );
        }

        // ──────────────── 5. STATS / PASSPORT (with Canvas Card) ────────────────
        if (subCmd === "stats" || subCmd === "me" || subCmd === "profile" || subCmd === "passport" || subCmd === "card") {
            let targetID = senderID;
            let targetName = senderName;

            if (event.messageReply && event.messageReply.senderID) {
                targetID = String(event.messageReply.senderID);
                targetName = (await usersData.getName(targetID).catch(() => null)) || `User ${targetID}`;
            } else if (event.mentions && Object.keys(event.mentions).length > 0) {
                targetID = Object.keys(event.mentions)[0];
                targetName = event.mentions[targetID]?.replace(/^@/, "").trim() || (await usersData.getName(targetID).catch(() => null)) || `User ${targetID}`;
            }

            const targetUser = threadDih.users[targetID];
            if (!targetUser || targetUser.totalGrows === 0) {
                return message.reply(`🌱 ${targetName} has not grown their dih yet in this chat! Type '!dih' to start.`);
            }

            const rankings = getRankings(threadDih);
            const rank = rankings.findIndex(r => r.id === targetID) + 1;
            const totalFights = (targetUser.fightsWon || 0) + (targetUser.fightsLost || 0);
            const winRate = totalFights > 0 ? Math.round(((targetUser.fightsWon || 0) / totalFights) * 100) : 0;

            let nextText = "Ready now!";
            if (Date.now() - (targetUser.lastGrow || 0) < COOLDOWN_MS) {
                const rem = COOLDOWN_MS - (Date.now() - targetUser.lastGrow);
                const h = Math.floor(rem / (1000 * 60 * 60));
                const m = Math.floor((rem % (1000 * 60 * 60)) / (1000 * 60));
                nextText = `${h}h ${m}m`;
            }

            const targetAvatar = await usersData.getAvatarUrl(targetID).catch(() => null);
            let statsCardBuffer = null;
            try {
                statsCardBuffer = await generateStatsCard({
                    user: targetUser,
                    rank: rank || 1,
                    totalPlayers: rankings.length,
                    avatarUrl: targetAvatar,
                    nextAttemptText: nextText
                });
            } catch (_) {}

            const bodyText =
                `🍆 ═══ DIH PASSPORT & STATS ═══ 🍆\n\n` +
                `👤 Player: ${targetName}\n` +
                `📏 Length: ${targetUser.length} cm\n` +
                `🏆 Chat Rank: #${rank} of ${rankings.length}\n` +
                `🔥 Daily Streak: ${targetUser.streak || 0} day(s)\n` +
                `🌱 Total Daily Rolls: ${targetUser.totalGrows || 0}\n` +
                `⚔️ Fight Record: ${targetUser.fightsWon || 0}W / ${targetUser.fightsLost || 0}L (${winRate}% winrate)\n` +
                `👑 Dih of the Day Titles: ${targetUser.dotdCount || 0}\n` +
                (targetUser.debt > 0 ? `💳 Outstanding Loan Debt: ${targetUser.debt} cm\n` : "") +
                `⏰ Next Daily Growth: ${nextText}\n` +
                `═══════════════════════════════\n` +
                `👉 Tap to relay: Reply with 'grow' to measure, or 'fight <bet> @user' to duel!`;

            if (statsCardBuffer) {
                await fs.ensureDir(CACHE_DIR);
                const tempPath = path.join(CACHE_DIR, `dih_stats_${Date.now()}.png`);
                await fs.writeFile(tempPath, statsCardBuffer);
                const sentMsg = await message.reply({
                    body: bodyText,
                    attachment: fs.createReadStream(tempPath)
                });
                setTimeout(() => {
                    try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
                }, 15000);

                if (sentMsg?.messageID && global.GoatBot?.onReply) {
                    global.GoatBot.onReply.set(sentMsg.messageID, {
                        commandName: "dih",
                        type: "menuRelay",
                        threadID: threadID,
                        timestamp: Date.now()
                    });
                }
                return;
            }

            const sentMsg = await message.reply(bodyText);
            if (sentMsg?.messageID && global.GoatBot?.onReply) {
                global.GoatBot.onReply.set(sentMsg.messageID, {
                    commandName: "dih",
                    type: "menuRelay",
                    threadID: threadID,
                    timestamp: Date.now()
                });
            }
            return;
        }

        // ──────────────── 6. IMPORT / ADMIN ADJUST ────────────────
        if (subCmd === "import" || subCmd === "set") {
            const adminBot = (global.GoatBot?.config?.adminBot || []).map(String);
            const devUsers = (global.GoatBot?.config?.devUsers || []).map(String);
            const isAdmin = adminBot.includes(senderID) || devUsers.includes(senderID) || (global.db?.allUserData?.find(u => String(u.userID) === senderID)?.role >= 1);
            if (!isAdmin) {
                return message.reply("⛔ Only group administrators or bot admins can import or adjust dih lengths!");
            }

            let targetID = null;
            if (event.messageReply && event.messageReply.senderID) {
                targetID = String(event.messageReply.senderID);
            } else if (event.mentions && Object.keys(event.mentions).length > 0) {
                targetID = Object.keys(event.mentions)[0];
            } else if (args[2] && /^\d+$/.test(args[2])) {
                targetID = args[2];
            } else {
                targetID = senderID;
            }

            const cm = parseInt(args[1]);
            if (isNaN(cm)) {
                return message.reply("Usage: !dih import <cm> [@user / reply]");
            }

            const targetName = (await usersData.getName(targetID).catch(() => null)) || `User ${targetID}`;
            const targetUser = getUserDih(threadDih, targetID, targetName);
            targetUser.length = (targetUser.length || 0) + cm;
            targetUser.totalGrows = Math.max(1, targetUser.totalGrows || 1);
            saveDihData(dihData);

            return message.reply(`✅ Successfully imported +${cm} cm for ${targetName}! Their new length is ${targetUser.length} cm.`);
        }

        // ──────────────── 7. HELP GUIDE ────────────────
        if (subCmd === "help") {
            const helpText =
                `🍆 ═══ DIH GROWER GAME GUIDE ═══ 🍆\n\n` +
                `A complete port of Telegram's DickGrowerBot — grow, duel, and conquer group chats!\n\n` +
                `📜 COMMANDS:\n` +
                `• !dih (or !dih grow) — Measure & grow your dih once every 24h (-10 to +30 cm)\n` +
                `• !dih top [global] — View chat leaderboard or global top dihs\n` +
                `• !dih fight <cm> [@user / reply] — Duel a friend with battle Canvas cards\n` +
                `• !dih ofday — Elect or view today's crowned Dih of the Day (+10 cm bonus)\n` +
                `• !dih loan — Reset negative length to 0 cm on credit\n` +
                `• !dih stats [@user / reply] — View HD Passport card with visual ruler scale\n` +
                `• !dih import <cm> [@user] — Admin import/adjust dihs\n\n` +
                `🔥 STREAK SYSTEM:\n` +
                `Playing on consecutive days pays off! Every consecutive day adds +5 to your rolls (up to 20 days max streak).\n\n` +
                `═══════════════════════════════\n` +
                `👉 Tap to relay: Reply with 1 (grow), 2 (top), 3 (stats), 4 (ofday), 5 (loan)`;

            const sentHelp = await message.reply(helpText);
            if (sentHelp?.messageID && global.GoatBot?.onReply) {
                global.GoatBot.onReply.set(sentHelp.messageID, {
                    commandName: "dih",
                    type: "menuRelay",
                    threadID: threadID,
                    timestamp: Date.now()
                });
            }
            return;
        }

        // ──────────────── 8. DEFAULT ACTION: GROW ────────────────
        const now = Date.now();

        // Check cooldown (< 24h since last grow)
        if (user.lastGrow && (now - user.lastGrow) < COOLDOWN_MS) {
            const remainingMs = COOLDOWN_MS - (now - user.lastGrow);
            const hours = Math.floor(remainingMs / (1000 * 60 * 60));
            const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

            const rankings = getRankings(threadDih);
            const rank = rankings.findIndex(r => r.id === senderID) + 1;

            const cooldownText =
                `⏳ You already measured your dih today!\n` +
                `🍆 Your dih is currently ${user.length} cm long.\n` +
                `🏆 Your position in the top is ${rank || 1}.\n\n` +
                `Next attempt in ${hours}h ${minutes}m.\n\n` +
                `👉 Tap to relay: Reply with 2 (top), 3 (stats), 4 (ofday), 5 (loan)`;

            const sentCd = await message.reply(cooldownText);
            if (sentCd?.messageID && global.GoatBot?.onReply) {
                global.GoatBot.onReply.set(sentCd.messageID, {
                    commandName: "dih",
                    type: "menuRelay",
                    threadID: threadID,
                    timestamp: Date.now()
                });
            }
            return;
        }

        // Calculate consecutive daily streak
        if (!user.lastGrow || user.lastGrow === 0) {
            user.streak = 1;
        } else if ((now - user.lastGrow) <= STREAK_EXPIRY_MS) {
            user.streak = Math.min(20, (user.streak || 0) + 1);
        } else {
            user.streak = 1;
        }

        // Base roll: between -10 and +30 cm
        const baseRoll = Math.floor(Math.random() * 41) - 10;
        let delta = baseRoll;

        // Apply streak bonus or penalty
        if (user.streak > 1) {
            const streakFactor = user.streak - 1;
            if (baseRoll > 0) {
                delta += (streakFactor * 5);
            } else if (baseRoll < 0) {
                delta -= Math.round(streakFactor * 2.5);
            }
        }

        // Loan / debt repayment logic
        let loanMsg = "";
        if (delta > 0 && user.debt && user.debt > 0) {
            const payDebt = Math.min(user.debt, Math.ceil(delta / 2));
            user.debt -= payDebt;
            const netDelta = delta - payDebt;
            user.length = (user.length || 0) + netDelta;
            loanMsg = `\n💳 Loan Repaid: ${payDebt} cm paid toward debt (${user.debt} cm remaining debt).`;
            if (user.debt === 0) {
                loanMsg += `\n🎉 Congratulations! Your dih loan has been completely paid off!`;
            }
        } else {
            user.length = (user.length || 0) + delta;
        }

        user.lastGrow = now;
        user.lastGrowDelta = delta;
        user.totalGrows = (user.totalGrows || 0) + 1;

        saveDihData(dihData);

        const rankings = getRankings(threadDih);
        const rank = rankings.findIndex(r => r.id === senderID) + 1;

        let replyText = "";
        if (delta > 0) {
            replyText =
                `Your dih has grown by ${delta} cm and now it is ${user.length} cm long.\n` +
                `Your position in the top is ${rank}.\n\n` +
                `Next attempt in 24h 00m.`;
            if (user.streak > 1) {
                replyText += `\n🔥 Consecutive streak: ${user.streak} day(s) (+${(user.streak - 1) * 5} cm streak bonus!)`;
            }
            if (loanMsg) replyText += loanMsg;
        } else if (delta < 0) {
            replyText =
                `🥶 Your dih has shrunk by ${Math.abs(delta)} cm and now it is ${user.length} cm long.\n` +
                `Your position in the top is ${rank}.\n\n` +
                `Next attempt in 24h 00m.`;
            if (user.streak > 1) {
                replyText += `\n🔥 Consecutive streak: ${user.streak} day(s)`;
            }
        } else {
            replyText =
                `😐 Your dih didn't change size today and remains at ${user.length} cm long.\n` +
                `Your position in the top is ${rank}.\n\n` +
                `Next attempt in 24h 00m.`;
        }

        replyText += `\n\n👉 Tap to relay: Reply with 2 (top), 3 (stats), 4 (ofday), or 'fight <bet> @user'`;

        const sentGrow = await message.reply(replyText);
        if (sentGrow?.messageID && global.GoatBot?.onReply) {
            global.GoatBot.onReply.set(sentGrow.messageID, {
                commandName: "dih",
                type: "menuRelay",
                threadID: threadID,
                timestamp: Date.now()
            });
        }
    },

    onReply: async function ({ api, event, Reply, message, usersData }) {
        if (!Reply || Reply.commandName !== "dih") return;

        // ──────────────── A. DIH FIGHT REPLY ────────────────
        if (Reply.type === "dihFight") {
            // Check 60s expiration
            if (Date.now() - Reply.timestamp > 60000) {
                if (global.GoatBot?.onReply) global.GoatBot.onReply.delete(event.messageReply?.messageID || Reply.messageID);
                return message.reply("⏳ This dih fight challenge has expired!");
            }

            // Only challenged opponent can reply
            if (String(event.senderID) !== String(Reply.opponentID)) {
                return message.reply(`⛔ Only ${Reply.opponentName} can accept or decline this challenge!`);
            }

            const replyText = (event.body || "").trim().toLowerCase();

            // Decline
            if (
                replyText.includes("decline") ||
                replyText.includes("no") ||
                replyText.includes("cancel") ||
                replyText.includes("forfeit") ||
                replyText.includes("run")
            ) {
                if (global.GoatBot?.onReply) global.GoatBot.onReply.delete(event.messageReply?.messageID || Reply.messageID);
                return message.reply(`🏳️ ${Reply.opponentName} declined the fight! ${Reply.challengerName}'s dih stands victorious without a scratch.`);
            }

            // Accept
            if (
                replyText.includes("accept") ||
                replyText.includes("yes") ||
                replyText.includes("fight") ||
                replyText.includes("duel") ||
                replyText.includes("ok") ||
                replyText === "y"
            ) {
                if (global.GoatBot?.onReply) global.GoatBot.onReply.delete(event.messageReply?.messageID || Reply.messageID);

                const dihData = getDihData();
                const threadDih = getThreadDih(dihData, Reply.threadID);
                const cUser = getUserDih(threadDih, Reply.challengerID, Reply.challengerName);
                const oUser = getUserDih(threadDih, Reply.opponentID, Reply.opponentName);
                const bet = Reply.bet;

                // Re-verify both players still have enough cm
                if (cUser.length < bet) {
                    return message.reply(`❌ ${cUser.name} no longer has enough centimeters (${cUser.length} cm) for the ${bet} cm bet!`);
                }
                if (oUser.length < bet) {
                    return message.reply(`❌ ${oUser.name} does not have enough centimeters (${oUser.length} cm) for the ${bet} cm bet!`);
                }

                const cLen = cUser.length;
                const oLen = oUser.length;

                // Battle odds: 50% baseline + size difference adjustment capped 25% - 75%
                let cWinChance = 0.50 + ((cLen - oLen) * 0.005);
                cWinChance = Math.max(0.25, Math.min(0.75, cWinChance));

                const challengerWins = Math.random() < cWinChance;
                const winner = challengerWins ? cUser : oUser;
                const loser = challengerWins ? oUser : cUser;

                winner.length += bet;
                loser.length -= bet;
                winner.fightsWon = (winner.fightsWon || 0) + 1;
                loser.fightsLost = (loser.fightsLost || 0) + 1;

                saveDihData(dihData);

                // Generate result Canvas Card
                let resultCardBuffer = null;
                try {
                    resultCardBuffer = await generateFightCard({
                        challenger: { id: Reply.challengerID, name: cUser.name, length: cUser.length },
                        opponent: { id: Reply.opponentID, name: oUser.name, length: oUser.length },
                        bet: bet,
                        winner: { id: challengerWins ? Reply.challengerID : Reply.opponentID, name: winner.name },
                        isResult: true,
                        challengerAvatar: Reply.challengerAvatar,
                        opponentAvatar: Reply.opponentAvatar
                    });
                } catch (_) {}

                const resultBody =
                    `⚔️ ═══ THE DIH CLASH RESULTS ═══ ⚔️\n\n` +
                    `💥 ${cUser.name} [${cLen} cm] VS ${oUser.name} [${oLen} cm]\n` +
                    `⚡ Both dihs collide in a thunderous shockwave!\n\n` +
                    `🏆 WINNER: ${winner.name}!\n` +
                    `🎉 ${winner.name} seized +${bet} cm! (Now ${winner.length} cm)\n` +
                    `💀 ${loser.name} lost -${bet} cm! (Now ${loser.length} cm)\n` +
                    `═════════════════════════════`;

                if (resultCardBuffer) {
                    await fs.ensureDir(CACHE_DIR);
                    const tempPath = path.join(CACHE_DIR, `dih_clash_${Date.now()}.png`);
                    await fs.writeFile(tempPath, resultCardBuffer);
                    await message.reply({
                        body: resultBody,
                        attachment: fs.createReadStream(tempPath)
                    });
                    setTimeout(() => {
                        try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch (_) {}
                    }, 15000);
                    return;
                }

                return message.reply(resultBody);
            }
        }

        // ──────────────── B. LEADERBOARD TOP RELAY ────────────────
        if (Reply.type === "topRelay") {
            const body = (event.body || "").trim();
            const parts = body.split(/\s+/);
            const action = parts[0].toLowerCase();

            // e.g. "fight 1 10" or "fight 2"
            if (action === "fight" || action === "pvp") {
                const targetRank = parseInt(parts[1]);
                if (targetRank && targetRank >= 1 && targetRank <= (Reply.rankings?.length || 0)) {
                    const opponent = Reply.rankings[targetRank - 1];
                    const bet = parseInt(parts[2]) || 5;
                    return module.exports.onStart({
                        api,
                        event,
                        args: ["fight", String(bet), opponent.id],
                        message,
                        usersData
                    });
                }
            }

            // e.g. "1" (inspect rank 1)
            const rankNum = parseInt(body);
            if (!isNaN(rankNum) && rankNum >= 1 && rankNum <= (Reply.rankings?.length || 0)) {
                const target = Reply.rankings[rankNum - 1];
                return module.exports.onStart({
                    api,
                    event,
                    args: ["stats", target.id],
                    message,
                    usersData
                });
            }
        }

        // ──────────────── C. MENU / SHORTCUT RELAY ────────────────
        if (Reply.type === "menuRelay") {
            const body = (event.body || "").trim().toLowerCase();

            if (body === "1" || body === "grow") {
                return module.exports.onStart({ api, event, args: ["grow"], message, usersData });
            }
            if (body === "2" || body === "top" || body === "rank") {
                return module.exports.onStart({ api, event, args: ["top"], message, usersData });
            }
            if (body === "3" || body === "stats" || body === "card") {
                return module.exports.onStart({ api, event, args: ["stats"], message, usersData });
            }
            if (body === "4" || body === "ofday" || body === "dotd") {
                return module.exports.onStart({ api, event, args: ["ofday"], message, usersData });
            }
            if (body === "5" || body === "loan") {
                return module.exports.onStart({ api, event, args: ["loan"], message, usersData });
            }
            if (body === "6" || body === "help") {
                return module.exports.onStart({ api, event, args: ["help"], message, usersData });
            }
            if (body.startsWith("fight") || body.startsWith("pvp")) {
                const fightArgs = body.split(/\s+/);
                return module.exports.onStart({ api, event, args: fightArgs, message, usersData });
            }
        }
    }
};
