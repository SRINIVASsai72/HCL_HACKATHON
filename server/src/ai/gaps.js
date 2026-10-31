
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import Skill from "../models/Skill.js";
import Forecast from "../models/Forecast.js";
import { cosine } from "./embeddings.js";
import { makeExplanation } from "./explain.js";
import { AppError, isValidId } from "../utils/http.js";

const SEMANTIC_THRESHOLD = 0.7;
const FUTURE_GROWTH_THRESHOLD = 20;
const DEFAULT_HORIZON = 12;
const EMBEDDING_SIZE = 384;

const round = (n) => Number(n.toFixed(3));
const clamp = (n, low = 0, high = 1) =>
  Math.max(low, Math.min(high, n));
const id = (value) => String(value);

function checkHorizon(horizon = DEFAULT_HORIZON) {
  const value = Number(horizon);

  if (![6, 12].includes(value)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "horizon must be 6 or 12"
    );
  }

  return value;
}

function validVector(vector) {
  return (
    Array.isArray(vector) &&
    vector.length === EMBEDDING_SIZE &&
    vector.every(Number.isFinite) &&
    vector.some((value) => value !== 0)
  );
}

// Calculate projected growth for the selected horizon.
function forecastGrowth(forecast, horizon) {
  if (!forecast) return 0;

  const actual = forecast.history?.at(-1)?.value;
  const projected =
    forecast.predictions?.[horizon - 1]?.value;

  if (
    !Number.isFinite(actual) ||
    !Number.isFinite(projected)
  ) {
    return 0;
  }

  if (actual === 0) {
    return projected > 0 ? 100 : 0;
  }

  return ((projected - actual) / actual) * 100;
}

// Load AI data once, so both public functions can
// use the same readiness calculations.
async function loadContext() {
  const [roles, skills, forecasts] = await Promise.all([
    Role.find().lean(),
    Skill.find().select("+embedding").lean(),
    Forecast.find().lean(),
  ]);

  if (!roles.length || !skills.length) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Skill or role data is missing. Seed the database first."
    );
  }

  if (!forecasts.length) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Forecast data is missing. Run npm run ai:build"
    );
  }

  return {
    roles: new Map(roles.map((r) => [id(r._id), r])),
    skills: new Map(skills.map((s) => [id(s._id), s])),
    forecasts: new Map(
      forecasts.map((f) => [id(f.skillId), f])
    ),
  };
}

// Combine role requirements without counting a skill twice.
function addRequirement(map, requirement) {
  const key = id(requirement.skillId);
  const previous = map.get(key);

  const level = Math.min(
    5,
    Math.max(1, Number(requirement.level))
  );
  const weight = Math.max(
    1,
    Number(requirement.weight) || 1
  );

  if (!previous) {
    map.set(key, {
      skillId: key,
      level,
      weight,
    });
  } else {
    previous.level = Math.max(previous.level, level);
    previous.weight = Math.max(previous.weight, weight);
  }
}

// Build current or future role requirements.
function requirementsFor(role, context, future, horizon) {
  const requirements = new Map();

  for (const item of role.requiredSkills || []) {
    addRequirement(requirements, item);
  }

  if (!future) {
    return [...requirements.values()];
  }

  // Include requirements explicitly marked as future skills.
  for (const item of role.futureSkills || []) {
    addRequirement(requirements, item);
  }

  // Increase rapidly growing current skill requirements.
  for (const item of role.requiredSkills || []) {
    const key = id(item.skillId);
    const growth = forecastGrowth(
      context.forecasts.get(key),
      horizon
    );

    if (growth >= FUTURE_GROWTH_THRESHOLD) {
      const requirement = requirements.get(key);

      requirement.level = Math.min(
        5,
        Math.max(
          requirement.level,
          Number(item.level) + 1
        )
      );
    }
  }

  return [...requirements.values()];
}

// Return the best genuine semantic match for a
// missing required skill, if it passes the threshold.
function semanticCredit(
  employeeSkills,
  requiredSkill,
  requiredLevel,
  context
) {
  if (!validVector(requiredSkill?.embedding)) {
    return null;
  }

  let best = null;

  for (const item of employeeSkills) {
    const ownedSkill = context.skills.get(id(item.skillId));

    if (!validVector(ownedSkill?.embedding)) {
      continue;
    }

    const similarity = cosine(
      ownedSkill.embedding,
      requiredSkill.embedding
    );

    if (
      similarity >= SEMANTIC_THRESHOLD &&
      (!best || similarity > best.similarity)
    ) {
      best = {
        skillName: ownedSkill.name,
        level: item.level,
        similarity,
      };
    }
  }

  if (!best) return null;

  return {
    ...best,
    effective: Math.min(
      requiredLevel - 1,
      Math.round(best.level * best.similarity * 0.5 * 10) /
        10
    ),
  };
}

