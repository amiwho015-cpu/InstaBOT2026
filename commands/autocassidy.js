// @ts-check
import axios from "axios";

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "autocass",
  description: "Basta auto na cass.",
  author: "frnAlt",
  version: "1.0.0",
  usage: "{prefix}{name}",
  category: "Utilities",
  role: 1,
  noPrefix: false,
  waitingTime: 10,
  requirement: "3.0.0",
  icon: "🎮",
  noLevelUI: true,
  noWeb: true,
  cmdType: "etc_xcmd",
  isGame: true,
};

const url = process.env.AUTOCASS ?? "https://cassidybot.onrender.com";
const pref = "!";

const dbkey = "autocass";

/**
 *
 * @param {CommandContext} ctx
 */
export async function entry({ input, args, output, threadsDB }) {
  const isEna = (await threadsDB.queryItem(input.threadID, dbkey))?.[dbkey];
  let choice =
    args[0] === "on" ? true : args[0] === "off" ? false : isEna ? !isEna : true;
  await threadsDB.setItem(input.threadID, {
    [dbkey]: choice,
  });

  return output.reply(`✅ ${choice ? "Enabled" : "Disabled"} successfully!`);
}

/**
 *
 * @param {CommandContext} ctx
 */
export async function event({ input, event, output, threadsDB }) {
  if (!url) return;
  if (!["message", "message_reply"].includes(input.type)) {
    return;
  }
  if (!(await threadsDB.getCache(input.threadID))?.[dbkey]) {
    return;
  }
  if (!input.body.startsWith(pref)) {
    return;
  }

  /**
   *
   * @param {Partial<typeof output>} output
   * @param {Partial<typeof input>} ev
   */
  async function fetcher(output, ev, messageReply) {
    const res = await axios.get(`${url}/postWReply`, {
      params: {
        ...ev,
        ...(messageReply
          ? {
              messageReply,
            }
          : {}),
        prefixes: [pref],
        password: null,
        originalEvent: null,
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Referer: url,
        Connection: "keep-alive",
        DNT: "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    const { status: estatus, result } = res.data;

    if (estatus === "fail") {
      return null;
    }
    const info = await output.reply({ body: result.body, rawBody: true });
    global.Cassidy.replies[info.messageID] = {
      repObj: {
        callback(ctx) {
          return fetcher(ctx.output, ctx.event, { ...result, body: "" });
        },
      },
      commandKey: meta.name,
      detectID: info.messageID,
    };
  }

  return fetcher(output, event);
}
