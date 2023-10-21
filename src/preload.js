// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Here, we use the `contextBridge` API to expose a custom API to the renderer process.
// This API allows the renderer process to invoke the `transformers:run` event in the main process.
contextBridge.exposeInMainWorld("electronAPI", {
  embed: (text) => ipcRenderer.invoke("transformers:run", text),
  sendGenerateRequest: (text) => ipcRenderer.invoke("ollama:generate", text),
  invokeFilePicker: () => ipcRenderer.send("file:open"),
  onFileDataReceived: (callback) => {
    ipcRenderer.on("file:data", (event, data) => {
      // when receiving the event, call the callback with the data in the renderer process
      callback(event, data);
    });
  },
});
