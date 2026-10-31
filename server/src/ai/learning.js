
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import Skill from "../models/Skill.js";
import Course from "../models/Course.js";
import Forecast from "../models/Forecast.js";
import LearningRecord from "../models/LearningRecord.js";

import { getGaps } from "./gaps.js";
import { cosine } from "./embeddings.js";
import { makeExplanation } from "./explain.js";
import { AppError, isValidId } from "../utils/http.js";

const MAX_COURSES = 5;
const MAX_PER_SKILL = 2;
const EMBEDDING_SIZE = 384;

const WEIGHTS = {
  gapCoverage: 0.4,
  futureDemand: 0.25,
  completionRate: 0.2,
  relevance: 0.15,
};

const id = (value) => String(value);
const round = (value) => Number(value.toFixed(3));

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function validEmbedding(vector) {
  return (
    Array.isArray(vector) &&
    vector.length === EMBEDDING_SIZE &&
    vector.every(Number.isFinite) &&
    vector.some((value) => value !== 0)
  );
}

// Normalize positive forecast growth to 0–1.
// 0% or negative growth -> 0
// 100% or higher growth -> 1
function normalizeDemand(growthPct) {
  return clamp(Math.max(0, growthPct) / 100);
}

// Find the strongest gap per skill across
// current and future requirements.
function combineGaps(gapResult) {
  const map = new Map();

  for (const gap of [
    ...gapResult.currentGaps,
    ...gapResult.futureGaps,
  ]) {
    if (gap.gap <= 0) continue;

    const key = id(gap.skillId);
    const previous = map.get(key);

    if (!previous || gap.gap > previous.gap) {
      map.set(key, gap);
    }
  }

  return map;
}

// Determine completion success using decided records.
// Enrolled records are intentionally excluded.
function completionRate(records) {
  let completed = 0;
  let dropped = 0;

  for (const record of records) {
    if (record.status === "completed") completed++;
    if (record.status === "dropped") dropped++;
  }

  const decided = completed + dropped;

  return decided === 0 ? 0.5 : completed / decided;
}

// Calculate whether a course addresses each gap.
// A course must teach at least one gap skill.
function coveredGaps(course, gapMap) {
  const matches = [];

  for (const item of course.skills || []) {
    const key = id(item.skillId);
    const gap = gapMap.get(key);

    if (!gap) continue;

    if (Number(item.targetLevel) > gap.effective) {
      matches.push(gap);
    }
  }

  return matches;
}

// Order selected courses using prerequisite
// relationships first, then course level.
function orderCourses(courses, skillMap) {
  const selected = new Map(
    courses.map((course) => [id(course._id), course])
  );

  const edges = new Map();
  const inDegree = new Map();

  for (const course of courses) {
    const key = id(course._id);
    edges.set(key, new Set());
    inDegree.set(key, 0);
  }

  // If course A teaches a prerequisite of a skill
  // taught by B, A must come before B.
  for (const courseB of courses) {
    const bId = id(courseB._id);

    for (const taught of courseB.skills || []) {
      const skill = skillMap.get(id(taught.skillId));

      for (const prereq of skill?.prerequisites || []) {
        for (const courseA of courses) {
          const aId = id(courseA._id);

          if (aId === bId) continue;

          const teachesPrereq = (courseA.skills || [])
            .some((item) =>
              id(item.skillId) === id(prereq)
            );

          if (
            teachesPrereq &&
            !edges.get(aId).has(bId)
          ) {
            edges.get(aId).add(bId);
            inDegree.set(
              bId,
              inDegree.get(bId) + 1
            );
          }
        }
      }
    }
  }

  const ordered = [];
  const remaining = new Set(selected.keys());

  while (remaining.size > 0) {
    const available = [...remaining]
      .filter((key) => inDegree.get(key) === 0)
      .sort((a, b) => {
        const ca = selected.get(a);
        const cb = selected.get(b);

        return (
          ca.level - cb.level ||
          ca.title.localeCompare(cb.title)
        );
      });

    if (available.length === 0) {
      // Cyclic prerequisites cannot be ordered.
      // Report the invalid data rather than silently
      // creating an incorrect learning sequence.
      throw new AppError(
        500,
        "SERVER_ERROR",
        "Selected courses have cyclic skill prerequisites"
      );
    }

    const next = available[0];
    remaining.delete(next);
    ordered.push(selected.get(next));

    for (const target of edges.get(next)) {
      inDegree.set(
        target,
        inDegree.get(target) - 1
      );
    }
  }

  return ordered;
}

/**
 * FR-05: Personalized learning recommendations.
 */
