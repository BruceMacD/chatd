// This script handles interaction with the user interface, as well as communication
// between the renderer thread (UI) and the worker thread (processing).

const inputElement = document.getElementById("text");
const outputElement = document.getElementById("output");
const generateButton = document.getElementById("generateBtn");

const handleResult = (data) => {
  console.log(data);
};

// 1. Send input data to the worker thread when it changes.
inputElement.addEventListener("input", async (event) => {
  // 2. Await the result from the worker thread.
  const result = await window.electronAPI.embed(event.target.value);

  // 3. Update the UI.
  outputElement.innerText = JSON.stringify(result, null, 2);
});

generateButton.addEventListener("click", async () => {
  try {
    const result = await window.electronAPI.sendGenerateRequest(
      "mistral",
      "hello world",
      handleResult
    );
  } catch (error) {
    // Handle any errors, maybe display them in the UI.
    console.error("Error:", error);
    outputElement.innerText = `Error: ${error.message}`;
  }
});
