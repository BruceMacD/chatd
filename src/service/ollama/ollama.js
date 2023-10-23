const path = require("path");
const { exec } = require("child_process");

var OllamaRunType = {
  SYSTEM: "system",
  PACKAGED: "packaged",
};

class Ollama {
  static instance = null;
  static context = null; // stores the chat history for the current session

  constructor() {
    this.abortController = null;
    this.host = "http://127.0.0.1:11434";
  }

  static getOllama() {
    if (this.instance === null) {
      this.instance = new this();
    }
    return this.instance;
  }

  /**
   * Run Ollama to serve an LLM.
   *
   * @throws {Error}
   * @return {OllamaStatus} The status of the Ollama server.
   */
  async run() {
    try {
      // see if ollama is already running
      await this.ping();
      return OllamaRunType.SYSTEM;
    } catch (err) {
      // this is fine, we just need to start ollama
      console.log(err);
    }
    try {
      // See if 'ollama run' command is available on the system
      return await this.runSystem();
    } catch (err) {
      // ollama is not installed, run the binary directly
      console.log(`exec ollama: ${err}`);
    }

    // start the ollama packaged ollama server
    try {
      let exe = "";
      switch (process.platform) {
        case "win32":
          exe = "ollama.exe";
          break;
        case "darwin":
          exe = "ollama-darwin";
          break;
        case "linux":
          exe = "ollama-linux-" + process.arch;
          break;
        default:
          throw new Error("Unsupported platform:", process.platform);
      }
      const pathToBinary = path.join(__dirname, "runners", exe);
      exec(`${pathToBinary} serve`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing ollama-darwin: ${error}`);
          return;
        }
        console.log(stdout);
        if (stderr) {
          console.warn(`Warnings from ollama-darwin: ${stderr}`);
        }

        return OllamaRunType.PACKAGED;
      });
    } catch (err) {
      throw new Error(`Failed to start ollama server: ${err}`);
    }
  }

  // runs ollama if it is already installed
  async runSystem() {
    return new Promise((resolve, reject) => {
      exec("ollama run mistral", (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`exec error: ${error}`));
          return;
        }

        if (stderr) {
          reject(new Error(`ollama stderr: ${stderr}`));
          return;
        }

        console.log(`stdout: ${stdout}`);
        if (stdout.includes("Error")) {
          reject(new Error(`ollama stdout: ${stdout}`));
          return;
        }

        resolve(OllamaRunType.SYSTEM);
      });
    });
  }

  static reload() {
    this.instance = new this();
  }

  /**
   * Cancels the current request.
   *
   * @return {undefined}
   */
  abortGenerateRequest() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Parses the buffer of a stream response.
   *
   * @param {Uint8Array} value
   *
   * @return {Array} Each item in the array is the contents of a new line.
   */
  parse(value) {
    return new TextDecoder().decode(value).trim().split(/\r?\n/);
  }

  /**
   * Sends a ping to the LLM to see if it is running.
   */
  async ping() {
    const response = await fetch(this.host, {
      method: "GET",
      cache: "no-store",
    });

    if (response.status !== 200) {
      throw new Error("Failed to ping Ollama server");
    }

    console.log("Ollama server is running");

    return true;
  }

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
  async generate(model, prompt, fn) {
    // Throws an {AbortError} when the request was not finished
    // NOTE: the application is supposed to mitigate this from happening
    this.abortGenerateRequest();
    this.abortController = new AbortController();

    // Stringifies the JSON request body
    const body = JSON.stringify({
      model: model,
      template: prompt,
      context: this.context,
      options: {},
    });

    // Sends the request to the server
    const response = await fetch(this.host + "/api/generate", {
      method: "POST",
      body,
      cache: "no-store",
      signal: this.abortController.signal,
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

      // Parse responses are they are received from the Ollama server
      for (const buffer of this.parse(value)) {
        const json = JSON.parse(buffer);

        fn(json);

        if (json.done) {
          this.context = json.context;
          return;
        }
      }
    }
  }
}

async function generate(model, prompt, fn) {
  const ollama = Ollama.getOllama();
  return await ollama.generate(model, prompt, fn);
}

async function ping() {
  const ollama = Ollama.getOllama();
  return await ollama.ping();
}

function reloadOllama() {
  return Ollama.reload();
}

function runOllama() {
  const ollama = Ollama.getOllama();
  return ollama.run();
}

module.exports = {
  generate,
  ping,
  reloadOllama,
  runOllama,
};
