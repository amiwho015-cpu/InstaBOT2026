module.exports = {
    config: {
        name: "addmoney",
        aliases: [],
        version: "2.5.0",
        author: "frnAlt",
        cooldown: 5,
        role: 2,
        shortDescription: "Add money to another user balance",
        longDescription: {
            en: "Add money to another user balance using the addmoney command. Reply to a user message or mention a user."
        },
        category: "economy",
        guide: {
            en: "{pn} @mention <amount> or reply to a user with {pn} <amount>"
        }
    },
    onStart: async function ({ api, event, args, usersData, message }) {
        const { getPrefix } = global.utils;
        const p = getPrefix(event.threadID);
        let recipientID;
        let addAmount = parseInt(args[0]);

        if (event.messageReply) {
            recipientID = event.messageReply.senderID;
        } else if (event.mentions && Object.keys(event.mentions).length > 0) {
            recipientID = Object.keys(event.mentions)[0];
            addAmount = parseInt(args[args.length - 1]);
        } else if (args[1] && /^\d+$/.test(args[0])) {
            recipientID = args[0];
            addAmount = parseInt(args[1]);
        }

        if (isNaN(addAmount) || addAmount <= 0) {
            return message.reply("Invalid amount. Please enter a valid amount.\nUsage: " + p + "addmoney @mention <amount>");
        }

        if (!recipientID) {
            return message.reply("Please reply to a user or mention a user to add money.\nUsage: " + p + "addmoney @mention <amount>");
        }

        const recipientData = await usersData.get(recipientID);
        if (!recipientData) {
            return message.reply("Recipient not found. Please ensure the user has interacted with the bot.");
        }

        recipientData.money = (recipientData.money || 0) + addAmount;
        await usersData.set(recipientID, recipientData);

        return message.reply("Successfully added " + addAmount.toLocaleString() + " coins to " + recipientData.name + "'s balance.");
    }
};
