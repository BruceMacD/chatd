// This script handles interaction with the user interface, as well as communication
// between the renderer thread (UI) and the worker thread (processing).

const userInput = document.getElementById("user-input-text");
const historyContainer = document.getElementById("history");
const openFileButton = document.getElementById("file-open");
const fileButtonText = document.getElementById("file-button-text");
const initalSpinner = document.getElementById("spinner");
const statusMsg = document.getElementById("status-msg");
const settingsIcon = document.getElementById("settings-icon");
const statusContainer = document.getElementById("status-container");
const stopRequestContainer = document.getElementById("stop-request-container");
const stopRequestBtn = document.getElementById("stop-request-btn");
const chatView = document.getElementById("chat-view");
const settingsView = document.getElementById("settings-view");
const settingsCancelBtn = document.getElementById("cancel-btn");
const settingsSaveBtn = document.getElementById("save-btn");
const modelSelectInput = document.getElementById("model-select");

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
    statusMsg.textContent =
      "Error: " + (data.content || "Unknown error occurred.");
    return;
  }
  if (data.content === "system") {
    // Ollama was already running, and we just connected to it, let the user know
    document.getElementById("status-container").style.display = "flex";
    settingsIcon.style.display = "inline-block";
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
    statusContainer.style.display = "none"; // once the first chat is sent, hide the initial status message
    settingsIcon.style.display = "none"; // once the first chat is sent, hide the settings icon
    stopRequestContainer.style.display = "flex";
    // Disable input while processing
    userInput.disabled = true;
    userInput.placeholder = "";

    const message = userInput.value;
    userInput.value = "";
    userInput.style.height = ""; // reset the height of the input box

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
    chatView.scrollTop = chatView.scrollHeight;
  }
});

// Receive chat response from Ollama server
window.electronAPI.onChatReply((event, data) => {
  // clear loading animation
  const loadingDots = responseElem.querySelector(".dots-loading");
  if (loadingDots) {
    loadingDots.remove();
  }

  if (!data.success) {
    if (data.content !== "The operation was aborted.") {
      responseElem.innerText = "Error: " + data.content;
    }
    stopRequestContainer.style.display = "none";
    userInput.disabled = false;
    userInput.focus();
    return;
  }

  if (data.content.response) {
    responseElem.innerText += data.content.response; // Append to existing text
  }

  if (data.content.done) {
    stopRequestContainer.style.display = "none";
    userInput.disabled = false;
    userInput.focus();
  }

  // Check if the user is already at the bottom of the content
  const isAtBottom =
    chatView.scrollTop + chatView.clientHeight >= chatView.scrollHeight - 50; // 10 is a tolerance value

  // If they're at the bottom, scroll to the new bottom
  if (isAtBottom) {
    chatView.scrollTop = chatView.scrollHeight;
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

settingsIcon.addEventListener("click", () => {
  // Send a request to get the current model, settings view will be displayed when the response is received
  modelSelectInput.value = window.electronAPI.getModel();
});

// A modelGet response means the settings view should be displayed
window.electronAPI.onModelGet((event, data) => {
  if (!data.success) {
    console.log("Error getting model: " + data.content);
  }
  modelSelectInput.value = data.content;
  chatView.style.display = "none";
  settingsView.style.display = "flex";
});

settingsCancelBtn.addEventListener("click", () => {
  chatView.style.display = "block";
  settingsView.style.display = "none";
});

settingsSaveBtn.addEventListener("click", () => {
  window.electronAPI.setModel(modelSelectInput.value);
  chatView.style.display = "block";
  settingsView.style.display = "none";
});

// Auto-resize the input box to fit the text
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});
