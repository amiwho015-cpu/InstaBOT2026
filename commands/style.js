// @ts-check
/**
 * @type {CommandMeta}
 */
export const meta = {
  name: "design",
  description: "Create your own command design!",
  otherNames: ["style", "des", "styler"],
  version: "1.0.8",
  usage: "{prefix}{name} <title> | <content>",
  category: "Utilities",
  author: "frnAlt",
  permissions: [0],
  noPrefix: false,
  requirement: "3.0.0",
  icon: "🎨",
};

export const style = {
  title: "Design 🎨",
  contentFont: "fancy",
  titleFont: "bold",
};

/**
 *
 * @param {CommandContext} param0
 * @returns
 */
export async function entry({ input, output, prefix }) {
  const [title, ...content_] = input.splitArgs("|");
  const content = content_.join(" | ");
  if (!title || !content) {
    return output.reply(
      `Usage: ${prefix}style <title> | <content>\n\nThe ** symbol is allowed to make bold texts, use \\| for | symbols that is not meant to split.`
    );
  }
  if (content === "code") {
    const styled = new output.Styled({
      title: "Code",
      titleFont: "bold",
      contentFont: "none",
    });
    return styled.reply(`export const style = {
  title: ${JSON.stringify(title)},
  titleFont: "bold",
  contentFont: "fancy",
};`);
  }
  const styled = new output.Styled({
    title,
    contentFont: "fancy",
    titleFont: "bold",
  });
  await styled.reply(content);
}
