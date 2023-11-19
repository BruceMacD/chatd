const path = require("path");
const fs = require("fs").promises;
const { dialog } = require("electron");
const { parsePdf, parseMd, parseOdt, parseTxt, parseDocx } = require("./parse");

async function openFile() {
  const options = {
    properties: ["openFile"],
    filters: [
      {
        name: "Text Files",
        extensions: ["docx", "md", "odt", "pdf", "txt"],
      },
    ],
  };

  const result = await dialog.showOpenDialog(options);

  if (result.canceled || result.filePaths.length === 0) {
    throw new Error("No file selected");
  }

  const filePath = result.filePaths[0];
  const fileExtension = path.extname(filePath).toLowerCase();

  switch (fileExtension) {
    case ".docx":
      const docx = await fs.readFile(filePath);
      return {
        fileName: path.basename(filePath),
        data: await parseDocx(docx),
      };
    case ".md":
      let markdown = await fs.readFile(filePath, "utf-8");
      return {
        fileName: path.basename(filePath),
        data: parseMd(markdown),
      };
    case ".odt":
      return {
        fileName: path.basename(filePath),
        data: await parseOdt(filePath),
      };
    case ".pdf":
      return await parsePdf(filePath);
    default:
      // just try to parse it as a text file
      let rawText = await fs.readFile(filePath, "utf-8");
      return {
        fileName: path.basename(filePath),
        data: parseTxt(rawText),
      };
  }
}

module.exports = {
  openFile,
};
