// This file contains all the logic for loading the model and creating embeddings.

class ExtractorPipeline {
  static task = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2"; // if you want to use a different model, change the vector size in the vector store
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      // Dynamically import the Transformers.js library
      let { pipeline, env } = await import("@xenova/transformers");
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }

    return this.instance;
  }
}

// The embed function is used by the `doc:load` event handler.
async function embed(doc) {
  // Load the model
  const extractor = await ExtractorPipeline.getInstance();

  // Extract the embeddings
  let embeddings = [];
  // Using an array to store promises from the forEach loop
  let promiseArray = [];

  doc.data.forEach((data) => {
    data.content.forEach((line) => {
      // Create a promise for each line and process it
      const promise = extractor(line, {
        pooling: "mean",
        normalize: true,
      }).then((output) => {
        embeddings.push({
          content: line,
          embedding: Array.from(output.data),
        });
      });
      promiseArray.push(promise);
    });
  });

  // Wait for all promises to resolve
  await Promise.all(promiseArray);
  return embeddings;
}

module.exports = {
  embed,
};
