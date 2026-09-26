const { Jimp } = require("jimp");
const { Readable } = require("stream");

module.exports = {
  config: {
    name: "fak",
    aliases: ["fuck"],
    version: "1.1",
    author: "frnAlt",
    cooldown: 20,
    role: 2,
    shortDescription: "NSFW fun command",
    longDescription: "Generates humorous card with mentioned user",
    category: "nsfw",
    guide: "{pn} @tag"
  },

  onStart: async function ({ message, event, args, usersData }) {
    const mention = Object.keys(event.mentions || {});
    if (mention.length === 0) {
      return message.reply("Please mention someone!");
    }
    const one = mention.length === 1 ? event.senderID : mention[1];
    const two = mention[0];

    try {
      const token = "6628568379%7Cc1e620fa708a1d5696fb991c1bde5662";
      const avoneUrl = `https://graph.facebook.com/${one}/picture?width=512&height=512&access_token=${token}`;
      const avtwoUrl = `https://graph.facebook.com/${two}/picture?width=512&height=512&access_token=${token}`;

      const [avone, avtwo, img] = await Promise.all([
        Jimp.read(avoneUrl).catch(() => null),
        Jimp.read(avtwoUrl).catch(() => null),
        Jimp.read("https://i.ibb.co/YpR7Bpv/image.jpg").catch(() => null)
      ]);

      if (!img) {
        return message.reply("Failed to load background template.");
      }

      img.resize({ w: 639, h: 480 });
      if (avone) {
        avone.resize({ w: 90, h: 90 }).circle();
        img.composite(avone, 23, 320);
      }
      if (avtwo) {
        avtwo.resize({ w: 100, h: 100 }).circle();
        img.composite(avtwo, 110, 60);
      }

      const buf = await img.getBuffer("image/png");
      const stream = Readable.from(buf);
      stream.path = "fucked.png";

      message.reply({
        body: mention.length === 1 ? "「 Harder daddy 🥵💦 」" : "",
        attachment: stream
      });
    } catch (error) {
      console.error("FAK error:", error);
      message.reply("Failed to generate the image.");
    }
  }
};