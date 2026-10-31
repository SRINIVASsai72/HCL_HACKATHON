
import Employee from "../models/Employee.js";
import Role from "../models/Role.js";
import Skill from "../models/Skill.js";
import Project from "../models/Project.js";
import Forecast from "../models/Forecast.js";

import { AppError } from "../utils/http.js";

// Keep a score between 0 and 1
function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

// Determine shortage severity
function getBand(score) {
  if (score >= 0.5) return "high";
  if (score >= 0.2) return "medium";
  return "low";
}

// Calculate growth using the requested forecast horizon
function getGrowth(forecast, horizon) {
  const history = forecast.history || [];
  const predictions = forecast.predictions || [];

  const lastActual = history.at(-1)?.value;
  const futureValue = predictions[horizon - 1]?.value;

  if (
    !Number.isFinite(lastActual) ||
    !Number.isFinite(futureValue)
  ) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Forecast data is incomplete. Run npm run ai:build."
    );
  }

  // Avoid division by zero
  if (lastActual === 0) {
    return futureValue === 0 ? 0 : 100;
  }

  return ((futureValue - lastActual) / lastActual) * 100;
}

// B5 - Skill shortage risk calculation
export async function getSkillRisk({ horizon = 12 } = {}) {
  if (![6, 12].includes(horizon)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Horizon must be 6 or 12"
    );
  }

  // Fetch all necessary data together
  const [
    skills,
    roles,
    employees,
    projects,
    forecasts,
  ] = await Promise.all([
    Skill.find()
      .select("_id name category")
      .lean(),

    Role.find()
      .select("_id requiredSkills")
      .lean(),

    Employee.find()
      .select("roleId skills")
      .lean(),

    Project.find({
      status: { $in: ["active", "planned"] },
    })
      .select("requiredSkills")
      .lean(),

    Forecast.find()
      .select("skillId history predictions")
      .lean(),
  ]);

  // Forecasts must exist before calculating risk
  if (
    forecasts.length === 0 ||
    skills.some(
      (skill) =>
        !forecasts.some(
          (forecast) =>
            String(forecast.skillId) === String(skill._id)
        )
    )
  ) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Skill forecasts are missing. Run npm run ai:build."
    );
  }

  const roleMap = new Map(
    roles.map((role) => [
      String(role._id),
      role,
    ])
  );

  const forecastMap = new Map(
    forecasts.map((forecast) => [
      String(forecast.skillId),
      forecast,
    ])
  );

  // Initialize statistics for all 40 skills
  const stats = new Map();

  for (const skill of skills) {
    stats.set(String(skill._id), {
      skillId: skill._id,
      skillName: skill.name,
      category: skill.category,
      roleDemand: 0,
      projectDemand: 0,
      supply: 0,
      experts: 0,
    });
  }

  // Count employee supply and current-role demand
  for (const employee of employees) {
    const role = roleMap.get(String(employee.roleId));

    if (role) {
      const required = new Set(
        role.requiredSkills
          .filter((item) => item.level >= 3)
          .map((item) => String(item.skillId))
      );

      for (const skillId of required) {
        const stat = stats.get(skillId);

        if (stat) {
          stat.roleDemand += 1;
        }
      }
    }

    for (const item of employee.skills || []) {
      const stat = stats.get(String(item.skillId));

      if (!stat) continue;

      if (item.level >= 3) {
        stat.supply += 1;
      }

      if (item.level >= 4) {
        stat.experts += 1;
      }
    }
  }

  // Add staffing demand from active/planned projects
  for (const project of projects) {
    for (const item of project.requiredSkills || []) {
      const stat = stats.get(String(item.skillId));

      if (stat) {
        stat.projectDemand += item.headcount || 0;
      }
    }
  }

  const results = [];

  for (const stat of stats.values()) {
    const forecast = forecastMap.get(String(stat.skillId));

    const growthPct = getGrowth(forecast, horizon);

    // Current demand = role demand + project demand
    const demandNow =
      stat.roleDemand + stat.projectDemand;

    const projectedDemand = Math.max(
      0,
      demandNow * (1 + growthPct / 100)
    );

    const riskScore =
      projectedDemand === 0
        ? 0
        : clamp(
            (projectedDemand - stat.supply) /
              projectedDemand
          );

    const band = getBand(riskScore);

    const keyPersonRisk =
      stat.experts <= 1 && demandNow >= 3;

    // Explain the calculation using real data
    const summary =
      `${stat.skillName}: ${stat.roleDemand} role requirements ` +
      `and ${stat.projectDemand} project positions create ` +
      `${demandNow} current demand. ` +
      `There are ${stat.supply} employees with skill level 3+, ` +
      `including ${stat.experts} experts at level 4+. ` +
      `${horizon}-month forecast growth is ` +
      `${growthPct.toFixed(1)}%. ` +
      `Projected demand is ${projectedDemand.toFixed(1)}. ` +
      `Shortage risk is ${band}.` +
      (keyPersonRisk
        ? " Key-person risk exists because expert coverage is very limited."
        : "");

    results.push({
      skillId: stat.skillId,
      skillName: stat.skillName,
      category: stat.category,
      demandNow,
      projectedDemand,
      supply: stat.supply,
      riskScore,
      band,
      keyPersonRisk,
      experts: stat.experts,
      growthPct,
      explanation: {
        summary,
        factors: [
          {
            name: "Projected shortage fraction",
            value: riskScore,
            weight: 1,
            contribution: riskScore,
          },
        ],
      },
    });
  }

  // Highest-risk skills appear first
  results.sort((a, b) => {
    return (
      b.riskScore - a.riskScore ||
      a.skillName.localeCompare(b.skillName)
    );
  });

  return results;
}
