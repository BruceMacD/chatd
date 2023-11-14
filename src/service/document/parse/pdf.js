const path = require("path");
const fs = require("fs").promises;
const pdf = require("pdf-parse");
const { splitText } = require("./clean");

async function parsePdf(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdf(dataBuffer);

  // TODO: add metadata and info here too as keys in map (see md.js)

  return {
    // TODO: Look at adding section metadata and info here too
    fileName: path.basename(filePath),
    data: [
      {
        section: "",
        content: splitText(data.text),
      },
    ],
  };
}

module.exports = {
  parsePdf,
};
