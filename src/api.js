const { openFile } = require("./service/document/reader.js");
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

function debugLog(msg) {
  if (global.debug) {
    console.log(msg);
  }
}

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
    const msgEmbeds = await embed({
      data: [
        {
          section: "",
          content: [msg],
        },
      ],
    });
    const searchResult = search(msgEmbeds[0].embedding, 20);
    // format the system context search results
    let documentString = searchResult.join("\n\n");
    // Ensure the contextString does not exceed 500 characters
    if (documentString.length > 500) {
      documentString = documentString.substring(0, 497) + "...";
    }
    prompt = `Using the provided document, answer the user question to the best of your ability. You must try to use information from the provided document. Combine information in the document into a coherent answer.
If there is nothing in the document relevant to the user question, say "Hmm, I don't see anything about that in this document." before providing any other information you know.
Anything between the following \`document\` html blocks is retrieved from a knowledge bank, not part of the conversation with the user.
<document>
    ${documentString}
<document/>

If there is no relevant information within the document, say "Hmm, I don't see anything about that in this document." before providing any other information you know. Anything between the preceding 'document' html blocks is retrieved from a knowledge bank, not part of the conversation with the user.

Anything between the following \`user\` html blocks is is part of the conversation with the user.
<user>
  ${msg}
</user>
`;
  }
  try {
    debugLog("Sending prompt to Ollama...");
    debugLog(prompt);
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
    if (doc.data.length === 0) {
      return;
    }

    // get the embeddings for the document content
    if (doc && doc.data) {
      debugLog("Parsed content...");
      for (const section of doc.data) {
        debugLog(section.section);
        debugLog(section.content);
      }
    }
    const embeddings = await embed(doc);

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
