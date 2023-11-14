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

  static getMemoryVectorStore() {
    if (this.instance === null) {
      this.instance = new this();
    }
    return this.instance;
  }

  addEmbeddings(embeddings) {
    const vectors = embeddings.map((item) => {
      return new MemoryVector(item.content, item.embedding);
    });
    this.memoryVectors = this.memoryVectors.concat(vectors);
  }

  clear() {
    this.memoryVectors = [];
  }

  similaritySearchVector(query, k) {
    const results = this.memoryVectors.map((vector) => ({
      similarity: this.similarity(query, vector.embedding),
      document: vector.document,
    }));

    results.sort((a, b) => (a.similarity > b.similarity ? -1 : 1));

    return results.slice(0, k).map((result) => result.document);
  }
}

function clearVectorStore() {
  MemoryVectorStore.getMemoryVectorStore().clear();
}

async function store(embeddings) {
  const store = MemoryVectorStore.getMemoryVectorStore();
  return store.addEmbeddings(embeddings);
}

function search(embedding, k) {
  const store = MemoryVectorStore.getMemoryVectorStore();
  return store.similaritySearchVector(embedding, k);
}

function vectorStoreSize() {
  const store = MemoryVectorStore.getMemoryVectorStore();
  return store.memoryVectors.length;
}

module.exports = {
  clearVectorStore,
  vectorStoreSize,
  store,
  search,
};
