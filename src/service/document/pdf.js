const path = require("path");
const fs = require("fs").promises;
const pdf = require("pdf-parse");

async function readPDF(filePath) {
  const dataBuffer = await fs.readFile(filePath);
  const data = await pdf(dataBuffer);
  console.log(data);
  const content = cleanPDFData(data);
  console.log(content);
  return {
    // TODO: Look at adding metadata and info here too
    fileName: path.basename(filePath),
    content: content,
  };
}

function cleanPDFData(data) {
  // remove non-meaningful characters
  let cleanedText = data.text.replace(/\n/g, " "); // Replace newlines with spaces
  cleanedText = cleanedText.replace(/\s+/g, " "); // Replace multiple spaces with single space
  cleanedText = cleanedText.replace(/\[\d+\]/g, ""); // Remove citation numbers like [85]
  cleanedText = cleanedText.replace(/https?:\/\/\S+/g, ""); // Remove URLs

  // This regex pattern attempts to split the text into sentences based on periods
  const sentenceRegex = /(?<!\w\.\w)(?<![A-Z][a-z]\.)(?<=[.!?])\s+(?=[A-Z])/g;
  return cleanedText.split(sentenceRegex);
}

module.exports = {
  readPDF,
};
