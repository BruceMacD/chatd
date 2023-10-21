// This file contains all the logic for loading the model and creating embeddings.

class ExtractorPipeline {
  static task = "feature-extraction";
  static model = "Xenova/all-MiniLM-L6-v2";
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

// The run function is used by the `transformers:embed` event handler.
async function embed(documents) {
  // Load the model
  const extractor = await ExtractorPipeline.getInstance();

  // Extract the embeddings
  var embeddings = [];
  for (const document of documents) {
    const output = await extractor(document, {
      pooling: "mean",
      normalize: true,
    });
    embeddings.push({
      document: document,
      embedding: Array.from(output.data),
    });
  }
  return embeddings;
}

module.exports = {
  embed,
};
