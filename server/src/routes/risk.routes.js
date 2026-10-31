
import { Router } from "express";

import {
  requireAuth,
  requireHR,
} from "../middleware/auth.js";

import { getRisk } from "../controllers/risk.controller.js";

const router = Router();

// R1 — Workforce skill shortage risk
// Only HR users can access this endpoint.
router.get(
  "/risk",
  requireAuth,
  requireHR,
  getRisk
);

export default router;
