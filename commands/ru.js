// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "russianroulette",
  author: "frnAlt",
  version: "1.0.0",
  waitingTime: 5,
  description: "Russian Roulette game with betting mechanics!",
  category: "Gambling Games",
  usage: "{prefix}{name} <bet>",
  requirement: "3.0.0",
  icon: "🎲",
  otherNames: ["ru"],
  isGame: true,

  cmdType: "cplx_g",
};

/**
 * @type {CommandStyle}
 */
export const style = {
  title: "Russian Roulette 💥",
  titleFont: "bold",
  contentFont: "fancy",
};

/**
 * @param {CommandContext} ctx
 */
export async function entry({ input, output, money: moneyH }) {
  const bet = parseInt(input.arguments[0], 10);
  if (isNaN(bet) || bet <= 0) {
    return output.reply(
      "❌ | Please enter a valid bet amount as first argument."
    );
  }

  const userInfo = await moneyH.getCache(input.senderID);
  const { money = 0, name } = userInfo;

  if (money < bet) {
    return output.reply("❌ | You don’t have enough money to place this bet.");
  }

  const message = await output.replyStyled(
    `💵 **${name}** has placed a bet of **${bet}$**! Type 'accept' to join the game.`,
    style
  );

  input.setReply(message.messageID, {
    key: "russianroulette",
    author: input.senderID,
    bet,
    mid: message.messageID,
    timestamp: Date.now(),
    // @ts-ignore
    callback: reply,
  });
}

/**
 * @param {CommandContext & { detectID: string; repObj: { author: string; bet: number; mid: string; timestamp: number } }} cctx
 */
export async function reply(cctx) {
  const { api, input, output, repObj: receive, money: moneyH } = cctx;
  if (!receive) return;

  if (input.words[0].toLowerCase() === "accept") {
    const opponentInfo = await moneyH.getItem(input.senderID);
    const { money: opponentMoney = 0 } = opponentInfo;

    if (opponentMoney < receive.bet) {
      return output.replyStyled(
        "❌ | You don't have enough money to accept the bet.",
        style
      );
    }
    const myCache = await moneyH.getCache(input.senderID);
    if (!myCache.name) {
      return output.replyStyled(`Register first.`, style);
    }

    const opponentID = input.senderID;

    api.unsendMessage(receive.mid);
    input.delReply(receive.mid);

    const players = [receive.author, opponentID];
    let currentIndex = 0;

    let gameMessage = await output.replyStyled(
      "‼️ The Russian Roulette game begins! 🎲\n\nHere's how it works:\n- On your turn, type **'shoot'** to take your chance.\n- The game starts safe, but after 6 rounds, there's a 1 in 6 chance the bullet will fire. 💥\n- If the bullet fires, the player loses, and the opponent wins the bet!\n\nGood luck, and may the odds be in your favor! 🎯",
      style
    );
    const bet = receive.bet;
    let sss = 0;
    let nextPlayerr = players.find((i) => i !== players[0]);
    if (!nextPlayerr) {
      return output.wentWrong();
    }

    const playTurn = async ({ input }) => {
      try {
        input.delReply(gameMessage.messageID);
      } catch {}

      input.setReply(gameMessage.messageID, {
        key: "shoot",
        author: nextPlayerr,
        /**
         * @param {CommandContext  & { detectID: string; repObj: { author: string; bet: number; mid: string; timestamp: number } }} ctx
         */
        async callback(ctx) {
          const { output, input: inp, repObj: receive } = ctx;
          const result = inp.words[0];
          sss++;
          const ath = receive.author;
          const currentPlayer = ath;
          const nextPlayer = players.find((i) => i !== ath);
          nextPlayerr = nextPlayer;
          if (!nextPlayer || !ath) {
            return output.wentWrong();
          }
          if (ath !== input.senderID) {
            return output.replyStyled(`It's not your turn!`, style);
          }
          if (result.toLowerCase() === "shoot") {
            const isBullet = Math.random() < 1 / 6 && sss >= 6;
            if (isBullet) {
              let winnerInfo = await moneyH.getCache(nextPlayer);
              let loserInfo = await moneyH.getCache(currentPlayer);

              await output.replyStyled(
                `***BANG!*** 😭💥🔫 ${loserInfo.name} was hit! The bet of ${bet} coins goes to ${winnerInfo.name}! Game ended in ${sss} rounds.`,
                style
              );

              loserInfo = await moneyH.getItem(currentPlayer);

              await moneyH.set(currentPlayer, {
                money: loserInfo.money - bet,
              });
              winnerInfo = await moneyH.getItem(nextPlayer);
              await moneyH.set(nextPlayer, {
                money: winnerInfo.money + bet,
              });
              input.delReply(gameMessage.messageID);

              return;
            } else {
              const aInfo = await moneyH.getCache(nextPlayer);
              gameMessage = await output.replyStyled(
                `${sss}. 😅🔫 ***Click!*** No bullet. It’s now ${aInfo.name}’s turn. 🎲 Type **'shoot'**.`,
                style
              );
              currentIndex = 1 - currentIndex;
              return playTurn(ctx);
            }
          } else {
          }
        },
      });
    };
    playTurn(cctx);
  }
}
