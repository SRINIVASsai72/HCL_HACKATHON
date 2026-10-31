
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import Skill from "../models/Skill.js";
import Course from "../models/Course.js";
import Forecast from "../models/Forecast.js";

import { makeExplanation } from "./explain.js";
import { AppError, isValidId } from "../utils/http.js";

const MAX_TRANSITIONS = 3;
const MAX_PATHS = 3;
const MAX_COURSES_PER_STEP = 2;
const STUDY_HOURS_PER_MONTH = 20;

const NOTE =
  "AI suggestion only. HR makes the final decision.";

const id = (value) => String(value);
const round = (value) => Number(value.toFixed(3));
const clamp = (value) =>
  Math.max(0, Math.min(1, value));

// Convert forecast percentage growth to a 0-1 score.
function normalizeDemand(growthPct) {
  if (!Number.isFinite(growthPct)) return 0;
  return clamp(Math.max(0, growthPct) / 100);
}

// Calculate predicted demand for a job role.
function getRoleDemand(role, forecastMap) {
  let weightedDemand = 0;
  let totalWeight = 0;

  for (const item of role.requiredSkills || []) {
    const forecast = forecastMap.get(id(item.skillId));

    if (!forecast) {
      throw new AppError(
        503,
        "AI_NOT_READY",
        "Skill forecasts are incomplete. Run npm run ai:build"
      );
    }

    const weight = Number(item.weight) || 1;

    weightedDemand +=
      normalizeDemand(forecast.growthPct) * weight;

    totalWeight += weight;
  }

  return totalWeight
    ? clamp(weightedDemand / totalWeight)
    : 0;
}

// Find all possible career paths through nextRoles.
// Paths cannot repeat roles and have at most 3 transitions.
function discoverPaths(
  currentRoleId,
  roleMap,
  targetRoleId
) {
  const paths = [];

  function dfs(roleId, path, visited) {
    const transitions = path.length - 1;

    if (
      targetRoleId &&
      roleId === targetRoleId &&
      transitions > 0
    ) {
      paths.push([...path]);
      return;
    }

    if (transitions > 0 && !targetRoleId) {
      paths.push([...path]);
    }

    if (transitions >= MAX_TRANSITIONS) {
      return;
    }

    const role = roleMap.get(roleId);
    if (!role) return;

    for (const nextId of role.nextRoles || []) {
      const nextKey = id(nextId);

      if (
        visited.has(nextKey) ||
        !roleMap.has(nextKey)
      ) {
        continue;
      }

      visited.add(nextKey);
      path.push(nextKey);

      dfs(nextKey, path, visited);

      path.pop();
      visited.delete(nextKey);
    }
  }

  dfs(
    currentRoleId,
    [currentRoleId],
    new Set([currentRoleId])
  );

  return paths;
}

// Find the skills needed for a particular career step.
// Skill levels accumulate across earlier simulated steps.
function getSkillsToLearn(
  role,
  simulatedSkills,
  skillMap
) {
  const requirements = new Map();

  for (const item of role.requiredSkills || []) {
    const key = id(item.skillId);
    const previous = requirements.get(key);

    requirements.set(
      key,
      Math.max(
        previous || 0,
        Number(item.level)
      )
    );
  }

  const skillsToLearn = [];

  for (const [skillId, requiredLevel] of requirements) {
    const currentLevel =
      simulatedSkills.get(skillId) || 0;

    if (currentLevel >= requiredLevel) {
      continue;
    }

    skillsToLearn.push({
      skillId,
      skillName:
        skillMap.get(skillId)?.name || skillId,
      from: currentLevel,
      to: requiredLevel,
      gap: requiredLevel - currentLevel,
    });
  }

  skillsToLearn.sort(
    (a, b) =>
      b.gap - a.gap ||
      a.skillName.localeCompare(b.skillName)
  );

  return skillsToLearn;
}

// Select up to two courses that address the step gaps.
// Greedy coverage prioritizes important missing levels.
function selectCourses(skillsToLearn, courses) {
  const remaining = new Set(
    skillsToLearn.map((skill) => skill.skillId)
  );

  const selected = [];
  const usedCourses = new Set();

  while (
    selected.length < MAX_COURSES_PER_STEP &&
    remaining.size > 0
  ) {
    let best = null;
    let bestCoverage = 0;

    for (const course of courses) {
      const courseId = id(course._id);

      if (usedCourses.has(courseId)) continue;

      const coverage = skillsToLearn
        .filter((skill) =>
          remaining.has(skill.skillId) &&
          (course.skills || []).some(
            (item) =>
              id(item.skillId) === skill.skillId &&
              Number(item.targetLevel) > skill.from
          )
        )
        .reduce(
          (sum, skill) => sum + skill.gap,
          0
        );

      if (
        coverage > bestCoverage ||
        (coverage === bestCoverage &&
          coverage > 0 &&
          best &&
          Number(course.hours) < Number(best.hours))
      ) {
        best = course;
        bestCoverage = coverage;
      }
    }

    if (!best || bestCoverage === 0) break;

    selected.push(best);
    usedCourses.add(id(best._id));

    for (const item of best.skills || []) {
      const key = id(item.skillId);

      const gap = skillsToLearn.find(
        (skill) => skill.skillId === key
      );

      if (
        gap &&
        Number(item.targetLevel) >= gap.to
      ) {
        remaining.delete(key);
      }
    }

    // Do not recommend the same course twice.
  }

  return selected;
}

