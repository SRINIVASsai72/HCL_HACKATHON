

import { pipeline, env } from "@huggingface/transformers";

env.cacheDir = "./.model-cache";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";
const EMBEDDING_SIZE = 384;

let extractorPromise = null;

// Load the model once and reuse it for future requests.
async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "feature-extraction",
      MODEL_NAME
    ).catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }

  return extractorPromise;
}

// Convert an array of text into 384-dimensional vectors.
export async function embed(texts) {
  if (!Array.isArray(texts)) {
    throw new TypeError("embed expects an array of strings");
  }

  if (texts.length === 0) {
    return [];
  }

  if (
    texts.some(
      (text) =>
        typeof text !== "string" ||
        text.trim().length === 0
    )
  ) {
    throw new TypeError(
      "All inputs must be non-empty strings"
    );
  }

  const extractor = await getExtractor();

  const output = await extractor(texts, {
    pooling: "mean",
    normalize: true,
  });

  const vectors = await output.tolist();

  if (
    !Array.isArray(vectors) ||
    vectors.length !== texts.length ||
    vectors.some(
      (vector) =>
        !Array.isArray(vector) ||
        vector.length !== EMBEDDING_SIZE ||
        vector.some(
          (value) =>
            typeof value !== "number" ||
            !Number.isFinite(value)
        )
    )
  ) {
    throw new Error(
      "Embedding model returned invalid vectors"
    );
  }

  return vectors;
}

// Calculate cosine similarity between two vectors.
export function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    throw new TypeError(
      "cosine expects two numeric arrays"
    );
  }

  if (a.length !== b.length) {
    throw new RangeError(
      "Vectors must have equal dimensions"
    );
  }

  if (a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];

    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      throw new TypeError(
        "Vectors must contain finite numbers"
      );
    }

    dotProduct += x * y;
    normA += x * x;
    normB += y * y;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  const similarity =
    dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

  return Math.max(-1, Math.min(1, similarity));
}
