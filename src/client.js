// This script handles interaction with the user interface, as well as communication
// between the renderer thread (UI) and the worker thread (processing).

const userInput = document.getElementById("user-input-text");
const historyContainer = document.getElementById("history");
const openFileButton = document.getElementById("file-open");
const fileButtonText = document.getElementById("file-button-text");
const initalSpinner = document.getElementById("spinner");
const statusMsg = document.getElementById("status-msg");
const statusContainer = document.getElementById("status-container");
const stopRequestContainer = document.getElementById("stop-request-container");
const stopRequestBtn = document.getElementById("stop-request-btn");
const chatView = document.getElementById("chat-view");

let responseElem;
let firstChatResponse = true; // track the first response to scroll to the bottom

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
    statusMsg.textContent =
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
    statusMsg.textContent = "Error: " + data.content;
    return;
  }
  if (data.content.done) {
    // 4. Load the chat
    document.getElementById("initial-view").style.display = "none";
    chatView.style.display = "block";
    userInput.focus();
    return;
  }
  statusMsg.textContent = data.content;
});

// Update the display when a document is loaded
window.electronAPI.onDocumentLoaded((event, data) => {
  // change the button to say the name of the document
  document.getElementById("file-spinner").style.display = "none";
  fileButtonText.innerText = data.content;
  // add an x button to remove the document
  userInput.focus();
});

// Send chat on enter key
userInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    firstChatResponse = true;
    statusContainer.style.display = "none"; // once the first chat is sent, hide the initial status message
    stopRequestContainer.style.display = "flex";
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

// Receive chat response from Ollama server
window.electronAPI.onChatReply((event, data) => {
  // clear loading animation
  const loadingDots = responseElem.querySelector(".dots-loading");
  if (loadingDots) {
    loadingDots.remove();
  }

  // Append new content to the persistent responseElem's innerText
  const resp = data.success ? data.content : "Error: " + data.content;
  if (resp.response) {
    responseElem.innerText += resp.response; // Append to existing text
  }

  if (resp.done) {
    stopRequestContainer.style.display = "none";
    userInput.disabled = false;
    userInput.focus();
  }

  // Check if the user is already at the bottom of the content
  const isAtBottom =
    chatView.scrollTop + chatView.clientHeight >= chatView.scrollHeight - 50; // 10 is a tolerance value

  // If they're at the bottom, scroll to the new bottom
  if (isAtBottom || firstChatResponse) {
    chatView.scrollTop = chatView.scrollHeight;
    firstChatResponse = false;
  }
});

// Open file dialog
openFileButton.addEventListener("click", () => {
  document.getElementById("file-open-icon").style.display = "none";
  document.getElementById("file-spinner").style.display = "inline-block";
  fileButtonText.innerText = "Loading...";
  window.electronAPI.loadDocument();
});

stopRequestBtn.addEventListener("click", () => {
  window.electronAPI.stopChat();
  stopRequestContainer.style.display = "none";
  userInput.disabled = false;
  userInput.focus();
});
