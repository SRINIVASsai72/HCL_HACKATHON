
import Skill from "../models/Skill.js";
import { embed, cosine } from "./embeddings.js";
import { AppError } from "../utils/http.js";

const MAX_TEXT_LENGTH = 2000;
const MAX_PHRASES = 30;
const SIMILARITY_THRESHOLD = 0.6;
const EMBEDDING_SIZE = 384;

// Normalize text for case-insensitive comparisons.
function normalize(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

// Split user input into individual skill phrases.
function extractPhrases(text) {
  return text
    .split(/,|;|\r?\n|\band\b/gi)
    .map((phrase) => phrase.trim())
    .filter(Boolean)
    .slice(0, MAX_PHRASES);
}

// Check whether a stored embedding is usable.
function hasValidEmbedding(vector) {
  return (
    Array.isArray(vector) &&
    vector.length === EMBEDDING_SIZE &&
    vector.every(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value)
    ) &&
    vector.some((value) => value !== 0)
  );
}

// Compare two match results, keeping the strongest.
function saveBestMatch(matches, result) {
  const key = String(result.skillId);
  const previous = matches.get(key);

  if (
    !previous ||
    result.score > previous.score ||
    (result.score === previous.score &&
      result.method === "alias" &&
      previous.method !== "alias")
  ) {
    matches.set(key, result);
  }
}

/**
 * Match user-entered text to skills in MongoDB.
 *
 * First checks skill names and aliases.
 * Unmatched phrases are compared semantically
 * using MiniLM embeddings and cosine similarity.
 *
 * @param {string} text
 * @returns {Promise<Array>}
 */
export async function matchSkills(text) {
  // Validate request input.
  if (
    typeof text !== "string" ||
    text.trim().length === 0 ||
    text.length > MAX_TEXT_LENGTH
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Text must be a non-empty string of at most 2000 characters"
    );
  }

  const phrases = extractPhrases(text);

  if (phrases.length === 0) {
    return [];
  }

  // Load skill names, aliases, and AI vectors.
  // Embeddings are hidden by default in the schema.
  const skills = await Skill.find()
    .select("+embedding")
    .lean();

  if (skills.length === 0) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Skill catalog is missing. Seed the database, then run npm run ai:build"
    );
  }

  // Build a lookup table of names and aliases.
  const aliasMap = new Map();

  for (const skill of skills) {
    const names = [
      skill.name,
      ...(skill.aliases || []),
    ];

    for (const name of names) {
      if (typeof name !== "string") continue;

      const key = normalize(name);

      if (!key) continue;

      // Keep the first entry for ambiguous aliases.
      if (!aliasMap.has(key)) {
        aliasMap.set(key, skill);
      }
    }
  }

  const bestMatches = new Map();
  const unmatchedPhrases = [];

  // STEP 1: Exact and alias matching.
  for (const phrase of phrases) {
    const skill = aliasMap.get(normalize(phrase));

    if (skill) {
      saveBestMatch(bestMatches, {
        phrase,
        skillId: String(skill._id),
        skillName: skill.name,
        score: 1,
        method: "alias",
      });
    } else {
      unmatchedPhrases.push(phrase);
    }
  }

  // No AI inference needed when everything matches.
  if (unmatchedPhrases.length === 0) {
    return Array.from(bestMatches.values());
  }

  // STEP 2: Check that stored embeddings exist.
  const skillsWithEmbeddings = skills.filter((skill) =>
    hasValidEmbedding(skill.embedding)
  );

  if (skillsWithEmbeddings.length !== skills.length) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Skill embeddings are missing or invalid. Run npm run ai:build"
    );
  }

  // STEP 3: Generate vectors for unmatched phrases.
  const phraseVectors = await embed(unmatchedPhrases);

  for (let i = 0; i < unmatchedPhrases.length; i++) {
    const phrase = unmatchedPhrases[i];
    const vector = phraseVectors[i];

    let bestSkill = null;
    let highestScore = -1;

    // Compare input vector with stored skill vectors.
    for (const skill of skillsWithEmbeddings) {
      const similarity = cosine(
        vector,
        skill.embedding
      );

      if (similarity > highestScore) {
        highestScore = similarity;
        bestSkill = skill;
      }
    }

    // Accept only sufficiently similar skills.
    if (
      bestSkill &&
      highestScore >= SIMILARITY_THRESHOLD
    ) {
      saveBestMatch(bestMatches, {
        phrase,
        skillId: String(bestSkill._id),
        skillName: bestSkill.name,
        score: Number(
          Math.max(0, Math.min(1, highestScore)).toFixed(4)
        ),
        method: "embedding",
      });
    }
  }

  // Return unique skill matches.
  return Array.from(bestMatches.values());
}
