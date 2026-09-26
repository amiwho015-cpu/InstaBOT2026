const axios = require("axios");
const cheerio = require("cheerio");

async function searchBing(query) {
  const results = [];
  try {
    const res = await axios.get(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=en-US`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      },
      timeout: 10000
    });

    const $ = cheerio.load(res.data);
    $("li.b_algo").each((_, el) => {
      if (results.length >= 5) return;
      const titleEl = $(el).find("h2 a");
      const title = titleEl.text().trim();
      let url = titleEl.attr("href");

      if (url && url.includes("/ck/a?")) {
        const match = url.match(/u=a1([a-zA-Z0-9_\-]+)/);
        if (match) {
          try {
            url = Buffer.from(match[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
          } catch (_) {}
        }
      }

      const snippet = $(el).find(".b_caption p").text().trim() || $(el).find("p").text().trim();
      if (title && url && url.startsWith("http")) {
        results.push({ title, snippet, url });
      }
    });
  } catch (err) {
    console.warn("[SEARCH] Bing error:", err.message);
  }
  return results;
}

async function searchWikipedia(query) {
  const results = [];
  try {
    const res = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`, {
      headers: {
        "User-Agent": "FloppaChatbot/2.0 (https://github.com/frnAlt/Floppa-Chatbot; contact@floppa.bot)"
      },
      timeout: 8000
    });
    const items = res.data?.query?.search || [];
    items.slice(0, 5).forEach(item => {
      const title = item.title;
      const snippet = item.snippet ? item.snippet.replace(/<[^>]+>/g, "").trim() : "";
      const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/\s+/g, "_"))}`;
      if (title) results.push({ title, snippet, url });
    });
  } catch (err) {
    console.warn("[SEARCH] Wikipedia error:", err.message);
  }
  return results;
}

module.exports = {
  config: {
    name: "search",
    aliases: ["google", "gsearch", "find", "bing"],
    version: "2.1.0",
    author: "frnAlt",
    cooldown: 5,
    role: 0,
    shortDescription: { en: "Search the web" },
    longDescription: { en: "Search the web for instant answers, news, and links" },
    category: "utility",
    guide: { en: "{pn} <search keywords>" }
  },

  onStart: async function ({ message, args, event, api }) {
    if (!args[0]) {
      return message.reply("❌ Please enter what you want to search for.\nExample: {p}search latest space missions");
    }

    const query = args.join(" ").trim();
    if (api && api.setMessageReaction) {
      api.setMessageReaction("🔍", event.messageID, () => {}, true);
    }

    try {
      // 1. Primary: Bing Search Engine
      let results = await searchBing(query);

      // 2. Secondary fallback: Wikipedia Search
      if (results.length === 0) {
        results = await searchWikipedia(query);
      }

      if (results.length === 0) {
        if (api && api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
        return message.reply(`❌ No web results found for "${query}". Please try different keywords.`);
      }

      let replyText = `🔎 Search results for "${query}":\n\n`;
      results.forEach((r, idx) => {
        replyText += `[${idx + 1}] ${r.title}\n📝 ${r.snippet}\n🔗 ${r.url}\n\n`;
      });

      if (api && api.setMessageReaction) api.setMessageReaction("👍", event.messageID, () => {}, true);
      return message.reply(replyText.trim());
    } catch (err) {
      console.error("[SEARCH ERROR]:", err.message);
      if (api && api.setMessageReaction) api.setMessageReaction("👎", event.messageID, () => {}, true);
      return message.reply(`❌ Search failed: ${err.message || "Network timeout."}`);
    }
  }
};
