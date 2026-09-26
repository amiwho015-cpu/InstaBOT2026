
const fs = require("fs-extra");
const path = require("path");

module.exports = {
	config: {
		name: "accountswitch",
		version: "2.4.75",
		author: "frnAlt",
		cooldown: 5,
		role: 2,
		description: {
			en: "Manage and switch between primary and secondary accounts in two account mode"
		},
		category: "owner",
		guide: {
			en: "   {pn} status - Check current account status\n"
				+ "   {pn} switch - Switch to the other account\n"
				+ "   {pn} primary - Force switch to primary account\n"
				+ "   {pn} secondary - Force switch to secondary account\n"
				+ "   {pn} test secondary - Test secondary account login\n"
				+ "   {pn} enable - Enable two account mode\n"
				+ "   {pn} disable - Disable two account mode\n"
				+ "   {pn} autoswitch on/off - Enable/disable auto switch on error"
		}
	},

	langs: {
		en: {
			twoIdModeDisabled: "⚠️ Two account mode is currently disabled.\nUse `{pn} enable` to enable it first.",
			currentStatus: "📊 Account Status\n━━━━━━━━━━━━━━━━━━\n• Mode: Two Account Mode %1\n• Current Account: %2\n• Switch Count: %3\n• Auto Switch on Error: %4\n\n💡 Primary Account: %5\n💡 Secondary Account: %6",
			enabled: "ENABLED ✅",
			disabled: "DISABLED ❌",
			configured: "Configured ✅",
			notConfigured: "Not Configured ❌",
			switching: "🔄 Switching to %1 account...\n⏳ Bot will restart in 3 seconds",
			primary: "PRIMARY",
			secondary: "SECONDARY",
			testingSecondary: "🔬 Testing secondary account login...\n⏳ Please wait...",
			testSuccess: "✅ Secondary account login test successful!\n📧 Account: %1\n🔑 Cookies saved to account.txt2",
			testFailed: "❌ Secondary account login test failed!\n⚠️ Error: %1",
			modeEnabled: "✅ Two account mode has been enabled\n💡 Configure accounts in config.json under twoIdMode",
			modeDisabled: "❌ Two account mode has been disabled\n💡 Bot will use normal single account mode",
			alreadyOnAccount: "⚠️ Bot is already using %1 account",
			secondaryNotConfigured: "⚠️ Secondary account is not configured in config.json\n💡 Please configure email and password under twoIdMode.secondaryAccount",
			autoSwitchEnabled: "✅ Auto-switch on error has been enabled\n💡 Bot will automatically switch to secondary account on MQTT errors",
			autoSwitchDisabled: "❌ Auto-switch on error has been disabled\n💡 Bot will not automatically switch accounts on errors"
		}
	},

	ST: async function ({ args, message, getLang, api }) {
		const { config } = global.GoatBot;
		const twoIdMode = config.twoIdMode;

		if (!args[0]) {
			return message.SyntaxError();
		}

		const action = args[0].toLowerCase();

		// Status command
		if (action === "status") {
			const currentAccount = global.GoatBot.currentAccount || "primary";
			const switchCount = global.GoatBot.accountSwitchCount || 0;
			const modeStatus = twoIdMode && twoIdMode.enable ? getLang("enabled") : getLang("disabled");
			const autoSwitch = twoIdMode && twoIdMode.autoSwitchOnError ? "Enabled ✅" : "Disabled ❌";
			
			const primaryConfigured = config.botAccount && config.botAccount.email ? 
				getLang("configured") : getLang("notConfigured");
			const secondaryConfigured = twoIdMode && twoIdMode.secondaryAccount && 
				twoIdMode.secondaryAccount.email && twoIdMode.secondaryAccount.password ? 
				getLang("configured") : getLang("notConfigured");

			return message.reply(getLang("currentStatus", modeStatus, currentAccount.toUpperCase(), switchCount, autoSwitch, primaryConfigured, secondaryConfigured));
		}

		// Enable/Disable commands
		if (action === "enable") {
			if (!config.twoIdMode) {
				config.twoIdMode = {
					enable: true,
					autoSwitchOnError: true,
					secondaryAccount: {
						email: "",
						password: "",
						twoFactorCode: "",
						userAgent: ""
					}
				};
			} else {
				config.twoIdMode.enable = true;
			}
			fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
			return message.reply(getLang("modeEnabled"));
		}

		if (action === "disable") {
			if (!config.twoIdMode) {
				config.twoIdMode = { enable: false };
			} else {
				config.twoIdMode.enable = false;
			}
			fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
			return message.reply(getLang("modeDisabled"));
		}

		// Auto-switch commands
		if (action === "autoswitch") {
			if (!args[1] || !["on", "off"].includes(args[1].toLowerCase())) {
				return message.reply("⚠️ Please specify 'on' or 'off' for auto-switch");
			}
			
			if (!config.twoIdMode) {
				config.twoIdMode = { enable: false, autoSwitchOnError: false };
			}
			
			config.twoIdMode.autoSwitchOnError = args[1].toLowerCase() === "on";
			fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
			
			return message.reply(config.twoIdMode.autoSwitchOnError ? 
				getLang("autoSwitchEnabled") : getLang("autoSwitchDisabled"));
		}

		// Check if two account mode is enabled for other commands
		if (!twoIdMode || !twoIdMode.enable) {
			return message.reply(getLang("twoIdModeDisabled").replace("{pn}", "accountswitch"));
		}

		// Switch command
		if (action === "switch") {
			const currentAccount = global.GoatBot.currentAccount || "primary";
			const targetAccount = currentAccount === "primary" ? "secondary" : "primary";
			
			// Check if secondary account is configured when switching to it
			if (targetAccount === "secondary" && (!twoIdMode.secondaryAccount || 
				!twoIdMode.secondaryAccount.email || !twoIdMode.secondaryAccount.password)) {
				return message.reply(getLang("secondaryNotConfigured"));
			}
			
			global.GoatBot.currentAccount = targetAccount;
			if (!global.GoatBot.accountSwitchCount) {
				global.GoatBot.accountSwitchCount = 0;
			}
			global.GoatBot.accountSwitchCount++;
			
			await message.reply(getLang("switching", getLang(targetAccount)));
			
			setTimeout(() => {
				process.exit(2); // Restart bot
			}, 3000);
			return;
		}

		// Primary command
		if (action === "primary") {
			const currentAccount = global.GoatBot.currentAccount || "primary";
			if (currentAccount === "primary") {
				return message.reply(getLang("alreadyOnAccount", getLang("primary")));
			}
			
			global.GoatBot.currentAccount = "primary";
			if (!global.GoatBot.accountSwitchCount) {
				global.GoatBot.accountSwitchCount = 0;
			}
			global.GoatBot.accountSwitchCount++;
			
			await message.reply(getLang("switching", getLang("primary")));
			
			setTimeout(() => {
				process.exit(2); // Restart bot
			}, 3000);
			return;
		}

		// Secondary command
		if (action === "secondary") {
			const currentAccount = global.GoatBot.currentAccount || "primary";
			if (currentAccount === "secondary") {
				return message.reply(getLang("alreadyOnAccount", getLang("secondary")));
			}
			
			if (!twoIdMode.secondaryAccount || !twoIdMode.secondaryAccount.email || 
				!twoIdMode.secondaryAccount.password) {
				return message.reply(getLang("secondaryNotConfigured"));
			}
			
			global.GoatBot.currentAccount = "secondary";
			if (!global.GoatBot.accountSwitchCount) {
				global.GoatBot.accountSwitchCount = 0;
			}
			global.GoatBot.accountSwitchCount++;
			
			await message.reply(getLang("switching", getLang("secondary")));
			
			setTimeout(() => {
				process.exit(2); // Restart bot
			}, 3000);
			return;
		}

		// Test secondary account
		if (action === "test" && args[1] && args[1].toLowerCase() === "secondary") {
			if (!twoIdMode.secondaryAccount || !twoIdMode.secondaryAccount.email || 
				!twoIdMode.secondaryAccount.password) {
				return message.reply(getLang("secondaryNotConfigured"));
			}

			await message.reply(getLang("testingSecondary"));

			try {
				const getFbstate1 = require("../../bot/login/getFbstate1.js");
				const cookies = await getFbstate1(
					twoIdMode.secondaryAccount.email,
					twoIdMode.secondaryAccount.password,
					twoIdMode.secondaryAccount.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
					twoIdMode.secondaryAccount.proxy || null
				);

				if (cookies && Array.isArray(cookies) && cookies.length > 0) {
					// Save to account.txt2
					const secondaryAccountPath = path.normalize(`${process.cwd()}/account.txt2`);
					fs.writeFileSync(secondaryAccountPath, JSON.stringify(cookies, null, 2));
					return message.reply(getLang("testSuccess", twoIdMode.secondaryAccount.email));
				} else {
					return message.reply(getLang("testFailed", "Invalid credentials or network error"));
				}
			} catch (error) {
				return message.reply(getLang("testFailed", error.message));
			}
		}

		return message.SyntaxError();
	}
};

module.exports.onStart = module.exports.ST;