export async function getLearningPlan(
  employeeId,
  { roleId } = {}
) {
  if (!isValidId(String(employeeId))) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid employee ID"
    );
  }

  if (roleId && !isValidId(String(roleId))) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid role ID"
    );
  }

  const employee = await Employee.findById(
    employeeId
  ).lean();

  if (!employee) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Employee not found"
    );
  }

  const targetRoleId = roleId || employee.roleId;

  const [
    role,
    skills,
    courses,
    forecasts,
    gapResult,
  ] = await Promise.all([
    Role.findById(targetRoleId)
      .select("+embedding")
      .lean(),
    Skill.find().lean(),
    Course.find().select("+embedding").lean(),
    Forecast.find().lean(),
    getGaps(employeeId, {
      roleId: targetRoleId,
      horizon: 12,
    }),
  ]);

  if (!role) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Role not found"
    );
  }

  if (!validEmbedding(role.embedding)) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Role embedding is missing. Run npm run ai:build"
    );
  }

  if (!forecasts.length) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Forecasts are missing. Run npm run ai:build"
    );
  }

  const skillMap = new Map(
    skills.map((skill) => [id(skill._id), skill])
  );

  const forecastMap = new Map(
    forecasts.map((forecast) => [
      id(forecast.skillId),
      forecast,
    ])
  );

  const gapMap = combineGaps(gapResult);

  // Fully prepared employees need no courses.
  if (gapMap.size === 0) {
    return {
      employeeId: id(employee._id),
      role: {
        _id: id(role._id),
        title: role.title,
      },
      recommendations: [],
      path: [],
      totalHours: 0,
      uncoveredSkills: [],
    };
  }

  // Only courses teaching relevant gap skills qualify.
  const candidateCourses = courses.filter(
    (course) => coveredGaps(course, gapMap).length > 0
  );

  if (
    candidateCourses.some(
      (course) => !validEmbedding(course.embedding)
    )
  ) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Course embeddings are missing. Run npm run ai:build"
    );
  }

  const records = candidateCourses.length
    ? await LearningRecord.find({
        courseId: {
          $in: candidateCourses.map(
            (course) => course._id
          ),
        },
      }).lean()
    : [];

  const recordsByCourse = new Map();

  for (const record of records) {
    const key = id(record.courseId);

    if (!recordsByCourse.has(key)) {
      recordsByCourse.set(key, []);
    }

    recordsByCourse.get(key).push(record);
  }

  const totalGapWeight = [...gapMap.values()]
    .reduce(
      (sum, gap) => sum + gap.gap * gap.weight,
      0
    );

  const scoredCourses = candidateCourses.map(
    (course) => {
      const matchingGaps = coveredGaps(
        course,
        gapMap
      );

      const gapCoverage = clamp(
        matchingGaps.reduce(
          (sum, gap) =>
            sum + gap.gap * gap.weight,
          0
        ) / totalGapWeight
      );

      const futureDemand = clamp(
        matchingGaps.reduce(
          (sum, gap) =>
            sum + normalizeDemand(
              forecastMap.get(
                id(gap.skillId)
              )?.growthPct ?? 0
            ),
          0
        ) / matchingGaps.length
      );

      const completion = completionRate(
        recordsByCourse.get(id(course._id)) || []
      );

      const relevance = clamp(
        cosine(course.embedding, role.embedding)
      );

      const factors = [
        {
          name: "Gap coverage",
          value: gapCoverage,
          weight: WEIGHTS.gapCoverage,
        },
        {
          name: "Future demand",
          value: futureDemand,
          weight: WEIGHTS.futureDemand,
        },
        {
          name: "Completion rate",
          value: completion,
          weight: WEIGHTS.completionRate,
        },
        {
          name: "Semantic relevance",
          value: relevance,
          weight: WEIGHTS.relevance,
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
        course,
        matchingGaps,
        score,
        explanation: makeExplanation(
          factors,
          "Course ranking combines skill-gap coverage, predicted demand, past completion success, and semantic relevance to the target role."
        ),
      };
    }
  );

  scoredCourses.sort(
    (a, b) =>
      b.score - a.score ||
      a.course.title.localeCompare(b.course.title)
  );

  // Select up to five courses, with no more than
  // two assigned to any one gap skill.
  const selected = [];
  const assignedCounts = new Map();

  for (const candidate of scoredCourses) {
    if (selected.length >= MAX_COURSES) break;

    const availableGap = [...candidate.matchingGaps]
      .sort(
        (a, b) =>
          b.gap * b.weight -
          a.gap * a.weight
      )
      .find(
        (gap) =>
          (assignedCounts.get(id(gap.skillId)) || 0) <
          MAX_PER_SKILL
      );

    if (!availableGap) continue;

    const key = id(availableGap.skillId);

    assignedCounts.set(
      key,
      (assignedCounts.get(key) || 0) + 1
    );

    selected.push(candidate);
  }

  const recommendations = selected.map(
    (item, index) => ({
      rank: index + 1,
      course: {
        _id: id(item.course._id),
        code: item.course.code,
        title: item.course.title,
        type: item.course.type,
        provider: item.course.provider,
        hours: item.course.hours,
      },
      skills: item.matchingGaps.map(
        (gap) => gap.skillName
      ),
      score: item.score,
      explanation: item.explanation,
    })
  );

  const ordered = orderCourses(
    selected.map((item) => item.course),
    skillMap
  );

  const path = ordered.map(
    (course, index) => ({
      order: index + 1,
      courseId: id(course._id),
      title: course.title,
    })
  );

  const totalHours = ordered.reduce(
    (sum, course) => sum + course.hours,
    0
  );

  // A gap is uncovered only if no catalog course
  // addresses it, not merely because it missed
  // the top-five recommendation limit.
  const uncoveredSkills = [...gapMap.values()]
    .filter(
      (gap) =>
        !candidateCourses.some((course) =>
          coveredGaps(course, gapMap).some(
            (match) =>
              id(match.skillId) === id(gap.skillId)
          )
        )
    )
    .map((gap) => gap.skillName);

  return {
    employeeId: id(employee._id),
    role: {
      _id: id(role._id),
      title: role.title,
    },
    recommendations,
    path,
    totalHours,
    uncoveredSkills,
  };
}
