// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Here, we use the `contextBridge` API to expose a custom API to the renderer process.
// This API allows the renderer process to invoke events in the main process which interact with the operating system.
contextBridge.exposeInMainWorld("electronAPI", {
  sendChat: (text) => ipcRenderer.send("chat:send", text),
  onChatReply: (callback) => {
    ipcRenderer.on("chat:reply", (event, data) => {
      callback(event, data);
    });
  },
  stopChat: () => ipcRenderer.send("chat:stop"),
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
  runOllama: () => ipcRenderer.send("ollama:run"),
  onOllamaRun: (callback) => {
    ipcRenderer.on("ollama:run", (event, data) => {
      callback(event, data);
    });
  },
  getModel: () => ipcRenderer.send("model:get"),
  onModelGet: (callback) => {
    ipcRenderer.on("model:get", (event, data) => {
      callback(event, data);
    });
  },
  setModel: (model) => ipcRenderer.send("model:set", model),
});
