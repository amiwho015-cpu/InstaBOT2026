// @ts-check

/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "chuck",
  author: "frnAlt",
  description: "Get a random Chuck Norris joke",
  usage: "{prefix}chuck",
  version: "1.0.1",
  category: "Fun",
  role: 0,
  noPrefix: false,
  requirement: "3.0.0",
  icon: "😄",
};

/**
 * 
 * @param {CommandContext} ctx 
 */
export async function entry({ output }) {
  try {
    const { value } = await output.req(
      "https://api.chucknorris.io/jokes/random"
    );

    const joke = value;

    output.reply(joke);

    output.reaction("😄");
  } catch (error) {
    console.error("Error fetching Chuck Norris joke:", error);
    output.reply(
      "Sorry, I couldn't fetch a Chuck Norris joke at the moment. Please try again later."
    );
  }
}
