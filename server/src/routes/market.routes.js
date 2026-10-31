
import { Router } from "express";

import {
  requireAuth,
  requireHR,
} from "../middleware/auth.js";

import {
  marketTrendsController,
  forecastsController,
  forecastDetailController,
  runForecastsController,
  evaluationController,
} from "../controllers/market.controller.js";

const router = Router();

/**
 * M1 — Historical Market Trends
 *
 * GET /api/market/trends
 * Access: Authenticated users
 *
 * Optional query:
 * ?category=frontend
 */
router.get(
  "/market/trends",
  requireAuth,
  marketTrendsController
);

/**
 * M2 — All Skill Demand Forecasts
 *
 * GET /api/market/forecasts
 * Access: Authenticated users
 *
 * Returns forecasts sorted by
 * predicted growth percentage.
 */
router.get(
  "/market/forecasts",
  requireAuth,
  forecastsController
);

/**
 * M3 — Individual Skill Forecast
 *
 * GET /api/market/forecasts/:skillId
 * Access: Authenticated users
 *
 * Returns detailed historical data,
 * 12-month predictions and metrics.
 */
router.get(
  "/market/forecasts/:skillId",
  requireAuth,
  forecastDetailController
);

/**
 * M4 — Regenerate Skill Forecasts
 *
 * POST /api/market/forecasts/run
 * Access: HR only
 *
 * Runs the linear regression forecasting
 * algorithm using stored market-demand data.
 */
router.post(
  "/market/forecasts/run",
  requireAuth,
  requireHR,
  runForecastsController
);

/**
 * M5 — AI Model Evaluation
 *
 * GET /api/market/evaluation
 * Access: Authenticated users
 *
 * Returns stored evaluation results,
 * or null if evaluation has not run.
 */
router.get(
  "/market/evaluation",
  requireAuth,
  evaluationController
);

export default router;
