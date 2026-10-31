
import * as ss from "simple-statistics";
import MarketDemand from "../models/MarketDemand.js";
import Forecast from "../models/Forecast.js";
import { AppError } from "../utils/http.js";

const TRAINING_MONTHS = 12;
const BACKTEST_MONTHS = 24;
const HOLDOUT_MONTHS = 6;
const FORECAST_MONTHS = 12;
const INTERVAL_MULTIPLIER = 1.28;

const round = (value, digits = 3) =>
  Number(value.toFixed(digits));

function validValues(values, minimum = 12) {
  if (
    !Array.isArray(values) ||
    values.length < minimum ||
    values.some(
      (v) => !Number.isFinite(v) || v < 0
    )
  ) {
    throw new TypeError(
      `Expected at least ${minimum} nonnegative demand values`
    );
  }
}

// Produce the YYYY-MM for a future month.
function addMonths(month, offset) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new Error(`Invalid month: ${month}`);
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + monthNumber - 1 + offset;

  const newYear = Math.floor(index / 12);
  const newMonth = (index % 12) + 1;

  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

// Convert percentage growth into a trend label.
function classifyTrend(growth) {
  if (growth >= 40) return "emerging";
  if (growth >= 10) return "growing";
  if (growth <= -10) return "declining";
  return "stable";
}

// Handle percentage growth when the starting value is zero.
function percentageGrowth(start, end) {
  if (start === 0) {
    return end === 0 ? 0 : 100;
  }

  return ((end - start) / start) * 100;
}

// Calculate errors on observations not used for training.
function calculateErrors(actual, predicted) {
  const errors = actual.map((value, index) =>
    Math.abs(value - predicted[index])
  );

  const mae = ss.mean(errors);

  // Zero actual demand has undefined percentage error.
  // Exclude it from MAPE, but keep it in MAE.
  const percentageErrors = actual
    .map((value, index) =>
      value > 0 ? (errors[index] / value) * 100 : null
    )
    .filter((value) => value !== null);

  return {
    mae: round(mae),
    mape: percentageErrors.length
      ? round(ss.mean(percentageErrors))
      : null,
  };
}

/**
 * Fit regression on the last 12 observations.
 *
 * Returns:
 * {
 *   predictions: [{ value, low, high }],
 *   params: { slope, intercept }
 * }
 *
 * The bounds are a heuristic residual-spread interval,
 * not a calibrated statistical prediction interval.
 */
export function linearForecast(values, steps = 12) {
  validValues(values);

  if (!Number.isInteger(steps) || steps < 1) {
    throw new TypeError("steps must be a positive integer");
  }

  const training = values.slice(-TRAINING_MONTHS);

  const points = training.map((value, index) => [
    index,
    value,
  ]);

  const { m, b } = ss.linearRegression(points);
  const predict = ss.linearRegressionLine({ m, b });

  const residuals = training.map(
    (value, index) => value - predict(index)
  );

  const spread =
    INTERVAL_MULTIPLIER * ss.standardDeviation(residuals);

  const predictions = Array.from(
    { length: steps },
    (_, index) => {
      const raw = predict(TRAINING_MONTHS + index);
      const value = Math.max(0, raw);

      return {
        value: round(value),
        low: round(Math.max(0, raw - spread)),
        high: round(Math.max(0, raw + spread)),
      };
    }
  );

  return {
    predictions,
    params: {
      slope: round(m, 6),
      intercept: round(b, 6),
    },
  };
}

/**
 * Held-out backtesting:
 * - Use the most recent 24 observations.
 * - First 18 are historical training data.
 * - Last 6 are unseen test data.
 * - Regression fits only the last 12 training months.
 * - Naive baseline repeats the last training value.
 *
 * Returns MAE/MAPE and baseline comparison.
 * For fewer than 24 values, metrics are unavailable.
 */
