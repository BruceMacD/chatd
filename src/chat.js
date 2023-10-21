const { openFile } = require("./service/file.js");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

async function sendChat(event) {
  event.reply("chat:reply", { success: true, content: "TODO" });
}

async function newChat(event) {
  try {
    // read the document
    const doc = await openFile();
    console.log(doc);

    // split the document date for retrieval
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });
    const split = await splitter.splitDocuments([doc]);
    console.log(split);

    event.reply("chat:load", { success: true, doc });
  } catch (err) {
    console.log(err);
    event.reply("chat:load", { success: false, content: err.message });
  }
}

module.exports = {
  newChat,
  sendChat,
};
