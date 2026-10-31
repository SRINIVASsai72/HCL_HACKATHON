
import { Router } from "express";

import {
  requireAuth,
  requireHR,
  requireSelfOrHR,
} from "../middleware/auth.js";

import {
  getEmployees,
  getEmployee,
  updateEmployeeSkills,
  getSkills,
  getRoles,
  getCourses,
} from "../controllers/employee.controller.js";

const router = Router();

// E1 — HR employee directory
router.get(
  "/employees",
  requireAuth,
  requireHR,
  getEmployees
);

// E2 — Employee profile
router.get(
  "/employees/:id",
  requireAuth,
  requireSelfOrHR("id"),
  getEmployee
);

// E3 — Replace employee skills
router.put(
  "/employees/:id/skills",
  requireAuth,
  requireSelfOrHR("id"),
  updateEmployeeSkills
);

// E4 — Skills catalog
router.get("/skills", requireAuth, getSkills);

// E5 — Roles catalog
router.get("/roles", requireAuth, getRoles);

// E6 — Courses catalog
router.get("/courses", requireAuth, getCourses);

export default router;
