// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Here, we use the `contextBridge` API to expose a custom API to the renderer process.
// This API allows the renderer process to invoke the `transformers:run` event in the main process.
contextBridge.exposeInMainWorld("electronAPI", {
  sendChat: (text) => ipcRenderer.send("chat:send", text),
  onChatReply: (callback) => {
    ipcRenderer.on("chat:reply", (event, data) => {
      callback(event, data);
    });
  },
  newChat: () => ipcRenderer.send("chat:new"),
  onChatLoaded: (callback) => {
    ipcRenderer.on("chat:load", (event, data) => {
      callback(event, data);
    });
  },
  loadDocument: () => ipcRenderer.send("doc:load"),
  onDocumentLoaded: (callback) => {
    ipcRenderer.on("doc:load", (event, data) => {
      callback(event, data);
    });
  },
  serveOllama: () => ipcRenderer.send("ollama:serve"),
  onOllamaServe: (callback) => {
    ipcRenderer.on("ollama:serve", (event, data) => {
      callback(event, data);
    });
  },
});
