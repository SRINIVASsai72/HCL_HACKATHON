// TODO: market controllers — see docs/SHARED_CONTRACT.md

import { readFile } from "node:fs/promises";

import Skill from "../models/Skill.js";
import Forecast from "../models/Forecast.js";

import { getTrends } from "../ai/trends.js";
import { runAllForecasts } from "../ai/forecast.js";

import {
  AppError,
  ok,
  isValidId,
} from "../utils/http.js";

const EVALUATION_FILE = new URL(
  "../../eval-results.json",
  import.meta.url
);

const CATEGORIES = [
  "language",
  "frontend",
  "backend",
  "data",
  "ai_ml",
  "cloud_devops",
  "testing",
  "embedded",
];

const id = (value) => String(value);

// Verify that the forecast database is ready.
function requireForecasts(forecasts) {
  if (!forecasts.length) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Forecasts are missing. Run npm run ai:build"
    );
  }
}

// Validate MongoDB skill IDs.
function validateSkillId(value) {
  if (
    typeof value !== "string" ||
    !isValidId(value)
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid skill ID"
    );
  }

  return value;
}

// M1: GET /market/trends
export async function marketTrendsController(req, res) {
  const { category } = req.query;

  if (
    category !== undefined &&
    (
      typeof category !== "string" ||
      !CATEGORIES.includes(category)
    )
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid skill category"
    );
  }

  const trends = await getTrends({ category });

  return ok(res, trends);
}

// M2: GET /market/forecasts
export async function forecastsController(req, res) {
  const [forecasts, skills] = await Promise.all([
    Forecast.find().lean(),
    Skill.find()
      .select("_id name category")
      .lean(),
  ]);

  requireForecasts(forecasts);

  const skillMap = new Map(
    skills.map((skill) => [id(skill._id), skill])
  );

  const results = forecasts.map((forecast) => {
    const skill = skillMap.get(
      id(forecast.skillId)
    );

    if (!skill) {
      throw new AppError(
        503,
        "AI_NOT_READY",
        "Forecast references an unknown skill. Run npm run ai:build"
      );
    }

    const lastActual =
      forecast.history?.at(-1);

    const lastPrediction =
      forecast.predictions?.at(-1);

    if (!lastActual || !lastPrediction) {
      throw new AppError(
        503,
        "AI_NOT_READY",
        "Forecast data is incomplete. Run npm run ai:build"
      );
    }

    return {
      skillId: id(skill._id),
      skillName: skill.name,
      category: skill.category,
      lastValue: lastActual.value,
      nextYearValue: lastPrediction.value,
      growthPct: forecast.growthPct,
      trend: forecast.trend,
      mape: forecast.metrics?.mape ?? null,
    };
  });

  results.sort(
    (a, b) =>
      b.growthPct - a.growthPct ||
      a.skillName.localeCompare(b.skillName)
  );

  return ok(res, results);
}

// M3: GET /market/forecasts/:skillId
export async function forecastDetailController(req, res) {
  const skillId = validateSkillId(
    req.params.skillId
  );

  const skill = await Skill.findById(skillId)
    .select("_id name")
    .lean();

  if (!skill) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Skill not found"
    );
  }

  const forecast = await Forecast.findOne({
    skillId: skill._id,
  }).lean();

  if (!forecast) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Skill forecast is missing. Run npm run ai:build"
    );
  }

  if (
    !forecast.history?.length ||
    !forecast.predictions?.length
  ) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "Forecast is incomplete. Run npm run ai:build"
    );
  }

  // These are model diagnostics, not additive
  // factors of a recommendation score.
  const explanation = {
    summary:
      "This forecast uses linear regression fitted to " +
      "the latest 12 months of historical demand. " +
      "The displayed 80% residual-spread band is " +
      "heuristic, not a calibrated prediction interval. " +
      "The market data is synthetic and does not " +
      "establish real-world predictive accuracy.",
    factors: [],
  };

  const result = {
    skillId: id(skill._id),
    skillName: skill.name,
    method: forecast.method,
    history: forecast.history.map((item) => ({
      month: item.month,
      value: item.value,
    })),
    predictions: forecast.predictions.map(
      (item) => ({
        month: item.month,
        value: item.value,
        low: item.low,
        high: item.high,
      })
    ),
    growthPct: forecast.growthPct,
    trend: forecast.trend,
    metrics: {
      mae: forecast.metrics?.mae ?? null,
      mape: forecast.metrics?.mape ?? null,
      naiveMae:
        forecast.metrics?.naiveMae ?? null,
      naiveMape:
        forecast.metrics?.naiveMape ?? null,
      beatsNaive:
        forecast.metrics?.beatsNaive ?? null,
    },
    source: forecast.source,
    explanation,
  };

  return ok(res, result);
}

// M4: POST /market/forecasts/run
// HR authorization is enforced in market.routes.js.
export async function runForecastsController(req, res) {
  const summary = await runAllForecasts();

  return ok(res, summary);
}

// M5: GET /market/evaluation
export async function evaluationController(req, res) {
  let content;

  try {
    content = await readFile(
      EVALUATION_FILE,
      "utf8"
    );
  } catch (error) {
    // Evaluation has not been executed yet.
    if (error.code === "ENOENT") {
      return ok(res, null);
    }

    throw error;
  }

  let evaluation;

  try {
    evaluation = JSON.parse(content);
  } catch {
    throw new AppError(
      500,
      "SERVER_ERROR",
      "Evaluation results file contains invalid JSON"
    );
  }

  return ok(res, evaluation);
}
