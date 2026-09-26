/**
 * Pinterest Image Search Command
 * Searches and downloads HD aesthetics & photos from Pinterest
 */

const axios = require('axios');

module.exports = {
  config: {
    name: 'pinterest',
    aliases: ['pins', 'pinterestdl', 'pinimg'],
    version: '2.1.0',
    author: 'Gtajisan && frnAlt',
    cooldown: 5,
    role: 0,
    shortDescription: {
      en: 'Search and download Pinterest HD images'
    },
    longDescription: {
      en: 'Fetches high-resolution images, wallpapers, and aesthetics from Pinterest by keyword.'
    },
    category: 'media',
    usage: '{p}pinterest <query> [-count]\nExample: {p}pinterest cyberpunk wallpaper -3'
  },

  onStart: async function ({ api, event, args, message }) {
    const threadID = event.threadId || event.threadID;

    if (args.length === 0) {
      const prompt = '📌 𝗣𝗶𝗻𝘁𝗲𝗿𝗲𝘀𝘁 𝗦𝗲𝗮𝗿𝗰𝗵\n\nUsage: /pinterest <query> [-count]\nExample: /pinterest anime aesthetic -4';
      return message ? message.reply(prompt) : api.sendMessage(prompt, threadID);
    }

    let count = 4;
    const countArg = args.find(a => /^-\d+$/.test(a));
    if (countArg) {
      count = Math.min(Math.max(parseInt(countArg.slice(1), 10), 1), 6);
      args = args.filter(a => a !== countArg);
    }

    const query = args.join(' ').trim();
    if (message && typeof message.reaction === 'function') message.reaction('⏳', event.messageID);

    try {
      let imageUrls = [];

      // Three search endpoints race in PARALLEL — sequential attempts stacked
      // up to 30s of timeouts before the "no results" reply. First non-empty
      // result set wins.
      const enc = encodeURIComponent(query);
      const searches = [
        axios.get(`https://api.siputzx.my.id/api/s/pinterest?query=${enc}`, { timeout: 10000 }).then(res => {
          if (res.data?.data && Array.isArray(res.data.data)) return res.data.data.slice(0, count);
          if (Array.isArray(res.data?.result)) return res.data.result.slice(0, count);
          return [];
        }),
        axios.get(`https://widpe.com/pinterest?query=${enc}`, { timeout: 10000 }).then(res =>
          Array.isArray(res.data?.result) ? res.data.result.slice(0, count) : []
        ),
        axios.get(`https://api.unsplash.com/search/photos?client_id=d627d35368a73b9e59ff2ae3081e779a1f26f2a677464ce780d60be1c43db814&query=${enc}&per_page=${count}`, { timeout: 10000 }).then(res =>
          res.data?.results ? res.data.results.map(r => r.urls?.regular || r.urls?.small).filter(Boolean) : []
        )
      ];
      const settled = await Promise.allSettled(searches);
      for (const entry of settled) {
        if (entry.status === "fulfilled" && Array.isArray(entry.value) && entry.value.length) {
          imageUrls = entry.value;
          break;
        }
      }

      if (imageUrls.length === 0) {
        if (message && typeof message.reaction === 'function') message.reaction('❌', event.messageID);
        const notFound = `❌ No Pinterest images found for: "${query}".`;
        return message ? message.reply(notFound) : api.sendMessage(notFound, threadID);
      }

      const caption = `📌 𝗣𝗶𝗻𝘁𝗲𝗿𝗲𝘀𝘁: "${query}" (${imageUrls.length} photos)`;
      if (message && typeof message.reaction === 'function') message.reaction('✅', event.messageID);

      return message 
        ? message.reply({ body: caption, attachment: imageUrls })
        : api.sendMessage({ body: caption, attachment: imageUrls }, threadID);
    } catch (error) {
      if (message && typeof message.reaction === 'function') message.reaction('❌', event.messageID);
      const errMsg = `❌ Failed to fetch Pinterest images: ${error.message}`;
      return message ? message.reply(errMsg) : api.sendMessage(errMsg, threadID);
    }
  },

  run: async function (params) {
    return module.exports.onStart(params);
  }
};
