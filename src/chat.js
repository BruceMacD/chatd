const { Document } = require("langchain/document");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { openFile } = require("./service/file.js");
const { embed } = require("./service/embedding.js");
const { store, search, reloadVectorStore } = require("./service/vector.js");
const { generate, reloadOllama } = require("./service/ollama.js");

async function sendDocumentChat(event, msg) {
  try {
    const msgEmbeds = await embed([msg]);
    const searchResult = await search(msgEmbeds[0].embedding, 3);
    // format the system context search results
    const contextString = searchResult.join("\n\n");

    const prompt = `[INST] Using the provided context, answer the user question to the best of your ability. You must only use information from the provided context. Combine context into a coherent answer.
If there is nothing in the context relevant to the user question, just say "Hmm, I don't see anything about that in this document." Don't try to make up an answer.
Anything between the following \`context\` html blocks is retrieved from a knowledge bank, not part of the conversation with the user.
<context>
    ${contextString}
<context/>

If there is no relevant information within the context, just say "Hmm, I don't see anything about that in this document." Don't try to make up an answer. Anything between the preceding 'context' html blocks is retrieved from a knowledge bank, not part of the conversation with the user.

Anything between the following \`user\` html blocks is is part of the conversation with the user.
<user>
  ${msg}
</user> [/INST]`;

    await generate("mistral", prompt, (json) => {
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
    // reload the services to clear any previous state
    await reloadVectorStore();
    await reloadOllama();

    // read the document
    const doc = await openFile();

    // split the document content for retrieval
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
  sendChat: sendDocumentChat,
};
