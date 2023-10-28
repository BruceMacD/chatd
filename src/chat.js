const { Document } = require("langchain/document");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { openFile } = require("./service/file.js");
const { embed } = require("./service/embedding.js");
const {
  store,
  search,
  clearVectorStore,
  vectorStoreSize,
} = require("./service/vector.js");
const {
  abort,
  run,
  generate,
  stop,
  serve,
} = require("./service/ollama/ollama.js");

let model = "mistral";

async function setModel(event, msg) {
  model = msg;
}

async function getModel(event) {
  event.reply("model:get", { success: true, content: model });
}

async function runOllamaModel(event, msg) {
  try {
    // send an empty message to the model to load it into memory
    await run(model, (json) => {
      // status will be set if the model is downloading
      if (json.status) {
        if (json.status.includes("downloading")) {
          const percent = Math.round((json.completed / json.total) * 100);
          const content = isNaN(percent)
            ? "Downloading AI model..."
            : `Downloading AI model... ${percent}%`;
          event.reply("ollama:run", { success: true, content: content });
          return;
        }
        if (json.status.includes("verifying")) {
          const content = `Verifying AI model...`;
          event.reply("ollama:run", { success: true, content: content });
          return;
        }
      }
      if (json.done) {
        event.reply("ollama:run", { success: true, content: json });
        return;
      }
      event.reply("ollama:run", { success: true, content: "Initializing..." });
    });
  } catch (err) {
    console.log(err);
    event.reply("ollama:run", { success: false, content: err.message });
  }
}

async function sendChat(event, msg) {
  let prompt = msg;
  if (vectorStoreSize() > 0) {
    const msgEmbeds = await embed([msg]);
    const searchResult = search(msgEmbeds[0].embedding, 3);
    // format the system context search results
    const contextString = searchResult.join("\n\n");
    prompt = `Using the provided context, answer the user question to the best of your ability. You must only use information from the provided context. Combine context into a coherent answer.
If there is nothing in the context relevant to the user question, just say "Hmm, I don't see anything about that in this document." Don't try to make up an answer.
Anything between the following \`context\` html blocks is retrieved from a knowledge bank, not part of the conversation with the user.
<context>
    ${contextString}
<context/>

If there is no relevant information within the context, just say "Hmm, I don't see anything about that in this document." Don't try to make up an answer. Anything between the preceding 'context' html blocks is retrieved from a knowledge bank, not part of the conversation with the user.

Anything between the following \`user\` html blocks is is part of the conversation with the user.
<user>
  ${msg}
</user>`;
  }
  try {
    await generate(model, prompt, (json) => {
      // Reply with the content every time we receive data
      event.reply("chat:reply", { success: true, content: json });
    });
  } catch (err) {
    console.log(err);
    event.reply("chat:reply", { success: false, content: err.message });
  }
}

function stopChat() {
  abort();
}

async function loadDocument(event) {
  try {
    clearVectorStore();

    // read the document
    const doc = await openFile();

    // split the document content for retrieval
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 50,
    });
    const documents = await splitter.splitDocuments([
      new Document({ pageContent: doc.content }),
    ]);
    if (documents.length === 0) {
      return;
    }

    // get the embeddings for the document content
    const texts = documents.map(({ pageContent }) => pageContent);
    const embeddings = await embed(texts);

    // store the embeddings
    store(embeddings);

    event.reply("doc:load", { success: true, content: doc.fileName });
  } catch (err) {
    console.log(err);
    event.reply("doc:load", { success: false, content: err.message });
  }
}

async function serveOllama(event) {
  try {
    const serveType = await serve();
    event.reply("ollama:serve", { success: true, content: serveType });
  } catch (err) {
    event.reply("ollama:serve", { success: false, content: err.message });
  }
}

function stopOllama(event) {
  stop();
}

module.exports = {
  setModel,
  getModel,
  stopChat,
  sendChat,
  loadDocument,
  serveOllama,
  runOllamaModel,
  stopOllama,
};
