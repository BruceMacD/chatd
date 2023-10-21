// Dynamically import the ml-distance library
let ml_distance;
import("ml-distance").then((module) => {
  ml_distance = module;
});

class MemoryVector {
  constructor(document, embedding) {
    this.document = document;
    this.embedding = embedding;
  }
}

class MemoryVectorStore {
  memoryVectors = [];
  similarity = null;

  static instance = null;

  constructor() {
    if (ml_distance) {
      this.similarity = ml_distance.similarity.cosine;
    }
  }

  static async fromEmbeddings(embeddings) {
    if (this.instance === null) {
      this.instance = new this();
      await this.instance.addEmbeddings(embeddings);
    }
    return this.instance;
  }

  static async getMemoryVectorStore() {
    if (this.instance === null) {
      this.instance = new this();
    }
    return this.instance;
  }

  async addEmbeddings(embeddings) {
    const memoryVectors = embeddings.map((item) => {
      return new MemoryVector(item.document, item.embedding);
    });
    this.memoryVectors = this.memoryVectors.concat(memoryVectors);
  }

  async similaritySearchVector(query, k) {
    const results = this.memoryVectors.map((vector) => ({
      similarity: this.similarity(query, vector.embedding),
      document: vector.document,
    }));

    results.sort((a, b) => (a.similarity > b.similarity ? -1 : 1));

    return results.slice(0, k).map((result) => result.document);
  }
}

async function store(embeddings) {
  return await MemoryVectorStore.fromEmbeddings(embeddings);
}

async function search(embedding, k) {
  const store = await MemoryVectorStore.getMemoryVectorStore();
  return await store.similaritySearchVector(embedding, k);
}

module.exports = {
  store,
  search,
};
