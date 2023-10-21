const { dialog } = require("electron");
const fs = require("fs");

async function openFile(event) {
  const options = {
    properties: ["openFile"],
    filters: [
      { name: "Text Files", extensions: ["txt", "md", "json", "csv", "xml"] },
    ],
  };

  dialog.showOpenDialog(options).then((result) => {
    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) {
          event.reply("file:data", { success: false, content: err.message });
        } else {
          event.reply("file:data", { success: true, content: data });
        }
      });
    }
  });
}

module.exports = {
  openFile,
};
