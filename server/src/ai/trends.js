
import Skill from "../models/Skill.js";
import MarketDemand from "../models/MarketDemand.js";
import { AppError } from "../utils/http.js";

const SKILL_CATEGORIES = [
  "language",
  "frontend",
  "backend",
  "data",
  "ai_ml",
  "cloud_devops",
  "testing",
  "embedded",
];

const HISTORY_MONTHS = 12;
const AVERAGE_MONTHS = 3;

// Round values to three decimal places.
function round(value) {
  return Number(value.toFixed(3));
}

// Calculate the average of a numeric array.
function average(values) {
  if (values.length === 0) return 0;

  const total = values.reduce(
    (sum, value) => sum + value,
    0
  );

  return total / values.length;
}

// Calculate historical percentage growth.
function calculateGrowth(firstAverage, lastAverage) {
  if (firstAverage === 0) {
    // Zero is an undefined percentage-growth baseline.
    // Use 100% as a documented display convention
    // when demand rises above zero.
    return lastAverage > 0 ? 100 : 0;
  }

  return round(
    ((lastAverage - firstAverage) / firstAverage) * 100
  );
}

// Classify historical demand growth.
function classifyTrend(growthPct) {
  if (growthPct >= 40) return "emerging";
  if (growthPct >= 10) return "growing";
  if (growthPct <= -10) return "declining";

  return "stable";
}

/**
 * Analyze historical skill demand.
 *
 * Returns TrendItem[]:
 * {
 *   skillId,
 *   skillName,
 *   category,
 *   latest,
 *   growthPct,
 *   trend,
 *   source
 * }
 */
export async function getTrends({ category } = {}) {
  // Validate category filter.
  if (
    category !== undefined &&
    !SKILL_CATEGORIES.includes(category)
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid skill category"
    );
  }

  // Load skill catalog.
  const skillFilter = category ? { category } : {};

  const skills = await Skill.find(skillFilter)
    .select("_id name category")
    .lean();

  if (skills.length === 0) {
    if (category) return [];

    throw new AppError(
      503,
      "AI_NOT_READY",
      "Skill dataset is missing. Seed the database first."
    );
  }

  // Load historical demand for relevant skills.
  const skillIds = skills.map((skill) => skill._id);

  const records = await MarketDemand.find({
    skillId: { $in: skillIds },
  })
    .sort({ skillId: 1, month: 1 })
    .lean();

  if (records.length === 0) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Market demand data is missing. Seed the database first."
    );
  }

  // Group demand records by skill.
  const demandMap = new Map();

  for (const record of records) {
    if (
      !Number.isFinite(record.value) ||
      record.value < 0
    ) {
      continue;
    }

    const key = String(record.skillId);

    if (!demandMap.has(key)) {
      demandMap.set(key, []);
    }

    demandMap.get(key).push(record);
  }

  const trends = [];

  for (const skill of skills) {
    const history = demandMap.get(
      String(skill._id)
    ) || [];

    // At least 12 months of history are required.
    if (history.length < HISTORY_MONTHS) {
      continue;
    }

    // Use only the most recent 12 months.
    const recent = history.slice(-HISTORY_MONTHS);

    const firstThree = recent
      .slice(0, AVERAGE_MONTHS)
      .map((item) => item.value);

    const lastThree = recent
      .slice(-AVERAGE_MONTHS)
      .map((item) => item.value);

    const firstAverage = average(firstThree);
    const lastAverage = average(lastThree);

    const growthPct = calculateGrowth(
      firstAverage,
      lastAverage
    );

    const latestRecord = recent.at(-1);

    trends.push({
      skillId: String(skill._id),
      skillName: skill.name,
      category: skill.category,
      latest: latestRecord.value,
      growthPct,
      trend: classifyTrend(growthPct),
      source: latestRecord.source,
    });
  }

  // Display highest historical growth first.
  trends.sort(
    (a, b) =>
      b.growthPct - a.growthPct ||
      a.skillName.localeCompare(b.skillName)
  );

  return trends;
}
