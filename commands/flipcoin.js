const flipcoinID = "flipRank";
//[flipcoinID]
module.exports = {
  meta: {
    name: "flipcoin",
    version: "1.0.4",
    description: "Flips a coin",
    author: "frnAlt",
    usage: "flip",
    otherNames: ["toss", "tosscoin", "headtails", "ht", "flip"],
    waitingTime: 55,
    noPrefix: false,
    shopPrice: 2500,
    requirement: "3.0.0",
    icon: "🪙",
    category: "Gambling Games",
    cmdType: "cplx_g",
    isGame: true,
  },
  style: class {
    title = {
      text_font: "double_struck",
      content: "Flip Coin V4 🪙",
      line_bottom: "default",
    };
    content = {
      text_font: "fancy",
      content: null,
    };
  },
  flipcoin: async function ({
    input,
    output,
    cooldown = 0,
    flipcoin: { ranker, luck },
    money: botData,
    cancelCooldown,
  }) {
    output.react = output.reaction;
    function cooldownEmo() {
      output.react("🕜");
      setTimeout(() => {
        output.react("🕝");
      }, 4000);
      setTimeout(() => {
        output.react("🕞");
      }, 8000);
      setTimeout(() => {
        output.react("🕟");
      }, 12000);
      setTimeout(() => {
        output.react("👍");
      }, 16000);
    }

    if (!cooldown) cooldownEmo();
    if (cooldown) output.react("❕");

    let side = input.arguments[0]?.toLowerCase();
    const bet = parseInt(input.arguments[1]);
    const data = await botData.get(input.senderID);
    data.prizePool ??= 0;

    async function getRank(targetuid) {
      const allData = await botData.getAll();
      const topList = Object.entries(allData)
        .filter(([uid, data]) => data.name && data[flipcoinID] !== undefined)
        .sort((a, b) => b[1][flipcoinID] - a[1][flipcoinID]);

      const rank = topList.findIndex(([uid, userData]) => targetuid === uid);
      return rank + 1;
    }

    function calculatePoints(bet, wamMultiplier, rankMultiplier) {
      const points =
        (12 + 12 * bet + (data[flipcoinID] / wamMultiplier) * rankMultiplier) /
        2;
      return parseInt(points);
    }

    function updateUserData(moneyChange, htRankChange) {
      const updatedData = {
        money: data.money + parseInt(moneyChange),
        [flipcoinID]: data[flipcoinID] + parseInt(htRankChange),
        prizePool: data.prizePool,
      };
      return updatedData;
    }

    if (input.arguments[0] === "top") {
      if (typeof cancelCooldown === "function") {
        cancelCooldown();
      }
      const allData = await botData.getAll();
      const topList = Object.entries(allData)
        .filter(([uid, data]) => data.name && data[flipcoinID] !== undefined)
        .sort((a, b) => b[1][flipcoinID] - a[1][flipcoinID])
        .slice(0, 10);

      const formattedTopList = topList.map(([uid, data], index) => {
        const { name, [flipcoinID]: htRank, luckStat } = data;
        return `
${index + 1}. ${name}
Points: ☄️${htRank} / ${ranker.getRank(htRank).rankValue}
Rank: ${ranker.getRank(htRank)}
Luck: ${luckStat || "100"}🍀
`;
      });

      const response = formattedTopList.length
        ? `🏆 Top 10 Batak:
        ${formattedTopList.join("\n")}`
        : "No data available for the top list.";

      return output.reply(response);
    }

    const { luckStat = 100 } = data;
    if (!data[flipcoinID]) {
      data[flipcoinID] = 50;
      await botData.set(input.senderID, data);
    }
    const isAffordable = data.prizePool * 2 >= bet;

    if (
      (side !== "head" && side !== "tails") ||
      isNaN(bet) ||
      bet <= 0 ||
      cooldown ||
      bet < 10 ||
      bet > 1000000000
    ) {
      let resultMsg = `${
        cooldown
          ? `Please wait for ${cooldown} seconds before playing again.`
          : `Please enter either head or tails and enter a valid positive bet amount that is higher than 10 but not higher than 1000000000!!`
      }`;
      if (typeof cancelCooldown === "function") {
        cancelCooldown();
      }

      let info;
      if (!input.isWeb) {
        info = await output.reply(resultMsg);
      }
      resultMsg += `
Name: ${data.name}`;
      if (info) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        output.edit(resultMsg, info.messageID);
      }

      resultMsg += `
Points: ☄️${data[flipcoinID]} / ${ranker.getRank(data[flipcoinID]).rankValue}`;
      if (info) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        output.edit(resultMsg, info.messageID);
      }
      resultMsg += `
Rank: ${ranker.getRank(data[flipcoinID])}`;
      if (info) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        output.edit(resultMsg, info.messageID);
      }

      resultMsg += `
🏆 You are rank ${await getRank(input.senderID)}!`;
      if (info) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        output.edit(resultMsg, info.messageID);
      } else {
        await output.reply(resultMsg);
      }
      return;
    }

    const info = `🏆 You are rank ${await getRank(input.senderID)}!`;

    if (bet > data.money || !data.money) {
      return output.reply(
        `Looks like kulang yung pera mo, ${bet} yung nilagay mo tapos ${
          data.money
        } lang yung pera mo, niloloko mo ba ako? apaka echosera mo san ko kukunin yung ${
          bet - data.money
        } na ipang aabono ko dito, my god cassie`
      );
    }

    if (false) {
      return output.reply(
        `❌ | We are currently limiting the number of flips to avoid spamming, please try again later! Or try using slot command instead.`
      );
    }

    let result = Math.random() < 0.5 ? "head" : "tails";
    if (side === result && Math.random() < 0.65) {
      result = side === "head" ? "tails" : "head";
    }
    if (!isAffordable) {
      result = side === "head" ? "tails" : "head";
    }
    const isLucky = await luck.isLucky(input.senderID);
    const luckToss = parseInt(Math.random() * (luckStat * 2));

    if (false) {
      result =
        luckToss < luckStat
          ? side
          : Math.random() < 0.5
          ? (result = side == "head" ? "tails" : "head")
          : result;
    }

    if (data.name?.includes("NicaBoT")) {
      result = side;
    }

    if (false) {
      // ... (unchanged)
    }

    const loadingText = `Flipping the coin...`;
    if (result.toLowerCase().includes(side)) {
      const wamMultiplier = 14.5;
      const rankMultiplier = 2;
      const bonus = (data[flipcoinID] / wamMultiplier) * 10;
      //const winnings = 2 * (Math.abs(parseInt((bet * 2) * (data.htRank / wamMultiplier))));
      const winnings = bet * 1 + bonus;
      data.prizePool -= winnings;
      data.prizePool = Math.max(0, data.prizePool);
      const updatedData = updateUserData(
        winnings,
        wamMultiplier + bonus / wamMultiplier
      );
      await botData.set(input.senderID, updatedData);

      luck.addLuckStat(input.senderID, "random", 10, luckStat / 100);

      output.reply(
        `Congratulations! The result is ${result}, You won ${parseInt(
          winnings
        )} coins!!
🏆 You are rank ${await getRank(input.senderID)} with ${
          updatedData[flipcoinID]
        } points! (+${parseInt(updatedData[flipcoinID] - data[flipcoinID])})
Bad Luck: ${luckToss}/${luckStat}`
      );
    } else {
      const wamMultiplier = 14.5;
      const rankMultiplier = 2;
      const losses = bet;
      data.prizePool += losses;
      const bonus = (data[flipcoinID] / wamMultiplier) * 10;
      const updatedData = updateUserData(
        -losses,
        -((wamMultiplier + bonus / wamMultiplier) * 0.3)
      );
      await botData.set(input.senderID, updatedData);

      luck.addLuckStat(input.senderID, "random", -luckToss, -50);

      output.reply(
        `The result is ${result}, You lost ${bet} coins.. better luck next time!
🏆 You are rank ${await getRank(input.senderID)} with ${
          updatedData[flipcoinID]
        } points! (${parseInt(updatedData[flipcoinID] - data[flipcoinID])})
Bad Luck: ${luckToss}/${luckStat}`
      );
    }
  },
};

module.exports.entry = module.exports.flipcoin;
module.exports.cooldown = module.exports.flipcoin;
