"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.style = exports.meta = void 0;
exports.entry = entry;
const mathjs_1 = require("mathjs");
exports.meta = {
    name: "calc",
    otherNames: ["calculator"],
    author: "frnAlt",
    version: "1.0.0",
    waitingTime: 5,
    description: "perform simple and scientific calculation ",
    category: "Utilities",
    usage: "{p}calc 20*20",
    params: [true],
    requirement: "3.0.0",
    icon: "💻",
};
exports.style = {
    title: "Calculator 💻",
    titleFont: "bold",
    contentFont: "none",
};
async function entry({ input, output }) {
    try {
        const data = input.arguments;
        const expression = data.join(" ");
        const result = evaluateExpression(expression);
        const replyMessage = {
            body: `**Expression:**\n>> ${expression}\n\n**Evaluation:**\n= ${result}`,
        };
        await output.reply(replyMessage);
    }
    catch (error) {
        console.error("[ERROR]", error);
        output.error(error);
    }
}
function evaluateExpression(expression) {
    try {
        const result = (0, mathjs_1.evaluate)(expression);
        return result;
    }
    catch (error) {
        console.error("[ERROR]", error);
        return "Error: Invalid expression.";
    }
}
