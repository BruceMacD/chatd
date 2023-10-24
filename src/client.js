// This script handles interaction with the user interface, as well as communication
// between the renderer thread (UI) and the worker thread (processing).

const userInput = document.getElementById("user-input-text");
const historyContainer = document.getElementById("history");
const openFileButton = document.getElementById("file-open");
const openFileErrMsg = document.getElementById("file-open-err-msg");
const initalSpinner = document.getElementById("spinner");
const initialStatusMsg = document.getElementById("status-msg");

let responseElem;

/**
 * This is the initial chain of events that must run on start-up.
 * 1. Start the Ollama server.
 * 2. Run the model. This will load the model into memory so that first chat is not slow.
 *    This step will also download the model if it is not already downloaded.
 * 3. Monitor the run status
 * 4. Load the chat
 */
// 1. Start the Ollama server
window.electronAPI.serveOllama();
// 2. Run the model
window.electronAPI.onOllamaServe((event, data) => {
  if (!data.success) {
    initalSpinner.style.display = "none";
    initialStatusMsg.textContent =
      "Error: " + (data.content || "Unknown error occurred.");
    return;
  }
  if (data.content === "system") {
    // Ollama was already running, and we just connected to it, let the user know
    document.getElementById("status-container").style.display = "flex";
  }
  window.electronAPI.runOllama();
});
// 3. Monitor the run status
window.electronAPI.onOllamaRun((event, data) => {
  if (!data.success) {
    initalSpinner.style.display = "none";
    initialStatusMsg.textContent = "Error: " + data.content;
    return;
  }
  if (data.content.done) {
    // 4. Load the chat
    document.getElementById("initial-view").style.display = "none";
    document.getElementById("chat-view").style.display = "block";
    userInput.focus();
    return;
  }
  initialStatusMsg.textContent = data.content;
});
window.electronAPI.onChatLoaded((event, data) => {
  if (!data.success) {
    openFileErrMsg.innerText = data.content;
    return;
  }
  document.getElementById("initial-view").style.display = "none";
  document.getElementById("chat-view").style.display = "block";
  userInput.focus();
});

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

    // add the element that will display the response
    responseElem = document.createElement("div");
    responseElem.className = "history-chat-response";
    historyContainer.appendChild(responseElem);

    // add loading animation
    const loadingAnimation = document.createElement("div");
    loadingAnimation.className = "dots-loading";
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("div");
      loadingAnimation.appendChild(dot);
    }
    responseElem.appendChild(loadingAnimation);

    // Send chat to Ollama server
    window.electronAPI.sendChat(message);
  }
});

window.electronAPI.onChatReply((event, data) => {
  // clear loading animation
  const loadingDots = responseElem.querySelector(".dots-loading");
  if (loadingDots) {
    loadingDots.remove();
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
  openFileErrMsg.innerText = "";
  window.electronAPI.loadDocument();
});
