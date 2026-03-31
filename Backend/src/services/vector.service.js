// Import the Pinecone library
const { Pinecone } = require("@pinecone-database/pinecone");

// Initialize a Pinecone client with your API key
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// Create a dense index with integrated embedding
const chatgptIndex = pc.index("chatgpt");

async function createMemory({ vector, metadata, messageId }) {
  let filteredVector = Array.isArray(vector)
    ? vector.filter((v) => typeof v === "number" && !isNaN(v))
    : [];
  if (filteredVector.length === 0) {
    console.error(
      "[FATAL] createMemory: filteredVector is empty, refusing to upsert",
      {
        messageId,
        metadata,
        originalVector: vector,
        filteredVector,
        vectorType: typeof vector,
        vectorLength: Array.isArray(vector) ? vector.length : undefined,
        first5: Array.isArray(vector) ? vector.slice(0, 5) : undefined,
        allNull: Array.isArray(vector)
          ? vector.every((v) => v == null)
          : undefined,
      },
    );
    throw new Error(
      "createMemory: filteredVector is empty, refusing to upsert",
    );
  }
  // Extra debug: print first 5 elements and type
  const upsertPayload = [
    {
      id: messageId,
      values: filteredVector,
      metadata,
    },
  ];
  console.log(
    "[DEBUG] Pinecone upsert payload:",
    JSON.stringify(upsertPayload, null, 2),
  );
  console.trace("[TRACE] About to call Pinecone upsert");
  await chatgptIndex.upsert({ records: upsertPayload });
}

async function queryMemory({ queryVector, limit = 5, metadata }) {
  if (!Array.isArray(queryVector) || queryVector.length === 0) {
    console.warn("Skipping query: queryVector is empty or invalid", {
      queryVector,
      metadata,
    });
    return [];
  }
  const data = await chatgptIndex.query({
    vector: queryVector,
    topK: limit,
    filter: metadata ? { metadata } : undefined,
    includeMetadata: true,
  });
  return data.matches;
}

module.exports = { createMemory, queryMemory };
