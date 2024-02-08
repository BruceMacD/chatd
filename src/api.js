const { Worker } = require('worker_threads');
const { dialog } = require("electron");
const path = require("path");
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
  chat,
  stop,
  serve,
} = require("./service/ollama/ollama.js");

let model = "mistral";
let loadingDoc = false;

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
        if (json.status.includes("pulling")) {
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
  const size = await vectorStoreSize();
  if (size > 0) {
    const msgEmbeds = await embed({
      data: [
        {
          section: "",
          content: [msg],
        },
      ],
    });
    const searchResults = await search(msgEmbeds[0].embedding, 20);
    // format the system context search results
    let documentString = searchResults.join("\n\n");
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
  if (loadingDoc) {
    prompt += "Start your response by saying some variation on 'The document is still process, but I will answer to the best of my abilities.'.";
  }
  try {
    debugLog("Sending prompt to Ollama...");
    debugLog(prompt);
    await chat(model, prompt, (json) => {
      // Reply with the content every time we receive data
      event.reply("chat:reply", { success: true, content: json });
    });
  } catch (err) {
    console.log(err);
    event.reply("chat:reply", { success: false, content: err.message });
  }
}

async function stopChat() {
  await abort();
}

async function loadDocument(event) {
  loadingDoc = true;
  try {
    clearVectorStore();
    const filePath = await selectDocumentFile();
    debugLog(`Loading file: ${filePath}`);
    processDocument(filePath, event);
  } catch (err) {
    handleDocumentLoadError(err, event);
  }
}

async function selectDocumentFile() {
  const options = {
    properties: ["openFile"],
    filters: [{ name: "Text Files", extensions: ["docx", "md", "odt", "pdf", "txt", "html", "htm"] }],
  };

  const result = await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) {
    throw new Error("No file selected");
  }

  return result.filePaths[0];
}

function processDocument(filePath, event) {
  const worker = new Worker('./src/service/worker.js');
  worker.postMessage(filePath);

  worker.on('message', async (e) => {
    if (e.success) {
      debugLog("Storing embeddings...");
      await store(e.embeddings);
      debugLog("Embeddings stored");
      event.reply("doc:load", { success: true, content: path.basename(filePath) });
      loadingDoc = false;
    } else {
      event.reply("doc:load", { success: false, content: e.content });
      loadingDoc = false;
    }
  });

  worker.on('error', err => handleDocumentLoadError(err, event));
}

function handleDocumentLoadError(err, event) {
  loadingDoc = false;
  console.log('Error:', err);
  event.reply("doc:load", { success: false, content: err.message });
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
