// This script handles interaction with the user interface, as well as communication
// between the renderer thread (UI) and the worker thread (processing).

const userInput = document.getElementById("user-input-text");
const historyContainer = document.getElementById("history");
// const outputElement = document.getElementById("output");
const openFileButton = document.getElementById("openFileBtn");

userInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    // Disable input while processing
    userInput.disabled = true;
    userInput.placeholder = "";

    // Create a new text block
    const historyMessage = document.createElement("div");
    historyMessage.className = "history-user-message";
    historyMessage.innerText = userInput.value;
    historyContainer.appendChild(historyMessage);
    // Clear current input
    userInput.value = "";

    // Chat processing goes here
    // window.electronAPI.processChat(historyMessage.innerText);
    const response = document.createElement("div");
    response.className = "history-chat-response";
    response.innerText = "hi";
    historyContainer.appendChild(response);

    userInput.disabled = false;
    userInput.focus();
  }
});

openFileButton.addEventListener("click", () => {
  window.electronAPI.newChat();
});

// window.electronAPI.onChatLoaded((event, data) => {
//   // this callback recieves file data in the renderer process
//   console.log("Chat loaded:", data);
//   if (data.success) {
//     outputElement.innerText = data.content;
//   } else {
//     outputElement.innerText = `Error starting chat: ${data.content}`;
//   }
// });
