
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import Skill from "../models/Skill.js";
import Course from "../models/Course.js";
import Forecast from "../models/Forecast.js";

import { getGaps } from "./gaps.js";
import { cosine } from "./embeddings.js";
import { makeExplanation } from "./explain.js";
import { AppError, isValidId } from "../utils/http.js";

const EMBEDDING_SIZE = 384;
const MAX_RECOMMENDATIONS = 5;
const MAX_GAPS = 3;
const MAX_COURSES = 2;

const NOTE =
  "AI suggestion only. HR makes the final decision.";

const id = (value) => String(value);
const round = (value) => Number(value.toFixed(3));
const clamp = (value) =>
  Math.max(0, Math.min(1, value));

function validVector(vector) {
  return (
    Array.isArray(vector) &&
    vector.length === EMBEDDING_SIZE &&
    vector.every(Number.isFinite) &&
    vector.some((value) => value !== 0)
  );
}

// Normalize the employee's weighted skill embeddings.
function employeeVector(employee, skillMap) {
  const result = new Array(EMBEDDING_SIZE).fill(0);
  let totalWeight = 0;

  for (const item of employee.skills || []) {
    const skill = skillMap.get(id(item.skillId));

    if (!skill || !validVector(skill.embedding)) {
      continue;
    }

    const weight = Number(item.level);

    if (!Number.isFinite(weight) || weight <= 0) {
      continue;
    }

    for (let i = 0; i < EMBEDDING_SIZE; i++) {
      result[i] += skill.embedding[i] * weight;
    }

    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return null;
  }

  const magnitude = Math.sqrt(
    result.reduce((sum, value) => sum + value * value, 0)
  );

  if (magnitude === 0) {
    return null;
  }

  return result.map((value) => value / magnitude);
}

// Map forecast growth onto a 0–1 scale.
// Negative growth -> 0, 100% or more -> 1.
function demandFromGrowth(growthPct) {
  if (!Number.isFinite(growthPct)) return 0;
  return clamp(Math.max(0, growthPct) / 100);
}

// Average demand for a role's required skills,
// weighted by each skill's importance.
function roleDemand(role, forecastMap) {
  let weightedDemand = 0;
  let totalWeight = 0;

  for (const requirement of role.requiredSkills || []) {
    const forecast = forecastMap.get(
      id(requirement.skillId)
    );

    if (!forecast) {
      throw new AppError(
        503,
        "AI_NOT_READY",
        "Skill forecasts are incomplete. Run npm run ai:build"
      );
    }

    const weight = Number(requirement.weight) || 1;

    weightedDemand +=
      demandFromGrowth(forecast.growthPct) * weight;

    totalWeight += weight;
  }

  return totalWeight === 0
    ? 0
    : clamp(weightedDemand / totalWeight);
}

// Select courses teaching the most urgent missing skills.
function findCourses(gaps, courses) {
  const chosen = [];
  const selectedIds = new Set();

  for (const gap of gaps) {
    const matching = courses
      .filter((course) =>
        (course.skills || []).some(
          (item) =>
            id(item.skillId) === id(gap.skillId) &&
            Number(item.targetLevel) > gap.effective
        )
      )
      .sort(
        (a, b) =>
          Number(a.level) - Number(b.level) ||
          Number(a.hours) - Number(b.hours)
      );

    for (const course of matching) {
      const key = id(course._id);

      if (selectedIds.has(key)) continue;

      chosen.push({
        _id: key,
        title: course.title,
      });

      selectedIds.add(key);
      break;
    }

    if (chosen.length >= MAX_COURSES) break;
  }

  return chosen;
}

/**
 * FR-06: AI-powered internal mobility suggestions.
 *
 * Employee cannot be automatically moved to a role.
 * HR retains the final decision.
 */
export async function getMobility(employeeId) {
  if (!isValidId(id(employeeId))) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid employee ID"
    );
  }

  const employee = await Employee.findById(
    id(employeeId)
  ).lean();

  if (!employee) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Employee not found"
    );
  }

  const [roles, skills, forecasts, courses] =
    await Promise.all([
      Role.find().select("+embedding").lean(),
      Skill.find().select("+embedding").lean(),
      Forecast.find().lean(),
      Course.find().lean(),
    ]);

  const roleMap = new Map(
    roles.map((role) => [id(role._id), role])
  );

  const skillMap = new Map(
    skills.map((skill) => [id(skill._id), skill])
  );

  const forecastMap = new Map(
    forecasts.map((forecast) => [
      id(forecast.skillId),
      forecast,
    ])
  );

  const currentRole = roleMap.get(id(employee.roleId));

  if (!currentRole) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Employee's current role not found"
    );
  }

  if (!forecasts.length) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Forecasts are missing. Run npm run ai:build"
    );
  }

  // Only other roles, at most one level higher.
  const candidates = roles.filter(
    (role) =>
      id(role._id) !== id(currentRole._id) &&
      role.level <= currentRole.level + 1
  );

  if (
    candidates.some(
      (role) => !validVector(role.embedding)
    )
  ) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Role embeddings are missing. Run npm run ai:build"
    );
  }

  if (
    (employee.skills || []).some((item) => {
      const skill = skillMap.get(id(item.skillId));
      return !skill || !validVector(skill.embedding);
    })
  ) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Employee skill embeddings are missing. Run npm run ai:build"
    );
  }

  const vector = employeeVector(employee, skillMap);

  const results = [];

  for (const role of candidates) {
    // Reuse the exact S7 skill-gap algorithm.
    const gapResult = await getGaps(id(employee._id), {
      roleId: id(role._id),
      horizon: 12,
    });

    const readiness = clamp(
      gapResult.readiness.current
    );

    const similarity = vector
      ? clamp(cosine(vector, role.embedding))
      : 0;

    const demandScore = roleDemand(
      role,
      forecastMap
    );

    const factors = [
      {
        name: "Readiness",
        value: readiness,
        weight: 0.5,
      },
      {
        name: "Skill similarity",
        value: similarity,
        weight: 0.3,
      },
      {
        name: "Future demand",
        value: demandScore,
        weight: 0.2,
      },
    ];

    const score = round(
      factors.reduce(
        (total, factor) =>
          total + factor.value * factor.weight,
        0
      )
    );

    const topGaps = gapResult.currentGaps.slice(
      0,
      MAX_GAPS
    );

    results.push({
      role: {
        _id: id(role._id),
        title: role.title,
        level: role.level,
      },
      score,
      readiness: round(readiness),
      similarity: round(similarity),
      demandScore: round(demandScore),
      topGaps,
      courses: findCourses(topGaps, courses),
      explanation: makeExplanation(
        factors,
        "This role is recommended based on current skill readiness, semantic similarity, and forecast skill demand. HR makes the final decision."
      ),
    });
  }

  // Highest-scoring roles come first.
  results.sort(
    (a, b) =>
      b.score - a.score ||
      a.role.title.localeCompare(b.role.title)
  );

  return {
    employeeId: id(employee._id),
    currentRole: {
      _id: id(currentRole._id),
      title: currentRole.title,
    },
    recommendations: results
      .slice(0, MAX_RECOMMENDATIONS)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      })),
    note: NOTE,
  };
}