// Core calculation shared by employee and HR reports.
function calculateReadiness(
  employee,
  role,
  context,
  future,
  horizon
) {
  const requirements = requirementsFor(
    role,
    context,
    future,
    horizon
  );

  const owned = new Map(
    (employee.skills || []).map((item) => [
      id(item.skillId),
      Number(item.level),
    ])
  );

  const items = [];
  let weightedGap = 0;
  let weightedRequired = 0;

  for (const requirement of requirements) {
    const key = requirement.skillId;
    const skill = context.skills.get(key);

    const required = requirement.level;
    const weight = requirement.weight;
    const current = owned.get(key) || 0;

    let effective = current;
    let reason =
      current > 0
        ? "Employee has this skill"
        : "Required skill is missing";

    // Semantic credit applies ONLY if the required
    // skill itself is absent from the employee.
    if (current === 0) {
      const credit = semanticCredit(
        employee.skills || [],
        skill,
        required,
        context
      );

      if (credit) {
        effective = credit.effective;
        reason =
          `Partial credit from ${credit.skillName} ` +
          `(measured cosine similarity: ` +
          `${credit.similarity.toFixed(3)})`;
      }
    }

    const gap = Math.max(0, required - effective);
    const growthPct = forecastGrowth(
      context.forecasts.get(key),
      horizon
    );

    weightedGap += gap * weight;
    weightedRequired += required * weight;

    items.push({
      skillId: key,
      skillName: skill?.name || key,
      required,
      current,
      effective,
      gap: round(gap),
      weight,
      growthPct: round(growthPct),
      reason,
    });
  }

  const readiness =
    weightedRequired === 0
      ? 1
      : clamp(1 - weightedGap / weightedRequired);

  // Sort by weighted urgency, increasing with
  // positive demand growth.
  items.sort((a, b) => {
    const urgency = (item) =>
      item.gap *
      item.weight *
      (1 + Math.max(0, item.growthPct) / 100);

    return (
      urgency(b) - urgency(a) ||
      a.skillName.localeCompare(b.skillName)
    );
  });

  // Only missing or insufficient skills are gaps.
  const gaps = items.filter((item) => item.gap > 0);

  return {
    readiness: round(readiness),
    gaps,
    allItems: items,
    weightedRequired,
  };
}

// An additive explanation for the CURRENT readiness.
// Each factor represents the fraction of required
// weighted proficiency already covered.
function readinessExplanation(result) {
  if (result.weightedRequired === 0) {
    return makeExplanation(
      [{ name: "No role requirements", value: 1, weight: 1 }],
      "No required skills are defined; readiness is 100%."
    );
  }

  const factors = result.allItems.map((item) => ({
    name: item.skillName,
    value: clamp(item.effective / item.required),
    weight:
      (item.required * item.weight) /
      result.weightedRequired,
  }));

  return makeExplanation(
    factors,
    "Current readiness is calculated from weighted skill proficiency. Future readiness also accounts for future role requirements and forecast demand."
  );
}

function evaluateEmployee(employee, role, context, horizon) {
  const current = calculateReadiness(
    employee,
    role,
    context,
    false,
    horizon
  );

  const future = calculateReadiness(
    employee,
    role,
    context,
    true,
    horizon
  );

  return { current, future };
}

/**
 * FR-02: Individual current and future skill gaps.
 */
export async function getGaps(
  employeeId,
  { roleId, horizon = DEFAULT_HORIZON } = {}
) {
  if (!isValidId(employeeId)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid employee ID"
    );
  }

  if (roleId && !isValidId(roleId)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid role ID"
    );
  }

  const selectedHorizon = checkHorizon(horizon);

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

  const context = await loadContext();
  const targetRoleId = id(roleId || employee.roleId);
  const role = context.roles.get(targetRoleId);

  if (!role) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Role not found"
    );
  }

  const { current, future } = evaluateEmployee(
    employee,
    role,
    context,
    selectedHorizon
  );

  return {
    employeeId: id(employee._id),
    role: {
      _id: id(role._id),
      title: role.title,
    },
    horizon: selectedHorizon,
    readiness: {
      current: current.readiness,
      future: future.readiness,
    },
    currentGaps: current.gaps,
    futureGaps: future.gaps,
    explanation: readinessExplanation(current),
  };
}

/**
 * Aggregate workforce readiness for P3's HR report.
 * Reuses the same calculation as getGaps().
 */
export async function getOrgReadiness() {
  const [context, employees] = await Promise.all([
    loadContext(),
    Employee.find().lean(),
  ]);

  const departmentMap = new Map();
  const gapCounts = new Map();

  let currentTotal = 0;
  let futureTotal = 0;
  let evaluated = 0;

  for (const employee of employees) {
    const role = context.roles.get(id(employee.roleId));

    if (!role) continue;

    const result = evaluateEmployee(
      employee,
      role,
      context,
      DEFAULT_HORIZON
    );

    evaluated++;
    currentTotal += result.current.readiness;
    futureTotal += result.future.readiness;

    const department = employee.department;

    if (!departmentMap.has(department)) {
      departmentMap.set(department, {
        name: department,
        employees: 0,
        totalReadiness: 0,
      });
    }

    const group = departmentMap.get(department);
    group.employees++;
    group.totalReadiness += result.current.readiness;

    for (const gap of result.current.gaps) {
      gapCounts.set(
        gap.skillName,
        (gapCounts.get(gap.skillName) || 0) + 1
      );
    }
  }

  const departments = [...departmentMap.values()]
    .map((group) => ({
      name: group.name,
      employees: group.employees,
      readiness: round(
        group.totalReadiness / group.employees
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const topGaps = [...gapCounts.entries()]
    .map(([skillName, employees]) => ({
      skillName,
      employees,
    }))
    .sort(
      (a, b) =>
        b.employees - a.employees ||
        a.skillName.localeCompare(b.skillName)
    )
    .slice(0, 10);

  return {
    current: evaluated
      ? round(currentTotal / evaluated)
      : 1,
    future: evaluated
      ? round(futureTotal / evaluated)
      : 1,
    topGaps,
    departments,
  };
}
