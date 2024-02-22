const { create, count, insertMultiple, search: oramaSearch } = require("@orama/orama")

class VectorStore {
  static instance = null;

  constructor(db) {
    this.db = db;
  }

  static async getVectorStore() {
    if (this.instance === null) {
      const db = await create({
        schema: {
          text: 'string',
          embedding: 'vector[384]', // vector size must be expressed during schema initialization, all-MiniLM-L6-v2 is 384
          // TODO: add meta data to schema
        },
      });
      this.instance = new this(db);
    }
    return this.instance;
  }

  async addEmbeddings(embeddings) {
    const items = embeddings.map(embedding => ({
      content: embedding.content,
      embedding: embedding.embedding,
      // ...meta data...
    }));
  
    await insertMultiple(this.db, items);
  }

  async search(embedding, limit) {
    const searchResult = await oramaSearch(this.db, {
      mode: 'vector',
      vector: {
        value: embedding,
        property: 'embedding',
      },
      similarity: 0.1, // get as many results as possible
      limit: limit,
    });
    // parse the search result to a text array
    let results = [];
    for (const hit of searchResult.hits) {
      results.push(hit.document.content);
    }
    return results;
  }

  clear() {
    this.instance = null;
  }

  async size() {
    return await count(this.db);
  }
}

async function clearVectorStore() {
  const store = await VectorStore.getVectorStore();
  store.clear();
}

async function store(embeddings) {
  const vectorStore = await VectorStore.getVectorStore();
  await vectorStore.addEmbeddings(embeddings);
}

async function search(embedding, limit) {
  const vectorStore = await VectorStore.getVectorStore();
  const result = await vectorStore.search(embedding, limit);
  return result;
}

async function vectorStoreSize() {
  const vectorStore = await VectorStore.getVectorStore();
  const size = await vectorStore.size();
  return size;
}

module.exports = {
  clearVectorStore,
  vectorStoreSize,
  store,
  search,
};
