module.exports = {
  config: {
    name: "friendlist",
    aliases: ["fl"],
    version: "2.4.71",
    author: "frnAlt",
    cooldown: 5,
    role: 2,
    description: {
      vi: "Hiển thị danh sách bạn bè với tìm kiếm và hủy kết bạn",
      en: "Display friends list with search, pagination, and unfriending"
    },
    category: "owner",
    guide: {
      en: "{pn} [page number]\n{pn} -s <name> - Search friends"
    }
  },

  onStart: async function ({ api, event, args, message }) {
    try {
      if (args[0] === "-s" || args[0] === "-search") {
        const searchQuery = args.slice(1).join(" ");
        if (!searchQuery) {
          return message.reply("❌ Please provide a search term!\nExample: /friendlist -s John");
        }

        if (api.searchFriends) {
          api.searchFriends(searchQuery, (err, data) => {
            if (err || !data || data.length === 0) {
              return message.reply(`❌ No friends found matching "${searchQuery}"`);
            }

            let searchMsg = `🔍 SEARCH RESULTS FOR "${searchQuery}" (${data.length} found):\n\n`;
            data.slice(0, 10).forEach((friend, idx) => {
              searchMsg += `${idx + 1}. ${friend.name}\n   👤 ID: ${friend.userID}\n`;
            });
            return message.reply(searchMsg);
          });
          return;
        }
      }

      if (api.getFriendsList) {
        api.getFriendsList((err, data) => {
          if (err || !data) {
            return message.reply("❌ Unable to fetch friends list from Facebook.");
          }

          const page = parseInt(args[0]) || 1;
          const friendsPerPage = 10;
          const totalPages = Math.ceil(data.length / friendsPerPage);
          const startIndex = (page - 1) * friendsPerPage;
          const friendsToShow = data.slice(startIndex, startIndex + friendsPerPage);

          let msg = `👥 FRIENDS LIST (Page ${page}/${totalPages})\n📊 Total Friends: ${data.length}\n\n`;
          friendsToShow.forEach((friend, idx) => {
            msg += `${startIndex + idx + 1}. ${friend.fullName || friend.name}\n   👤 ID: ${friend.userID || friend.id}\n`;
          });

          return message.reply(msg);
        });
        return;
      }

      return message.reply("⚠️ FCA getFriendsList API method is not available on this session.");
    } catch (err) {
      return message.reply("❌ Friendlist Error: " + err.message);
    }
  }
};
