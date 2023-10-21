const { dialog } = require("electron");
const fs = require("fs");
const pdf = require("pdf-parse");

async function openFile(event) {
  const options = {
    properties: ["openFile"],
    filters: [
      {
        name: "Text Files",
        extensions: ["txt", "md", "json", "csv", "xml", "pdf"],
      },
    ],
  };

  dialog.showOpenDialog(options).then(async (result) => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      if (filePath.endsWith(".pdf")) {
        try {
          let dataBuffer = fs.readFileSync(filePath);
          let data = await pdf(dataBuffer);
          event.reply("file:data", { success: true, content: data.text });
        } catch (err) {
          event.reply("file:data", { success: false, content: err.message });
        }
      } else {
        fs.readFile(filePath, "utf-8", (err, data) => {
          if (err) {
            event.reply("file:data", { success: false, content: err.message });
          } else {
            event.reply("file:data", { success: true, content: data });
          }
        });
      }
    }
  });
}

module.exports = {
  openFile,
};
