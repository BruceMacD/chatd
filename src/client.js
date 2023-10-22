// This script handles interaction with the user interface, as well as communication
// between the renderer thread (UI) and the worker thread (processing).

const userInput = document.getElementById("user-input-text");
const historyContainer = document.getElementById("history");
const openFileButton = document.getElementById("openFileBtn");

userInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    // Disable input while processing
    userInput.disabled = true;
    userInput.placeholder = "";

    const message = userInput.value;
    userInput.value = "";

    // Create a new text block
    const historyMessage = document.createElement("div");
    historyMessage.className = "history-user-message";
    historyMessage.innerText = message;
    historyContainer.appendChild(historyMessage);

    // Reset responseElem
    responseElem = document.createElement("div");
    responseElem.className = "history-chat-response";

    // Send chat to Ollama server
    window.electronAPI.sendChat(message);
  }
});

let responseElem;

window.electronAPI.onChatReply((event, data) => {
  // Check if the responseElem doesn't exist or isn't in the DOM
  if (!responseElem || !document.body.contains(responseElem)) {
    responseElem = document.createElement("div");
    responseElem.className = "history-chat-response";
    historyContainer.appendChild(responseElem); // Append to history right away
  }

  // Append new content to the persistent responseElem's innerText
  const resp = data.success ? data.content : "Error: " + data.content;
  responseElem.innerText += resp.response; // Append to existing text

  if (resp.done) {
    userInput.disabled = false;
    userInput.focus();
  }
});

openFileButton.addEventListener("click", () => {
  window.electronAPI.newChat();
});

window.electronAPI.onChatLoaded((event, data) => {
  // this callback receives file data in the renderer process
  console.log("Chat loaded:", data);
});
