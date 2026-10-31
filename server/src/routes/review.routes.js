
import { Router } from "express";

import {
  requireAuth,
  requireHR,
} from "../middleware/auth.js";

import {
  createReview,
  getReviews,
  updateReview,
} from "../controllers/review.controller.js";

const router = Router();

// V1 — Create an AI recommendation review
// Employees can request reviews for themselves.
// HR can request all review types.
router.post(
  "/reviews",
  requireAuth,
  createReview
);

// V2 — List reviews
// HR sees all; employees see only their own.
router.get(
  "/reviews",
  requireAuth,
  getReviews
);

// V3 — Approve, reject or modify a review
// HR only
router.patch(
  "/reviews/:id",
  requireAuth,
  requireHR,
  updateReview
);

export default router;
