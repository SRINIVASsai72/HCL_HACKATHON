
import { Router } from "express";

import {
  requireAuth,
  requireHR,
} from "../middleware/auth.js";

import {
  getWorkforceReport,
} from "../controllers/report.controller.js";

const router = Router();

// RP1 — Generate live workforce analytics report
// Accessible only to authenticated HR users
router.get(
  "/reports/workforce",
  requireAuth,
  requireHR,
  getWorkforceReport
);

export default router;
