
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  login,
  getMe,
} from "../controllers/auth.controller.js";

const router = Router();

// Public route — login
router.post("/auth/login", login);

// Protected route — current user
router.get("/auth/me", requireAuth, getMe);

export default router;