export function backtest(values) {
  if (!Array.isArray(values)) {
    throw new TypeError("values must be an array");
  }

  if (values.length < BACKTEST_MONTHS) {
    return {
      mae: null,
      mape: null,
      naiveMae: null,
      naiveMape: null,
      beatsNaive: null,
    };
  }

  validValues(values, BACKTEST_MONTHS);

  const recent = values.slice(-BACKTEST_MONTHS);
  const training = recent.slice(0, -HOLDOUT_MONTHS);
  const actual = recent.slice(-HOLDOUT_MONTHS);

  const predicted = linearForecast(
    training,
    HOLDOUT_MONTHS
  ).predictions.map((item) => item.value);

  const naivePrediction = Array(
    HOLDOUT_MONTHS
  ).fill(training.at(-1));

  const model = calculateErrors(actual, predicted);
  const naive = calculateErrors(actual, naivePrediction);

  return {
    mae: model.mae,
    mape: model.mape,
    naiveMae: naive.mae,
    naiveMape: naive.mape,
    beatsNaive: model.mae < naive.mae,
  };
}

/**
 * Generate forecasts from synthetic historical demand.
 *
 * Returns exactly:
 * { count, avgMape, avgNaiveMape, pctBeatNaive }
 *
 * Missing evaluation metrics remain null.
 */
export async function runAllForecasts() {
  const records = await MarketDemand.find({
    source: "synthetic",
  })
    .sort({ skillId: 1, month: 1 })
    .lean();

  if (!records.length) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "No synthetic market data found. Seed the database and run npm run ai:build"
    );
  }

  const grouped = new Map();

  for (const record of records) {
    if (
      !Number.isFinite(record.value) ||
      record.value < 0 ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(record.month)
    ) {
      continue;
    }

    const key = String(record.skillId);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(record);
  }

  const forecasts = [];

  for (const [skillId, historyRecords] of grouped) {
    if (historyRecords.length < TRAINING_MONTHS) {
      continue;
    }

    const values = historyRecords.map(
      (record) => record.value
    );

    const lastRecord = historyRecords.at(-1);

    const result = linearForecast(
      values,
      FORECAST_MONTHS
    );

    const metrics = backtest(values);

    const predictions = result.predictions.map(
      (item, index) => ({
        month: addMonths(lastRecord.month, index + 1),
        ...item,
      })
    );

    const growthPct = round(
      percentageGrowth(
        lastRecord.value,
        predictions.at(-1).value
      )
    );

    forecasts.push({
      skillId,
      method: "linear_regression",
      history: historyRecords.map((record) => ({
        month: record.month,
        value: record.value,
      })),
      predictions,
      growthPct,
      trend: classifyTrend(growthPct),
      metrics,
      params: result.params,
      source: "synthetic",
    });
  }

  if (!forecasts.length) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "At least 12 months of demand history are required. Seed the database and run npm run ai:build"
    );
  }

  // Replace old results instead of creating duplicates.
  await Forecast.deleteMany({});
  await Forecast.insertMany(forecasts);

  const evaluated = forecasts.filter(
    (forecast) => forecast.metrics.mae !== null
  );

  const availableMape = evaluated.filter(
    (forecast) =>
      forecast.metrics.mape !== null &&
      forecast.metrics.naiveMape !== null
  );

  const avgMape = availableMape.length
    ? round(
        ss.mean(
          availableMape.map((f) => f.metrics.mape)
        )
      )
    : null;

  const avgNaiveMape = availableMape.length
    ? round(
        ss.mean(
          availableMape.map((f) => f.metrics.naiveMape)
        )
      )
    : null;

  const pctBeatNaive = evaluated.length
    ? round(
        (evaluated.filter(
          (f) => f.metrics.beatsNaive
        ).length / evaluated.length) * 100
      )
    : null;

  return {
    count: forecasts.length,
    avgMape,
    avgNaiveMape,
    pctBeatNaive,
  };
}
