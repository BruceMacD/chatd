// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Here, we use the `contextBridge` API to expose a custom API to the renderer process.
// This API allows the renderer process to invoke the `transformers:run` event in the main process.
contextBridge.exposeInMainWorld("electronAPI", {
  sendChat: (text) => ipcRenderer.invoke("chat:send", text),
  newChat: () => ipcRenderer.send("chat:new"),
  onChatLoaded: (callback) => {
    ipcRenderer.on("chat:load", (event, data) => {
      // when receiving the event, call the callback with the data in the renderer process
      callback(event, data);
    });
  },
});
