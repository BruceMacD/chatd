const { openFile } = require("./service/file.js");

async function sendChat(event) {
  event.reply("chat:reply", { success: true, content: "TODO" });
}

async function newChat(event) {
  try {
    const content = await openFile();
    console.log(content);
    event.reply("chat:load", { success: true, content });
  } catch (err) {
    console.log(err);
    event.reply("chat:load", { success: false, content: err.message });
  }
}

module.exports = {
  newChat,
  sendChat,
};
