const fs = require("fs");
const os = require("os");
const path = require("path");
const { exec } = require("child_process");
const { logInfo, logErr } = require("../logger.js");

var OllamaServeType = {
  SYSTEM: "system", // ollama is installed on the system
  PACKAGED: "packaged", // ollama is packaged with the app
};

class Ollama {
  static instance = null;
  static context = null; // stores the chat history for the current session

  constructor() {
    this.childProcess = null;
    this.host = "http://127.0.0.1:11434"; // TODO: check OLLAMA_HOST env var
    this.abort = new AbortController();
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
      logInfo(`Ollama is not running: ${err}`);
    }

    try {
      // See if 'ollama serve' command is available on the system
      await this.execServe("ollama");
      return OllamaServeType.SYSTEM;
    } catch (err) {
      // ollama is not installed, run the binary directly
      logInfo(`Ollama is not installed on the system: ${err}`);
    }

    // start the packaged ollama server
    let exe = "";
    let appDataPath = "";
    switch (process.platform) {
      case "win32":
        exe = "ollama.exe";
        appDataPath = path.join(os.homedir(), "AppData", "Local", "chatd");
        break;
      case "darwin":
        exe = "ollama-darwin";
        appDataPath = path.join(
          os.homedir(),
          "Library",
          "Application Support",
          "chatd"
        );
        break;
      case "linux":
        exe = "ollama-linux"; // x64 only
        appDataPath = path.join(os.homedir(), ".config", "chatd");
        break;
      default:
        logErr(`unsupported platform: ${process.platform}`);
        reject(new Error(`Unsupported platform: ${process.platform}`));
        return;
    }

    const pathToBinary = path.join(__dirname, "runners", exe);
    try {
      await this.execServe(pathToBinary, appDataPath);
      return OllamaServeType.PACKAGED;
    } catch (err) {
      logErr(`Failed to start Ollama: ${err}`);
      throw new Error(`Failed to start Ollama: ${err}`);
    }
  }

  // execServe runs the serve command, and waits for a response
  async execServe(path, appDataDirectory) {
    return new Promise((resolve, reject) => {
      if (!fs.existsSync(appDataDirectory)) {
        fs.mkdirSync(appDataDirectory, { recursive: true });
      }
      const env = {
        ...process.env,
        OLLAMA_MODELS: appDataDirectory,
      };
      this.childProcess = exec(
        path + " serve",
        { env },
        (err, stdout, stderr) => {
          if (err) {
            reject(`exec error: ${err}`);
            return;
          }

          if (stderr) {
            reject(`ollama stderr: ${stderr}`);
            return;
          }

          reject(`ollama stdout: ${stdout}`);
        }
      );

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

      logErr('pull failed: ' + err);
      throw new Error(err);
    }

    const reader = response.body.getReader();

    // Reads the stream until the pull is complete
    // or when the stream is closed by the server
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // We break before reaching here
        // This means the prompt is not finished (maybe crashed?)
        logErr("failed to pull");
        throw new Error("failed to pull");
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
    try {
        await this.pull(model, fn);
    } catch (err) {
      logErr('failed to pull before run: ' + err);
      if (!err.message.includes("failed to pull")) {
        throw err;
      }
      logInfo('chatd is running offline, failed to pull');
    }
    await this.generate(model, "", fn);
    this.context = null;
  }

  stop() {
    if (!this.childProcess) {
      return;
    }

    if (os.platform() === "win32") {
      // Windows: Use taskkill to force kill the process tree
      // This makes sure the child process isn't left running
      exec(`taskkill /pid ${this.childProcess.pid} /f /t`, (err) => {
        if (err) {
          logErr(
            `Failed to kill process ${this.childProcess.pid}: ${err}`
          );
        }
      });
    } else {
      this.childProcess.kill();
    }

    this.childProcess = null;
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
   * @throws {Error}
   * @return {Promise<boolean>} True if the server is running.
   */
  async ping() {
    const response = await fetch(this.host, {
      method: "GET",
      cache: "no-store",
    });

    if (response.status !== 200) {
      throw new Error(`failed to ping ollama server: ${response.status}`);
    }

    logInfo("ollama server is running");

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
      } catch (err) {
        logInfo("waiting for ollama server...");
        logInfo(err);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    logErr("max retries reached. Ollama server didn't respond.");
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
      signal: this.abort.signal,
    });

    if (response.status !== 200) {
      let err = `HTTP Error (${response.status}): `;
      err += await response.text();

      logErr('chat failed request failed: ' + err);
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
        logErr("failed to generate response");
        throw new Error("Failed to generate response");
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

  /**
   * Aborts the current request.
   */
  abortRequest() {
    if (this.abort) {
      this.abort.abort();
      this.abort = new AbortController();
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

function abort() {
  const ollama = Ollama.getOllama();
  return ollama.abortRequest();
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
  abort,
  ping,
  clearHistory,
  stop,
  serve,
};
