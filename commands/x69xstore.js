const axios = require("axios");
const fs = require('fs');
const path = require('path');
const Azadx69x = "https://x69xstore.vercel.app";

module.exports = {
  config: {
    name: "x69xstore",
    aliases: ["store","gs","xs","cs"],
    version: "0.0.7",
    role: 0,
    author: "Azadx69x",
    shortDescription: { en: "X69X-STORE — Browse, search & share bot commands from the live marketplace." },
    longDescription: { en: "X69X-STORE is your all-in-one bot command marketplace, right inside the chat! Browse thousands of ready-made commands, search by name or category, and check what's trending right now. View full command details (author, stats, raw code link), read and post comments, like your favorite commands, and instantly upload your own commands to share with the community — all in real time, no need to leave the chat." },
    category: "Market",
    cooldowns: 0,
  },
  onStart: async ({ api, event, args, message }) => {
    const sendX69xMessage = (content, title = "🤖X69X-STORE") => {
      const header = `┍━━━[ ${title} ]━━━◊\n`;
      const footer = "\n┕━━━━━━━━━━━━━━━━◊";
      const lines = content.split("\n").filter((line) => line.trim() !== "");
      const body = lines.map((line) => `┋➥ ${line}`).join("\n");
      return message.reply(header + body + footer);
    };
    const sendErrorMessage = (content) => message.reply(content);
    const helpList =
      `show <ID>\n` +
      `page <number>\n` +
      `search <query>\n` +
      `trending\n` +
      `categories\n` +
      `like <ID>\n` +
      `comments <ID>\n` +
      `comment <ID> <text>\n` +
      `likecomment <commentID>\n` +
      `upload <name>`;

    try {
      if (!args[0]) {
        return sendX69xMessage(helpList);
      }
      const command = args[0].toLowerCase();
      switch (command) {
        case "show": {
          const itemID = parseInt(args[1]);
          if (isNaN(itemID)) return sendErrorMessage("⚠️ Please provide a valid item ID.");
          const response = await axios.get(`${Azadx69x}/api/item/${itemID}`);
          const item = response.data;
          const bangladeshTime = new Date(item.createdAt).toLocaleString('en-US', {
            timeZone: 'Asia/Dhaka',
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          });
          const header = `┍━━━[ 🗳️ X69X-STORE ]━━━◊\n`;
          const footer = `\n┕━━━━━━━━━━━━━━━━◊\n https://x69xstore.vercel.app/raw/${item.rawID}`;
          const body =
            `\n╭‣ 📝 𝗡𝗮𝗺𝗲\n` +
            `╰‣ ${item.itemName}\n\n` +
            `╭‣ 🆔 𝗜𝗗\n` +
            `╰‣ ${item.itemID}\n\n` +
            `╭‣ 📁 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆\n` +
            `╰‣ ${item.category || 'Unknown'}\n\n` +
            `╭‣ 📝 Description\n` +
            `╰‣ ${item.description}\n\n` +
            `╭‣ 👨‍💻 𝗔𝘂𝘁𝗵𝗼𝗿\n` +
            `╰‣ ${item.authorName}\n\n` +
            `╭‣ 📅 𝗔𝗱𝗱𝗲𝗱\n` +
            `╰‣ ${bangladeshTime}\n\n` +
            `╭‣ 👀 𝗩𝗶𝗲𝘄𝘀\n` +
            `╰‣ ${item.views}\n\n` +
            `╭‣ ❤️ 𝗟𝗶𝗸𝗲\n` +
            `╰‣ ${item.likes}\n\n` +
            `╭‣ 💬 𝗖𝗼𝗺𝗺𝗲𝗻𝘁𝘀\n` +
            `╰‣ ${item.commentsCount || 0}`;
          return message.reply(header + body + footer);
        }
        case "page": {
          const page = parseInt(args[1]) || 1;
          const { data: { items, total } } = await axios.get(`${Azadx69x}/api/items?page=${page}&limit=5`);
          const totalPages = Math.ceil(total / 5);
          if (page <= 0 || page > totalPages) return sendErrorMessage("⚠️ Invalid page number.");

          const header = `┍━━━[🗳️ X69X-STORE ]━━━◊\n\n 🗒️ Page ${page}\n`;
          const footer = "\n┕━━━━━━━━━━━━━━━━◊";

          let body = "";
          items.forEach((item, index) => {
            const itemBlock =
              `┋➥ 🗂️ ${index + 1}: ${item.itemName}\n` +
              `┋➥ 🆔 ID: ${item.itemID}\n` +
              `┋➥ 📁 Category: ${item.category}\n` +
              `┋➥ 📝 Description: ${item.description}\n` +
              `┋➥ 👀 Views: ${item.views}\n` +
              `┋➥ ❤️ Likes: ${item.likes}\n` +
              `┋➥ 💬 Comments: ${item.commentsCount || 0}\n` +
              `┋➥ 👨‍💻 Author: ${item.authorName}`;

            if (index === 0) {
              body += `\n${itemBlock}`;
            } else {
              body += `\n┍━━━━━━━━━━━━━━━━━◊\n${itemBlock}`;
            }
          });

          return message.reply(header + body + footer);
        }
        case "search": {
          const query = args.slice(1).join(" ");
          if (!query) return sendErrorMessage("⚠️ Please provide a search query.");
          const { data } = await axios.get(`${Azadx69x}/api/items?search=${encodeURIComponent(query)}&limit=50`);
          const results = data.items;
          if (!results.length) return sendErrorMessage("❌ No matching commands found.");

          const header = `┍━━━[🗳️ X69X-STORE ]━━━◊\n\n  🗂️ Query: "${query}"\n`;
          const footer = "\n┕━━━━━━━━━━━━━━━━◊";

          let body = "";
          results.forEach((item, index) => {
            if (index === 0) {
              body += `\n┋➥ 🗂️ ${index + 1}: ${item.itemName}\n` +
                `┋➥ 🆔 ID: ${item.itemID}\n` +
                `┋➥ 📁 Category: ${item.category}\n` +
                `┋➥ 👨‍💻 Author: ${item.authorName}`;
            } else {
              body += `\n┍━━━━━━━━━━━━━━━━━◊\n` +
                `┋➥ 🗂️ ${index + 1}: ${item.itemName}\n` +
                `┋➥ 🆔 ID: ${item.itemID}\n` +
                `┋➥ 📁 Category: ${item.category}\n` +
                `┋➥ 👨‍💻 Author: ${item.authorName}`;
            }
          });

          return message.reply(header + body + footer);
        }
        case "trending": {
          const { data } = await axios.get(`${Azadx69x}/api/trending`);
          const trendingList = data.slice(0, 5).map((item, index) =>
            `${index + 1}. 🔥 ${item.itemName}\n` +
            `❤️ ${item.likes}  👀 ${item.views}  💬 ${item.commentsCount || 0}`
          ).join("\n\n");
          return sendX69xMessage(trendingList);
        }
        case "categories": {
          const { data: cats } = await axios.get(`${Azadx69x}/api/categories`);
          if (!cats.length) return sendErrorMessage("❌ No categories found.");
          const catList = cats.map((c, i) =>
            `${i + 1}. 🗂️ ${c._id} — 📦 ${c.count} command${c.count === 1 ? '' : 's'}`
          ).join("\n");
          return sendX69xMessage(catList);
        }
        case "like": {
          const likeItemId = parseInt(args[1]);
          if (isNaN(likeItemId)) return sendErrorMessage("⚠️ Please provide a valid item ID.");
          const { data } = await axios.post(`${Azadx69x}/api/items/${likeItemId}/like`);
          if (data.success) {
            return sendX69xMessage(`📊 Status: Successfully liked!\n❤️ Total Likes: ${data.likes}`);
          } else {
            return sendErrorMessage("⚠️ Failed to like command.");
          }
        }
        case "comments": {
          const commentsItemId = parseInt(args[1]);
          if (isNaN(commentsItemId)) return sendErrorMessage("⚠️ Please provide a valid item ID.");
          const { data: comments } = await axios.get(`${Azadx69x}/api/item/${commentsItemId}/comments`);
          if (!comments.length) return sendX69xMessage("💬 No comments yet. Be the first to comment!");
          const commentList = comments.slice(0, 8).map((c, i) =>
            `${i + 1}. 👤 ${c.authorName}\n` +
            `💬 ${c.message}\n` +
            `❤️ ${c.likes} | 🆔 ${c.commentID}`
          ).join("\n\n");
          return sendX69xMessage(`💬 Comments for #${commentsItemId}\n\n${commentList}`);
        }
        case "comment": {
          const commentItemId = parseInt(args[1]);
          const commentText = args.slice(2).join(" ");
          if (isNaN(commentItemId)) return sendErrorMessage("⚠️ Please provide a valid item ID.");
          if (!commentText) return sendErrorMessage("⚠️ Please provide a comment message.");
          const authorName = (event.senderID && (await api.getUserInfo(event.senderID))[event.senderID]?.name) || "Guest Developer";
          const { data } = await axios.post(`${Azadx69x}/api/item/${commentItemId}/comments`, {
            authorName,
            message: commentText,
          });
          if (data.success) {
            return sendX69xMessage(
              `✅ Status: Comment posted!\n👤 Author: ${authorName}\n🆔 Comment ID: ${data.comment.commentID}`
            );
          }
          return sendErrorMessage("⚠️ Failed to post comment.");
        }
        case "likecomment": {
          const commentID = args[1];
          if (!commentID) return sendErrorMessage("⚠️ Please provide a valid comment ID.");
          const { data } = await axios.post(`${Azadx69x}/api/comments/${commentID}/like`);
          if (data.success) {
            return sendX69xMessage(`✨ Status: Comment liked!\n❤️ Total Likes: ${data.likes}`);
          }
          return sendErrorMessage("⚠️ Failed to like comment.");
        }
        case "upload": {
          const commandName = args[1];
          if (!commandName) return sendErrorMessage("⚠️ Please provide a command name.");
          const commandPath = path.join(process.cwd(), 'scripts', 'cmds', `${commandName}.js`);
          if (!fs.existsSync(commandPath)) return sendErrorMessage(`❌ File '${commandName}.js' not found.`);
          try {
            const code = fs.readFileSync(commandPath, 'utf8');
            let commandFile;
            try {
              commandFile = require(commandPath);
            } catch (err) {
              return sendErrorMessage("⚠️ Invalid command file format.");
            }
            const cfg = commandFile.config || {};
            const uploadData = {
              itemName: cfg.name || commandName,
              description: cfg.longDescription?.en || cfg.shortDescription?.en || "No description",
              category: cfg.category || "Uncategorized",
              code,
              authorName: cfg.author || event.senderID || "Unknown",
              tags: cfg.aliases || [],
            };
            const response = await axios.post(`${Azadx69x}/v1/paste`, uploadData);
            if (response.data.success) {
              const { itemID, link } = response.data;
              return sendX69xMessage(
                `✅ Status: command uploaded successfully\n` +
                `📝 Name: ${uploadData.itemName}\n` +
                `🆔 ID: ${itemID}\n` +
                `👨‍💻 Author: ${uploadData.authorName}\n` +
                `🔗 Raw Link: ${link}`
              );
            }
            return sendErrorMessage("⚠️ Failed to upload the command.");
          } catch (error) {
            console.error("Upload error:", error?.response?.data || error.message || error);
            const apiMsg =
              error?.response?.data?.message ||
              error?.response?.data?.error ||
              error.message ||
              "Unknown error";
            return sendErrorMessage(`⚠️ Upload failed: ${apiMsg}`);
          }
        }
        default:
          return sendX69xMessage(helpList);
      }
    } catch (err) {
      console.error("X69X-STORE Error:", err);
      return sendErrorMessage("⚠️ An unexpected error occurred. Please check the console for details.");
    }
  }
};
