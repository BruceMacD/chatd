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

  let content;
  if (filePath.endsWith(".pdf")) {
    return await readPDF(filePath);
  }
  content = await fs.readFile(filePath, "utf-8");
  return {
    // TODO: update this to return content array
    fileName: path.basename(filePath),
    content: content,
  };
}

module.exports = {
  openFile,
};
