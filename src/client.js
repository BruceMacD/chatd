// This script handles interaction with the user interface, as well as communication
// between the renderer thread (UI) and the worker thread (processing).

const outputElement = document.getElementById("output");
const openFileButton = document.getElementById("openFileBtn");

openFileButton.addEventListener("click", () => {
  window.electronAPI.newChat();
});

window.electronAPI.onChatLoaded((event, data) => {
  // this callback recieves file data in the renderer process
  console.log("Chat loaded:", data);
  if (data.success) {
    outputElement.innerText = data.content;
  } else {
    outputElement.innerText = `Error starting chat: ${data.content}`;
  }
});
