const path = require("path");
const { exec } = require("child_process");

var OllamaServeType = {
  SYSTEM: "system",
  PACKAGED: "packaged",
};

class Ollama {
  static instance = null;
  static context = null; // stores the chat history for the current session

  constructor() {
    this.childProcess = null;
    this.host = "http://127.0.0.1:11434";
  }

  static getOllama() {
    if (this.instance === null) {
      this.instance = new this();
    }
    return this.instance;
  }

  /**
   * Start Ollama to serve an LLM.
   *
   * @throws {Error}
   * @return {OllamaStatus} The status of the Ollama server.
   */
  async serve() {
    try {
      // see if ollama is already running
      await this.ping();
      return OllamaServeType.SYSTEM;
    } catch (err) {
      // this is fine, we just need to start ollama
      console.log(err);
    }

    try {
      // See if 'ollama serve' command is available on the system
      await this.exec("ollama serve");
      return OllamaServeType.SYSTEM;
    } catch (err) {
      // ollama is not installed, run the binary directly
      console.log(`exec ollama: ${err}`);
    }

    // start the packaged ollama server
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
        reject(new Error(`Unsupported platform: ${process.platform}`));
        return;
    }

    const pathToBinary = path.join(__dirname, "runners", exe);
    try {
      await this.exec(pathToBinary + " serve");
      return OllamaServeType.PACKAGED;
    } catch (err) {
      throw new Error(`Failed to start Ollama: ${err}`);
    }
  }

  // exec the specified command, and wait for a response
  async exec(command) {
    return new Promise((resolve, reject) => {
      this.childProcess = exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(`exec error: ${error}`);
          return;
        }

        if (stderr) {
          reject(`ollama stderr: ${stderr}`);
          return;
        }

        reject(`ollama stdout: ${stdout}`);
      });

      // Once the process is started, try to ping Ollama server.
      this.waitForPing()
        .then(() => {
          resolve();
        })
        .catch((pingError) => {
          if (this.childProcess && !this.childProcess.killed) {
            this.childProcess.kill();
          }
          reject(pingError);
        });
    });
  }

  async pull(model, fn) {
    const body = JSON.stringify({
      name: model,
    });

    const response = await fetch(this.host + "/api/pull", {
      method: "POST",
      body,
      cache: "no-store",
    });

    if (response.status !== 200) {
      let err = `HTTP Error (${response.status}): `;
      err += await response.text();

      throw new Error(err);
    }

    const reader = response.body.getReader();

    // Reads the stream until the pull is complete
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

        if (json.status == "success") {
          // done
          return;
        }
      }
    }
  }

  async run(model, fn) {
    await this.pull(model, fn);
    await this.generate(model, "", fn);
    this.context = null;
  }

  stop() {
    if (this.childProcess) {
      this.childProcess.kill();
      this.childProcess = null;
    }
  }

  clearHistory() {
    this.context = null;
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
   * Waits for the Ollama server to respond to ping.
   * @param {number} delay Time in ms to wait between retries.
   * @param {number} retries Maximum number of retries.
   * @return {Promise}
   */
  async waitForPing(delay = 1000, retries = 5) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.ping();
        return;
      } catch (error) {
        console.log("Waiting for Ollama server...");
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries reached. Ollama server didn't respond.");
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
    const body = JSON.stringify({
      model: model,
      prompt: prompt,
      context: this.context,
    });

    const response = await fetch(this.host + "/api/generate", {
      method: "POST",
      body,
      cache: "no-store",
    });

    if (response.status !== 200) {
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

async function run(model, fn) {
  const ollama = Ollama.getOllama();
  return await ollama.run(model, fn);
}

async function generate(model, prompt, fn) {
  const ollama = Ollama.getOllama();
  return await ollama.generate(model, prompt, fn);
}

async function ping() {
  const ollama = Ollama.getOllama();
  return await ollama.ping();
}

function clearHistory() {
  const ollama = Ollama.getOllama();
  return ollama.clearHistory();
}

function stop() {
  const ollama = Ollama.getOllama();
  return ollama.stop();
}

function serve() {
  const ollama = Ollama.getOllama();
  return ollama.serve();
}

module.exports = {
  run,
  generate,
  ping,
  clearHistory,
  stop,
  serve,
};
