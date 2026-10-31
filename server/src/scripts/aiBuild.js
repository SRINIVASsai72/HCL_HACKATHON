
import "dotenv/config";
import mongoose from "mongoose";

import Skill from "../models/Skill.js";
import Role from "../models/Role.js";
import Course from "../models/Course.js";

import { embed, cosine } from "../ai/embeddings.js";
import { runAllForecasts } from "../ai/forecast.js";

const BATCH_SIZE = 16;
const SIMILARITY_THRESHOLD = 0.5;
const MAX_RELATED_SKILLS = 5;

// Convert ObjectId values into comparable strings.
function getId(value) {
  return String(value);
}

// Generate embeddings in batches to limit memory usage.
async function generateEmbeddings(texts) {
  const results = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const vectors = await embed(batch);

    results.push(...vectors);

    console.log(
      `Generated ${results.length}/${texts.length} embeddings`
    );
  }

  return results;
}

// Build text descriptions for job roles.
function getRoleText(role, skillMap) {
  const names = role.requiredSkills
    .map((item) => skillMap.get(getId(item.skillId))?.name)
    .filter(Boolean);

  return `${role.title}. Required skills: ${names.join(", ")}`;
}

// Build text descriptions for courses.
function getCourseText(course, skillMap) {
  const names = course.skills
    .map((item) => skillMap.get(getId(item.skillId))?.name)
    .filter(Boolean);

  return `${course.title}. Taught skills: ${names.join(", ")}`;
}

async function buildAI() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is missing from server/.env"
    );
  }

  await mongoose.connect(mongoUri);

  console.log("Connected to MongoDB");

  // Load the seeded catalog.
  const [skills, roles, courses] = await Promise.all([
    Skill.find().sort({ code: 1 }),
    Role.find().sort({ code: 1 }),
    Course.find().sort({ code: 1 }),
  ]);

  if (
    skills.length === 0 ||
    roles.length === 0 ||
    courses.length === 0
  ) {
    throw new Error(
      "Dataset is incomplete. Ask P3 to seed the database first."
    );
  }

  const skillMap = new Map(
    skills.map((skill) => [getId(skill._id), skill])
  );

  // STEP 1: Embed all skills.
  console.log("Building skill embeddings...");

  const skillTexts = skills.map(
    (skill) => `${skill.name}. ${skill.description || ""}`
  );

  const skillVectors = await generateEmbeddings(skillTexts);

  for (let i = 0; i < skills.length; i++) {
    skills[i].embedding = skillVectors[i];
  }

  // STEP 2: Find semantically related skills.
  console.log("Calculating related skills...");

  for (let i = 0; i < skills.length; i++) {
    const similarities = [];

    for (let j = 0; j < skills.length; j++) {
      if (i === j) continue;

      const score = cosine(
        skillVectors[i],
        skillVectors[j]
      );

      if (score >= SIMILARITY_THRESHOLD) {
        similarities.push({
          skillId: skills[j]._id,
          score: Number(score.toFixed(4)),
        });
      }
    }

    similarities.sort((a, b) => b.score - a.score);

    skills[i].related = similarities.slice(
      0,
      MAX_RELATED_SKILLS
    );
  }

  await Skill.bulkWrite(
    skills.map((skill) => ({
      updateOne: {
        filter: { _id: skill._id },
        update: {
          $set: {
            embedding: skill.embedding,
            related: skill.related,
          },
        },
      },
    }))
  );

  console.log(`Embedded ${skills.length} skills`);

  // STEP 3: Embed all job roles.
  console.log("Building role embeddings...");

  const roleTexts = roles.map((role) =>
    getRoleText(role, skillMap)
  );

  const roleVectors = await generateEmbeddings(roleTexts);

  await Role.bulkWrite(
    roles.map((role, index) => ({
      updateOne: {
        filter: { _id: role._id },
        update: {
          $set: {
            embedding: roleVectors[index],
          },
        },
      },
    }))
  );

  console.log(`Embedded ${roles.length} roles`);

  // STEP 4: Embed all courses.
  console.log("Building course embeddings...");

  const courseTexts = courses.map((course) =>
    getCourseText(course, skillMap)
  );

  const courseVectors = await generateEmbeddings(
    courseTexts
  );

  await Course.bulkWrite(
    courses.map((course, index) => ({
      updateOne: {
        filter: { _id: course._id },
        update: {
          $set: {
            embedding: courseVectors[index],
          },
        },
      },
    }))
  );

  console.log(`Embedded ${courses.length} courses`);

  // STEP 5: Build forecasts.
  // Requires the completed S5 implementation.
  console.log("Building demand forecasts...");

  const forecastSummary = await runAllForecasts();

  console.log("AI build completed successfully");

  console.log(
    JSON.stringify(
      {
        skillsEmbedded: skills.length,
        rolesEmbedded: roles.length,
        coursesEmbedded: courses.length,
        forecastsCreated: forecastSummary.count,
      },
      null,
      2
    )
  );
}

// Always close MongoDB, including on failure.
try {
  await buildAI();
} catch (error) {
  console.error("AI build failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
