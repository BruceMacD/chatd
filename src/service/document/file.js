const path = require("path");
const fs = require("fs").promises;
const { dialog } = require("electron");
const { readPDF } = require("./pdf.js");

async function openFile() {
  const options = {
    properties: ["openFile"],
    filters: [
      {
        name: "Text Files",
        extensions: ["txt", "md", "json", "csv", "xml", "pdf"],
      },
    ],
  };

  const result = await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    throw new Error("No file selected");
  }

  const filePath = result.filePaths[0];
  if (filePath.endsWith(".pdf")) {
    return await readPDF(filePath);
  }
  rawText = await fs.readFile(filePath, "utf-8");
  return {
    fileName: path.basename(filePath),
    content: cleanGenericData(rawText),
  };
}

function cleanGenericData(data) {
  // chunk the data based on new line characters
  let lines = data.split("\n");
  // further chunk the data based on patterns which indicate a new sentence
  let chunks = [];
  lines.forEach((line) => {
    // Split the content by periods that are followed by a space and a capital letter,
    // a question mark or exclamation mark followed by a space and a capital letter,
    // or the end of the content.
    // This regular expression tries to account for periods used in abbreviations,
    // decimal numbers, etc., by not splitting in those cases.
    const sentenceEndings =
      /(?<!\b(?:Mr|Mrs|Ms|Dr|Sr|Sra|Jr)\.)(?<!\b[A-Za-z]\.)(?<!\w\.\w.)(?<=\.|\?|!)(?=\s+[A-Z]|\s*$)/g;
    chunks = chunks.concat(line.split(sentenceEndings));
  });

  // Filter out any empty strings resulting from the split.
  return chunks.filter((chunk) => chunk !== "");
}

module.exports = {
  openFile,
};
