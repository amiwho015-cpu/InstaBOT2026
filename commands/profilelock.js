module.exports = {
  config: {
    name: "profilelock",
    aliases: ["plock"],
    version: "2.4.73",
    author: "frnAlt",
    cooldown: 5,
    role: 2,
    description: {
      en: "Lock or unlock your Facebook profile"
    },
    category: "owner",
    guide: {
      en: "{pn} on → Lock your profile\n"
        + "{pn} off → Unlock your profile\n"
        + "{pn} → Check current profile lock status"
    }
  },

  langs: {
    en: {
      invalidArgs: "⚠️ Use: {pn} on/off or leave empty to check status",
      locked: "🔒 Your profile is currently LOCKED.",
      unlocked: "🔓 Your profile is currently UNLOCKED.",
      successLock: "✅ Successfully LOCKED your profile!",
      successUnlock: "✅ Successfully UNLOCKED your profile!",
      error: "❌ Failed to change profile lock status: %1",
      statusError: "❌ Failed to get profile lock status: %1"
    }
  },

  ST: async function ({ api, event, args, message, getLang }) {
    try {
      const action = args[0]?.toLowerCase();

      if (action && !["on", "off"].includes(action)) {
        return message.reply(getLang("invalidArgs"));
      }

      
      if (!action) {
        api.getProfileLockStatus((err, result) => {
          if (err) return message.reply(getLang("statusError", err.message));

          const msg = result.isLocked
            ? getLang("locked")
            : getLang("unlocked");
          message.reply(msg);
        });
        return;
      }

     
      const shouldLock = action === "off"; 

      api.setProfileLock(shouldLock, (err) => {
        if (err) return message.reply(getLang("error", err.message));

        const msg = shouldLock
          ? getLang("successUnlock")
          : getLang("successLock");
        message.reply(msg);
      });
    } catch (error) {
      message.reply(getLang("error", error.message));
    }
  }
};

module.exports.onStart = module.exports.ST;
