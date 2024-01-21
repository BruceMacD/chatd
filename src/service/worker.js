const { parentPort } = require('worker_threads');
const { loadFile } = require("./document/reader.js");
const { embed } = require("./embedding.js");

parentPort.on('message', async (filePath) => {
    console.log('worker received:', filePath);
    // open the file and read the contents
    const doc = await loadFile(filePath); // TODO: batch read the file in chunks to avoid loading the entire file into memory
    // generate embeddings for each section
    const embeddings = await embed(doc);

    // Respond back to the main process
    parentPort.postMessage({ success: true, embeddings: embeddings });
});
