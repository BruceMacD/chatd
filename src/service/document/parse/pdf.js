const path = require("path");
const fs = require("fs").promises;
const pdf2md = require('@opendocsg/pdf2md');
const { parseMd } = require("./md");

async function parsePdf(filePath) {
  const pdfBuffer = await fs.readFile(filePath);
  const md = await pdf2md(pdfBuffer);
  return {
    fileName: path.basename(filePath),
    data: parseMd(md),
  };
}

module.exports = {
  parsePdf,
};
