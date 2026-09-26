const { config } = global.GoatBot;
const { writeFileSync } = require("fs-extra");

module.exports = {
        config: {
                name: "nsfw",
                version: "1.7",
                author: "MahMUD",
                cooldown: 5,
                role: 2,
                description: {
                        bn: "NSFW পারমিশন যোগ, অপসারণ বা তালিকা দেখুন",
                        en: "Add, remove, or list NSFW permitted users"
                },
                category: "owner",
                guide: { bn: '{pn} add/remove/list [ID/@tag]', en: '{pn} add/remove/list [ID/@tag]' }
        },

        langs: {
                bn: {
                        added: "🔞 | সফলভাবে %1 জনকে NSFW পারমিশন দেওয়া হয়েছে:\n%2",
                        already: "\n⚠️ | %1 জন আগে থেকেই পারমিশন প্রাপ্ত ছিল:\n%2",
                        missingAdd: "⚠️ | বেবি, NSFW পারমিশন দিতে আইডি দিন অথবা ট্যাগ করুন!",
                        removed: "❌ | সফলভাবে %1 জনের NSFW পারমিশন সরানো হয়েছে:\n%2",
                        notIn: "⚠️ | %1 জন NSFW তালিকায় ছিল না:\n%2",
                        list: "🔞 | NSFW পারমিশন প্রাপ্ত ইউজার তালিকা:\n\n%1"
                },
                en: {
                        added: "🔞 | Added NSFW permission for %1 users:\n%2",
                        already: "\n⚠️ | %1 users already had permission:\n%2",
                        missingAdd: "⚠️ | Provide ID or tag for NSFW access!",
                        removed: "❌ | Removed NSFW permission for %1 users:\n%2",
                        notIn: "⚠️ | %1 users were not in the list:\n%2",
                        list: "🔞 | NSFW Permitted Users List:\n\n%1"
                }
        },

        onStart: async function ({ api, message, args, usersData, event, getLang }) {
                const action = args[0]?.toLowerCase();
                const { threadID, messageID } = event;
                if (!config.nsfwUser) config.nsfwUser = [];

                switch (action) {
                        case "add": {
                                if (args[1] || event.messageReply) {
                                        let uids = Object.keys(event.mentions).length > 0 ? Object.keys(event.mentions) : 
                                                   event.messageReply ? [event.messageReply.senderID] : args.filter(arg => !isNaN(arg));

                                        const notInIds = [], inIds = [];
                                        for (const uid of uids) config.nsfwUser.includes(uid) ? inIds.push(uid) : notInIds.push(uid);

                                        config.nsfwUser.push(...notInIds);
                                        const getNames = await Promise.all(uids.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
                                        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

                                        const response = (notInIds.length > 0 ? getLang("added", notInIds.length, getNames.filter(u => notInIds.includes(u.uid)).map(({ uid, name }) => `• ${name} (${uid})`).join("\n")) : "")
                                                + (inIds.length > 0 ? getLang("already", inIds.length, getNames.filter(u => inIds.includes(u.uid)).map(({ uid, name }) => `• ${name} (${uid})`).join("\n")) : "");
                                        return api.sendMessage(response, threadID, messageID);
                                } else return api.sendMessage(getLang("missingAdd"), threadID, messageID);
                        }
                        case "remove": {
                                if (args[1] || event.messageReply) {
                                        let uids = Object.keys(event.mentions).length > 0 ? Object.keys(event.mentions) : 
                                                   event.messageReply ? [event.messageReply.senderID] : args.filter(arg => !isNaN(arg));

                                        const inIds = [], notInIds = [];
                                        for (const uid of uids) config.nsfwUser.includes(uid) ? inIds.push(uid) : notInIds.push(uid);

                                        for (const uid of inIds) config.nsfwUser.splice(config.nsfwUser.indexOf(uid), 1);
                                        const getNames = await Promise.all(uids.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
                                        writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

                                        const response = (inIds.length > 0 ? getLang("removed", inIds.length, getNames.filter(u => inIds.includes(u.uid)).map(({ uid, name }) => `• ${name} (${uid})`).join("\n")) : "")
                                                + (notInIds.length > 0 ? getLang("notIn", notInIds.length, getNames.filter(u => notInIds.includes(u.uid)).map(({ uid, name }) => `• ${name} (${uid})`).join("\n")) : "");
                                        return api.sendMessage(response, threadID, messageID);
                                } else return api.sendMessage(getLang("missingAdd"), threadID, messageID);
                        }
                        case "list": {
                                const getNames = await Promise.all(config.nsfwUser.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
                                return api.sendMessage(getLang("list", getNames.map(({ uid, name }) => `• ${name}\n  └ ID: ${uid}`).join("\n\n")), threadID, messageID);
                        }
                        default: return message.SyntaxError();
                }
        }
};
