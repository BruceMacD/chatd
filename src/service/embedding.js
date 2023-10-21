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

class VectorStore {
  static instance = null;

  static async newInstance(embeddings) {
    if (this.instance === null) {
      const { VectorStore } = await import("vector-store");
      this.instance = new VectorStore(embeddings);
    }

    return this.instance;
  }

  static async getInstance() {
    if (this.instance === null) {
      const { Voy } = await import("voy-search");
      this.instance = new Voy();
    }

    return this.instance;
  }
}

// The run function is used by the `transformers:embed` event handler.
async function embed(event, content) {
  console.log(`Embedding input `, content);
  // Load the model
  const extractor = await ExtractorPipeline.getInstance();

  const output = await extractor(content, {
    pooling: "mean",
    normalize: true,
  });
  console.log(output);
  const embedding = Array.from(output.data);
  console.log(`Embedding for input `, embedding);
}

module.exports = {
  embed,
};
