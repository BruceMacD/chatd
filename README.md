<div align="center">
    <img src="./screenshots/logo.png" width="300">
</div>

Chat with your documents using local AI. All your data stays on your computer and is never sent to the cloud. Chatd is a completely private and secure way to interact with your documents.

Chatd is a desktop application that lets you use a local large language model (`Mistral-7B`) to chat with your documents. What makes chatd different from other "chat with local documents" apps is that it comes with the local LLM runner packaged in. This means that you don't need to install anything else to use chatd, just run the executable.

Chatd uses Ollama to run the LLM. Ollama is an LLM server that provides a cross-platform LLM runner API. If you already have an Ollama instance running locally, chatd will automatically use it. Otherwise, chatd will start an Ollama server for you and manage its lifecycle.

<div align="center">
    <img src="./screenshots/chat_screen.png" width="30%"></img>
    <img src="./screenshots/welcome_screen.png" width="30%"></img>
    <img src="./screenshots/home_screen.png" width="30%"></img>
</div>

## Links

- [chatd.ai](https://chatd.ai)
- [ollama.ai](https://ollama.ai)

## Development

Run the following commands in the root directory.

```bash
npm install
npm run start
```

## Packaging

Add necessary Ollama executables to the `src/service/ollama/runners` directory to package them with the app.
