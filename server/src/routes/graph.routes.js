
import { Router } from "express";

import {
  requireAuth,
  requireHR,
} from "../middleware/auth.js";

import {
  getEmployeeGraph,
  getSkillGraph,
  getGraphStats,
} from "../controllers/graph.controller.js";

const router = Router();

// G1 — Employee knowledge graph (HR only)
router.get(
  "/graph/employee/:id",
  requireAuth,
  requireHR,
  getEmployeeGraph
);

// G2 — Skill knowledge graph (HR only)
router.get(
  "/graph/skill/:id",
  requireAuth,
  requireHR,
  getSkillGraph
);

// G3 — Overall knowledge graph statistics (HR only)
router.get(
  "/graph/stats",
  requireAuth,
  requireHR,
  getGraphStats
);

export default router;
