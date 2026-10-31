
import Employee from "../models/Employee.js";
import LearningRecord from "../models/LearningRecord.js";
import Review from "../models/Review.js";
import Forecast from "../models/Forecast.js";

import { getOrgReadiness } from "../ai/gaps.js";
import { getTrends } from "../ai/trends.js";
import { getSkillRisk } from "./risk.js";

import { AppError } from "../utils/http.js";

function fraction(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function average(values) {
  if (values.length === 0) return 0;

  return values.reduce((sum, x) => sum + x, 0) /
    values.length;
}

function requireNumber(value, name) {
  if (typeof value !== "number" ||
      !Number.isFinite(value)) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      `Invalid AI metric: ${name}`
    );
  }

  return value;
}

function validateReadiness(value, name) {
  const number = requireNumber(value, name);

  if (number < 0 || number > 1) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      `${name} must be between 0 and 1`
    );
  }

  return fraction(number);
}

// RP1 — Build live workforce report
export async function buildReport() {
  const [
    employees,
    learningRecords,
    reviewCounts,
    forecasts,
    readiness,
    trends,
    risks,
  ] = await Promise.all([
    Employee.find()
      .select("department skills")
      .lean(),

    LearningRecord.find()
      .select("status")
      .lean(),

    Review.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    Forecast.find()
      .select("metrics")
      .lean(),

    getOrgReadiness(),
    getTrends({}),
    getSkillRisk({ horizon: 12 }),
  ]);

  // Require the complete forecast dataset.
  const forecastCount = await Forecast.countDocuments();

  const skillCount = risks.length;

  if (
    skillCount === 0 ||
    forecasts.length !== skillCount ||
    forecastCount !== skillCount
  ) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Forecast data is incomplete. Run npm run ai:build."
    );
  }

  // Workforce information
  const employeeCount = employees.length;

  const departmentsPresent = new Set(
    employees.map((employee) => employee.department)
  );

  const avgSkillsPerEmployee = employeeCount
    ? employees.reduce(
        (sum, employee) =>
          sum + employee.skills.length,
        0
      ) / employeeCount
    : 0;

  const workforce = {
    employees: employeeCount,
    departments: departmentsPresent.size,
    avgSkillsPerEmployee,
  };

  // Organization readiness from P4
  if (
    !readiness ||
    !Array.isArray(readiness.topGaps) ||
    !Array.isArray(readiness.departments)
  ) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Organization readiness is unavailable"
    );
  }

  const current = validateReadiness(
    readiness.current,
    "readiness.current"
  );

  const future = validateReadiness(
    readiness.future,
    "readiness.future"
  );

  const topGaps = readiness.topGaps.map((item) => ({
    skillName: item.skillName,
    employees: item.employees,
  }));

  const departments = readiness.departments.map(
    (item) => ({
      name: item.name,
      employees: item.employees,
      readiness: validateReadiness(
        item.readiness,
        `department ${item.name} readiness`
      ),
    })
  );

  // Market trends from P4
  if (!Array.isArray(trends)) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Market trends are unavailable"
    );
  }

  const emerging = trends
    .filter((item) => item.trend === "emerging")
    .map((item) => ({
      skillName: item.skillName,
      growthPct: item.growthPct,
    }))
    .sort((a, b) => b.growthPct - a.growthPct);

  const declining = trends
    .filter((item) => item.trend === "declining")
    .map((item) => ({
      skillName: item.skillName,
      growthPct: item.growthPct,
    }))
    .sort((a, b) => a.growthPct - b.growthPct);

  // Workforce skill shortage risk
  const risk = {
    high: risks.filter(
      (item) => item.band === "high"
    ).length,

    medium: risks.filter(
      (item) => item.band === "medium"
    ).length,

    low: risks.filter(
      (item) => item.band === "low"
    ).length,

    top: risks.slice(0, 5).map((item) => ({
      skillName: item.skillName,
      riskScore: fraction(item.riskScore),
    })),
  };

  // Learning record statistics
  const completed = learningRecords.filter(
    (record) => record.status === "completed"
  ).length;

  const learning = {
    records: learningRecords.length,
    completionRate: learningRecords.length
      ? fraction(
          completed / learningRecords.length
        )
      : 0,
  };

  // Review decision statistics
  const reviews = {
    pending: 0,
    approved: 0,
    rejected: 0,
    modified: 0,
  };

  for (const item of reviewCounts) {
    if (
      Object.prototype.hasOwnProperty.call(
        reviews,
        item._id
      )
    ) {
      reviews[item._id] = item.count;
    }
  }

  // Forecast quality from saved P4 evaluations
  for (const forecast of forecasts) {
    const m = forecast.metrics;

    if (
      !m ||
      !Number.isFinite(m.mape) ||
      !Number.isFinite(m.naiveMape) ||
      typeof m.beatsNaive !== "boolean"
    ) {
      throw new AppError(
        503,
        "AI_NOT_READY",
        "Forecast evaluation metrics are incomplete"
      );
    }
  }

  const avgMape = average(
    forecasts.map((f) => f.metrics.mape)
  );

  const avgNaiveMape = average(
    forecasts.map((f) => f.metrics.naiveMape)
  );

  const beatCount = forecasts.filter(
    (f) => f.metrics.beatsNaive
  ).length;

  const pctBeatNaive =
    (beatCount / forecasts.length) * 100;

  const forecastQuality = {
    avgMape,
    avgNaiveMape,
    pctBeatNaive,
  };

  // Exact shared Report response
  return {
    generatedAt: new Date().toISOString(),
    dataSource: "synthetic",

    workforce,

    readiness: {
      current,
      future,
    },

    topGaps,

    trends: {
      emerging,
      declining,
    },

    risk,

    learning,

    reviews,

    forecastQuality,

    departments,
  };
}
