const { Document } = require("langchain/document");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { openFile } = require("./service/file.js");
const { embed } = require("./service/embedding.js");
const { store, search } = require("./service/vector.js");
const { generate } = require("./service/ollama.js");

async function sendChat(event, msg) {
  try {
    // TODO: add embeddings to the prompt
    // const embeddings = await embed([msg]);
    // const results = await search(embeddings[0].embedding, 5);

    await generate("mistral", msg, (json) => {
      // Reply with the content every time we receive data
      event.reply("chat:reply", { success: true, content: json });
    });
  } catch (err) {
    console.log(err);
    event.reply("chat:reply", { success: false, content: err.message });
  }
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

    event.reply("chat:load", { success: true, content: "success" });
  } catch (err) {
    console.log(err);
    event.reply("chat:load", { success: false, content: err.message });
  }
}

module.exports = {
  newChat,
  sendChat,
};
