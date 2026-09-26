"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.style = exports.meta = void 0;
exports.entry = entry;
exports.meta = {
    name: "movies",
    author: "frnAlt",
    noPrefix: false,
    version: "1.0.1",
    description: "Search movie details using OMDB",
    usage: "movies <movie title>",
    role: 0,
    requirement: "3.0.0",
    icon: "🎬",
    category: "Media",
    otherNames: ["mov"],
};
exports.style = {
    title: "OMDB Movie Search 🎥",
    titleFont: "bold",
    contentFont: "fancy",
};
async function entry({ output, args }) {
    const query = args.join(" ");
    if (!query) {
        return output.reply("❌ | Please enter a movie title to search.");
    }
    const apiKey = "ec7115";
    const url = "http://www.omdbapi.com/";
    try {
        const movie = await output.req(url, {
            t: query,
            plot: "full",
            apiKey,
        });
        if (movie.Response === "False") {
            return output.reply(`❌ | Movie not found: ${query}`);
        }
        const msg = `🎬 ***${movie.Title}*** (${movie.Year})
⭐ **IMDB**: ${movie.imdbRating}
📂 **Genre**: ${movie.Genre}
🎭 **Actors**: ${movie.Actors}
📝 **Plot**: ${movie.Plot}
🌐 **Language**: ${movie.Language}
🎬 **Director**: ${movie.Director}
⌛ **Runtime**: ${movie.Runtime}`;
        if (movie.Poster !== "N/A") {
            return output.attach(msg, movie.Poster);
        }
        return output.reply(msg);
    }
    catch (err) {
        return output.reply("❌ | Failed to fetch movie data. Please try again.");
    }
}
