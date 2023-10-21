/** @var ?AbortController */
let abortController;

/**
 * Cancels the current request.
 *
 * @return {undefined}
 */
const abortGenerateRequest = () => {
  if (abortController) {
    abortController.abort();
  }
};

/**
 * Parses the buffer of a stream response.
 *
 * @param {Uint8Array} value
 *
 * @return {Array} Each item in the array is the contents of a new line.
 */
const parse = (value) => {
  return new TextDecoder().decode(value).trim().split(/\r?\n/);
};

/**
 * Sends a prompt to the LLM, parses the stream and runs a callback.
 *
 * @param {string}   model   One of the installed models to use, e.g: 'llama2'.
 * @param {string}   prompt  The question to ask the LLM.
 * @param {function} fn      The callback to run on each line of the response.
 *
 * @throws {Error|AbortError}
 *
 * @return {Promise<undefined>}
 */
const sendGenerateRequest = async (event, model, prompt, fn) => {
  // Throws an {AbortError} when the request was not finished
  // NOTE: the application is supposed to mitigate this from happening
  abortGenerateRequest();
  abortController = new AbortController();

  // Stringifies the JSON request body
  const body = JSON.stringify({
    model: "mistral",
    prompt: "hello world",
    options: {},
  });

  // Sends the request to the server
  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    body,
    cache: "no-store",
    signal: abortController.signal,
  });

  // The ollama server only sends a status 200 for the response.ok range
  if (response.status !== 200) {
    // Throws the response body of a failed response (without json decoding)
    let err = `HTTP Error (${response.status}): `;
    err += await response.text();

    throw new Error(err);
  }

  const reader = response.body.getReader();

  // Reads the stream until the prompt is fulfilled
  //  or when the stream is closed by the server
  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      // We break before reaching here
      // This means the prompt is not finished (maybe crashed?)
      throw new Error("Failed to fulfill prompt");
    }

    // Processes each new line received from the server
    for (const buffer of parse(value)) {
      // Parses the text buffer into a JSON object
      const json = JSON.parse(buffer);

      console.log(json);

      // Execute the callback and pass the parsed object as an argument
      //   fn(json);

      // The last buffer that we expect
      if (json.done) {
        // Breaks out of the while-loop
        return;
      }
    }
  }
};

module.exports = {
  sendGenerateRequest,
};
