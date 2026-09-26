"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { easyCMD } = require("../../func/definers.js");
const reportCmd = easyCMD({
    name: "report",
    description: "Reports a message to bot admins.",
    title: "📝 Report to Admin",
    category: "Support",
    contentFont: "fancy",
    icon: "📝",
    meta: {
        cooldown: 120,
        otherNames: ["re"],
        usage: "report <message>",
        fbOnly: true,
        author: "frnAlt",
    },
    async run({ output, args, userName, input, cancelCooldown }) {
        const message = args.join(" ");
        if (!message) {
            cancelCooldown();
            return output.send("⚠️ Please provide a message to report.");
        }
        const time = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Manila",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        const admins = global.GoatBot?.config?.adminBot || [];
        for (const id of admins) {
            if (output.sendStyled) {
                await output.sendStyled(`**Report from ${userName}**:\n\n${message}\n\n🔍 ***User ID***: ${input.sid}\n🔍 ***Thread ID***: ${input.tid}\n📅 ***Time***: ${time}`, {
                    title: "‼️ Admin Report",
                }, id).catch(() => {});
            } else if (global.api?.sendMessage) {
                await global.api.sendMessage(`‼️ Admin Report from ${userName}:\n\n${message}\n\nUser ID: ${input.sid}\nThread ID: ${input.tid}\nTime: ${time}`, id).catch(() => {});
            }
        }
        output.reply("✅ Your report has been sent to the admins.");
        output.reaction("👍");
    },
});

module.exports = reportCmd;
module.exports.default = reportCmd;