// Build a career path without modifying employee data.
function buildPath(
  rolePath,
  employee,
  roleMap,
  skillMap,
  courses,
  forecastMap
) {
  const simulatedSkills = new Map(
    (employee.skills || []).map((item) => [
      id(item.skillId),
      Number(item.level),
    ])
  );

  const steps = [];
  let totalMonths = 0;
  let totalGap = 0;
  let maxTotalGap = 0;

  // Skip the first role because it is the current role.
  for (const roleId of rolePath.slice(1)) {
    const role = roleMap.get(roleId);

    const needed = getSkillsToLearn(
      role,
      simulatedSkills,
      skillMap
    );

    // Calculate total unmet and required skill levels.
    for (const requirement of role.requiredSkills || []) {
      maxTotalGap += Number(requirement.level);
    }

    for (const skill of needed) {
      totalGap += skill.gap;
    }

    const selectedCourses = selectCourses(
      needed,
      courses
    );

    const courseHours = selectedCourses.reduce(
      (sum, course) =>
        sum + Number(course.hours || 0),
      0
    );

    // Based on 20 study hours per month.
    const months = Math.ceil(
      courseHours / STUDY_HOURS_PER_MONTH
    );

    totalMonths += months;

    steps.push({
      role: {
        _id: id(role._id),
        title: role.title,
        level: role.level,
      },
      skillsToLearn: needed.map((skill) => ({
        skillName: skill.skillName,
        from: skill.from,
        to: skill.to,
      })),
      courses: selectedCourses.map((course) => ({
        _id: id(course._id),
        title: course.title,
        hours: course.hours,
      })),
      months,
    });

    // Simulate acquiring required skills for the next
    // career step, without changing the real employee.
    for (const item of role.requiredSkills || []) {
      const key = id(item.skillId);
      const previous = simulatedSkills.get(key) || 0;

      simulatedSkills.set(
        key,
        Math.max(previous, Number(item.level))
      );
    }
  }

  const finalRole = roleMap.get(rolePath.at(-1));

  return {
    steps,
    totalMonths,
    totalGap,
    maxTotalGap,
    finalRoleDemandScore: getRoleDemand(
      finalRole,
      forecastMap
    ),
  };
}

/**
 * FR-08: AI-powered career progression.
 *
 * Optional targetRoleId restricts results to paths
 * ending at the requested target role.
 */
export async function getCareerPaths(
  employeeId,
  { targetRoleId } = {}
) {
  if (!isValidId(id(employeeId))) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid employee ID"
    );
  }

  if (
    targetRoleId &&
    !isValidId(id(targetRoleId))
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid target role ID"
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

  const [roles, skills, courses, forecasts] =
    await Promise.all([
      Role.find().lean(),
      Skill.find().lean(),
      Course.find().lean(),
      Forecast.find().lean(),
    ]);

  if (!roles.length || !skills.length) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Role or skill data is missing. Seed the database first."
    );
  }

  if (!forecasts.length) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Forecasts are missing. Run npm run ai:build"
    );
  }

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

  const currentRole = roleMap.get(
    id(employee.roleId)
  );

  if (!currentRole) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Current employee role not found"
    );
  }

  if (
    targetRoleId &&
    !roleMap.has(id(targetRoleId))
  ) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Target role not found"
    );
  }

  const rolePaths = discoverPaths(
    id(currentRole._id),
    roleMap,
    targetRoleId ? id(targetRoleId) : null
  );

  const candidates = rolePaths.map(
    (path) =>
      buildPath(
        path,
        employee,
        roleMap,
        skillMap,
        courses,
        forecastMap
      )
  );

  const ranked = candidates.map((candidate) => {
    const gapReadiness =
      candidate.maxTotalGap === 0
        ? 1
        : clamp(
            1 -
              candidate.totalGap /
                candidate.maxTotalGap
          );

    const factors = [
      {
        name: "Career skill readiness",
        value: gapReadiness,
        weight: 0.6,
      },
      {
        name: "Final role future demand",
        value: candidate.finalRoleDemandScore,
        weight: 0.4,
      },
    ];

    const score = round(
      factors.reduce(
        (sum, factor) =>
          sum + factor.value * factor.weight,
        0
      )
    );

    return {
      steps: candidate.steps,
      totalMonths: candidate.totalMonths,
      score,
      explanation: makeExplanation(
        factors,
        "Career paths are ranked using skill readiness and future demand for the destination role. Estimated months assume 20 study hours per month for recommended courses; uncovered learning may require additional time."
      ),
    };
  });

  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      a.totalMonths - b.totalMonths ||
      a.steps.at(-1).role.title.localeCompare(
        b.steps.at(-1).role.title
      )
  );

  return {
    employeeId: id(employee._id),
    currentRole: {
      _id: id(currentRole._id),
      title: currentRole.title,
    },
    paths: ranked.slice(0, MAX_PATHS).map(
      (path, index) => ({
        rank: index + 1,
        ...path,
      })
    ),
    note: NOTE,
  };
}
