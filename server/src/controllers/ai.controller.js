// TODO: ai controllers — see docs/SHARED_CONTRACT.md

import { matchSkills } from "../ai/skillMatch.js";
import { getGaps } from "../ai/gaps.js";
import { getLearningPlan } from "../ai/learning.js";
import { getMobility } from "../ai/mobility.js";
import { getCareerPaths } from "../ai/career.js";
import { AppError, ok, isValidId } from "../utils/http.js";

function validateEmployeeId(value) {
  if (typeof value !== "string" || !isValidId(value)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid employee ID"
    );
  }
  return value;
}

function validateOptionalRoleId(value) {
  if (value === undefined) return undefined;

  if (typeof value !== "string" || !isValidId(value)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid role ID"
    );
  }

  return value;
}

// AI1: POST /ai/skills/match
export async function matchSkillsController(req, res) {
  const { text } = req.body ?? {};

  if (
    typeof text !== "string" ||
    !text.trim() ||
    text.length > 2000
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Text must contain 1 to 2000 characters"
    );
  }

  const result = await matchSkills(text);
  return ok(res, result);
}

// AI2: GET /ai/gaps/:employeeId
export async function gapsController(req, res) {
  const employeeId = validateEmployeeId(
    req.params.employeeId
  );

  const roleId = validateOptionalRoleId(req.query.roleId);
  const horizon = req.query.horizon ?? "12";

  if (!["6", "12"].includes(horizon)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "horizon must be 6 or 12"
    );
  }

  const result = await getGaps(employeeId, {
    roleId,
    horizon: Number(horizon),
  });

  return ok(res, result);
}

// AI3: GET /ai/learning/:employeeId
export async function learningController(req, res) {
  const employeeId = validateEmployeeId(
    req.params.employeeId
  );

  const roleId = validateOptionalRoleId(req.query.roleId);

  const result = await getLearningPlan(employeeId, {
    roleId,
  });

  return ok(res, result);
}

// AI4: GET /ai/mobility/:employeeId
export async function mobilityController(req, res) {
  const employeeId = validateEmployeeId(
    req.params.employeeId
  );

  const result = await getMobility(employeeId);
  return ok(res, result);
}

// AI5: GET /ai/career/:employeeId
export async function careerController(req, res) {
  const employeeId = validateEmployeeId(
    req.params.employeeId
  );

  const targetRoleId = validateOptionalRoleId(
    req.query.targetRoleId
  );

  const result = await getCareerPaths(employeeId, {
    targetRoleId,
  });

  return ok(res, result);
}
