
import { Router } from "express";

import {
  requireAuth,
  requireSelfOrHR,
} from "../middleware/auth.js";

import {
  matchSkillsController,
  gapsController,
  learningController,
  mobilityController,
  careerController,
} from "../controllers/ai.controller.js";

const router = Router();

/**
 * AI1 — Skill Matching
 * POST /api/ai/skills/match
 *
 * Access: Any authenticated user
 * Body: { text: string }
 */
router.post(
  "/ai/skills/match",
  requireAuth,
  matchSkillsController
);

/**
 * AI2 — Skill Gap Analysis
 * GET /api/ai/gaps/:employeeId
 *
 * Access: Employee themselves or HR
 * Query: roleId (optional), horizon=6|12
 */
router.get(
  "/ai/gaps/:employeeId",
  requireAuth,
  requireSelfOrHR("employeeId"),
  gapsController
);

/**
 * AI3 — Learning Recommendations
 * GET /api/ai/learning/:employeeId
 *
 * Access: Employee themselves or HR
 * Query: roleId (optional)
 */
router.get(
  "/ai/learning/:employeeId",
  requireAuth,
  requireSelfOrHR("employeeId"),
  learningController
);

/**
 * AI4 — Internal Mobility
 * GET /api/ai/mobility/:employeeId
 *
 * Access: Employee themselves or HR
 */
router.get(
  "/ai/mobility/:employeeId",
  requireAuth,
  requireSelfOrHR("employeeId"),
  mobilityController
);

/**
 * AI5 — Career Progression
 * GET /api/ai/career/:employeeId
 *
 * Access: Employee themselves or HR
 * Query: targetRoleId (optional)
 */
router.get(
  "/ai/career/:employeeId",
  requireAuth,
  requireSelfOrHR("employeeId"),
  careerController
);

export default router;
