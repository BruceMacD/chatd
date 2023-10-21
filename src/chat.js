const { Document } = require("langchain/document");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { openFile } = require("./service/file.js");
const { embed } = require("./service/embedding.js");
const { store, search } = require("./service/vector.js");

async function sendChat(event) {
  event.reply("chat:reply", { success: true, content: "TODO" });
}

async function newChat(event) {
  try {
    // read the document
    const doc = await openFile();

    // split the document date for retrieval
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });
    const documents = await splitter.splitDocuments([
      new Document({ pageContent: doc }),
    ]);
    if (documents.length === 0) {
      return;
    }

    // get the embeddings for the document content
    const texts = documents.map(({ pageContent }) => pageContent);
    const embeddings = await embed(texts);

    // store the embeddings
    await store(embeddings);

    // TODO: remove this, just for testing
    const queries = await embed(["Conservation"]);
    const results = await search(queries[0].embedding, 2);
    console.log(results);
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
