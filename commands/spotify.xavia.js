// @ts-check
import axios from "axios";
import fs from "fs";
import path from "path";

const config = {
  name: "spotify",
  aliases: ["sp", "spotifydl"],
  version: "1.0.0",
  description:
    "From xaviateam's video cmd but i turned into spotify/music cmd.",
  usage: "<song name>",
  cooldown: 5,
  icon: "🎵",
  category: "Media",
};

const langData = {
  en_US: {
    "spotify.missingArguement": "Please enter a song name",
    "spotify.noResult": "No songs found",
    "spotify.error": "Failed to process your request",
    "spotify.downloading": "Downloading your song...",
    "spotify.choose": "Choose a track (reply with number):",
  },
};

/**
 * @type {CommandStyle}
 */
const style = {
  titleFont: "bold",
  title: "🎵 Spotify",
  contentFont: "fancy",
};

/**
 *
 * @param {import("@cass-modules/XaviaSupport/XaviaTypes").XaviaCommandContext["message"]} message
 * @param {{ url: string }} track
 * @param {ReturnType<import("@cass-modules/langparser").LangParser["createGetLang"]>} getLang
 */
async function downloadAndSend(message, track, getLang) {
  try {
    await message.reply(getLang("spotify.downloading"));

    const downloadUrl = `https://rapido.zetsu.xyz/api/sp-dl?url=${track.url}`;
    const response = await axios.get(downloadUrl);

    if (!response.data.status || !response.data.trackData?.[0]?.download_url) {
      throw new Error("Invalid download response");
    }

    const trackData = response.data.trackData[0];
    const fileName = `${trackData.name.replace(
      /[^a-z0-9]/gi,
      "_"
    )}_${trackData.artists.replace(/[^a-z0-9]/gi, "_")}.mp3`;
    const filePath = path.join(global.cachePath, fileName);

    const audioResponse = await axios.get(trackData.download_url, {
      responseType: "stream",
    });

    const writer = fs.createWriteStream(filePath);
    audioResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", () => resolve());
      writer.on("error", reject);
    });

    await message.reply({
      attachment: fs.createReadStream(filePath),
    });

    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("Download error:", err);
    message.reply(getLang("spotify.error"));
  }
}

/**
 *
 * @param {{ message: import("@cass-modules/XaviaSupport/XaviaTypes").XaviaCommandContext["message"]; eventData: { tracks?: { url: string }[] }; getLang: ReturnType<import("@cass-modules/langparser").LangParser["createGetLang"]> }} param0
 * @returns
 */
async function chooseTrack({ message, eventData, getLang }) {
  const { tracks } = eventData;
  const userInput = message.body.trim();
  const index = parseInt(userInput) - 1;

  if (isNaN(index) || index < 0 || index >= tracks.length) {
    return message.reply(
      "❌ Invalid selection. Please choose a number from the list."
    );
  }

  await downloadAndSend(message, tracks[index], getLang);
}

/**
 * @type {TOnCallCommand}
 */
async function onCall({ message, args, getLang }) {
  try {
    if (!args[0]) {
      return message.reply(getLang("spotify.missingArguement"));
    }

    const searchTerm = encodeURIComponent(args.join(" "));
    const searchUrl = `https://rapido.zetsu.xyz/api/sp`;

    const searchResponse = await axios.get(searchUrl, {
      params: {
        query: searchTerm,
      },
    });

    const responseData = searchResponse.data;

    /**
     * @type {{ url: string; name: string; artist: string }[]}
     */
    let tracks = [];
    if (responseData && typeof responseData === "object") {
      if (Array.isArray(responseData)) {
        tracks = responseData;
      } else {
        tracks = Object.keys(responseData)
          .filter((key) => !isNaN(Number(key)))
          .map((key) => responseData[key])
          .filter((track) => track && track.name && track.artist && track.url);
      }
    }

    if (!tracks || tracks.length === 0) {
      return message.reply(getLang("spotify.noResult"));
    }

    const limitedTracks = tracks.slice(0, 6);
    const formattedList = limitedTracks
      .map((track, index) => `${index + 1}. ${track.name} - ${track.artist}`)
      .join("\n");

    const sendData = await message.reply({
      body: `${getLang(
        "spotify.choose"
      )}\n\n${formattedList}\n\n💡 Reply with the number of your choice`,
    });

    return sendData.addReplyEvent({
      // @ts-ignore
      callback: chooseTrack,
      tracks: limitedTracks,
    });
  } catch (err) {
    console.error("Search error:", err);
    message.reply(getLang("spotify.error"));
  }
}

export default {
  config,
  langData,
  onCall,
  style,
};
