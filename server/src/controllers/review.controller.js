
import Review from "../models/Review.js";
import Employee from "../models/Employee.js";
import Skill from "../models/Skill.js";
import Role from "../models/Role.js";

import { REVIEW_TYPES, REVIEW_STATUS } from "../constants.js";
import { ok, AppError, isValidId } from "../utils/http.js";

import { getLearningPlan } from "../ai/learning.js";
import { getMobility } from "../ai/mobility.js";
import { getCareerPaths } from "../ai/career.js";
import { getSkillRisk } from "../analytics/risk.js";

// Validate an optional or required MongoDB ID
function checkId(id, name, required = false) {
  if (id === undefined || id === null || id === "") {
    if (required) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        `${name} is required`
      );
    }
    return null;
  }

  if (typeof id !== "string" || !isValidId(id)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      `Invalid ${name}`
    );
  }

  return id;
}

// Convert MongoDB review into shared frontend response
function formatReview(review) {
  const r = review.toObject
    ? review.toObject()
    : review;

  return {
    _id: r._id,
    type: r.type,
    employee: r.employeeId
      ? {
          _id: r.employeeId._id,
          code: r.employeeId.code,
          name: r.employeeId.name,
        }
      : null,
    skill: r.skillId
      ? {
          _id: r.skillId._id,
          name: r.skillId.name,
        }
      : null,
    roleId: r.roleId ?? null,
    aiOutput: r.aiOutput,
    status: r.status,
    comment: r.comment ?? "",
    modifiedOutput: r.modifiedOutput ?? null,
    createdBy: r.createdBy,
    decidedBy: r.decidedBy ?? null,
    decidedAt: r.decidedAt ?? null,
    createdAt: r.createdAt,
  };
}

// Populate employee and skill display information
async function populateReview(review) {
  await review.populate([
    { path: "employeeId", select: "code name" },
    { path: "skillId", select: "name" },
  ]);

  return formatReview(review);
}

// V1: POST /reviews
export async function createReview(req, res) {
  const {
    type,
    employeeId,
    skillId,
    roleId,
  } = req.body || {};

  if (
    typeof type !== "string" ||
    !REVIEW_TYPES.includes(type)
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid review type"
    );
  }

  const isHR = req.user.role === "hr";

  // Employees cannot request HR-only risk reviews
  if (!isHR && type === "risk") {
    throw new AppError(
      403,
      "FORBIDDEN",
      "Risk reviews are HR only"
    );
  }

  const validEmployeeId = checkId(
    employeeId,
    "employeeId",
    type !== "risk"
  );

  const validSkillId = checkId(
    skillId,
    "skillId",
    type === "risk"
  );

  const validRoleId = checkId(
    roleId,
    "roleId"
  );

  // Enforce the permitted parameters for each type
  if (type === "risk") {
    if (validEmployeeId || validRoleId) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        "Risk reviews require skillId only"
      );
    }
  } else {
    if (validSkillId) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        "skillId is only allowed for risk reviews"
      );
    }

    if (type === "mobility" && validRoleId) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        "Mobility reviews do not accept roleId"
      );
    }
  }

  // Verify employee existence and ownership
  if (validEmployeeId) {
    const employee = await Employee.findById(
      validEmployeeId
    );

    if (!employee) {
      throw new AppError(
        404,
        "NOT_FOUND",
        "Employee not found"
      );
    }

    if (
      !isHR &&
      String(req.user.employeeId) !==
        String(employee._id)
    ) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Cannot create a review for another employee"
      );
    }
  }

  // Verify referenced role
  if (validRoleId) {
    const role = await Role.findById(validRoleId);

    if (!role) {
      throw new AppError(
        404,
        "NOT_FOUND",
        "Role not found"
      );
    }
  }

  // Verify referenced skill
  if (validSkillId) {
    const skill = await Skill.findById(validSkillId);

    if (!skill) {
      throw new AppError(
        404,
        "NOT_FOUND",
        "Skill not found"
      );
    }
  }

  // Generate AI output on the server.
  // Never accept aiOutput from the browser.
  let aiOutput;

  switch (type) {
    case "learning":
      aiOutput = await getLearningPlan(
        validEmployeeId,
        { roleId: validRoleId }
      );
      break;

    case "mobility":
      aiOutput = await getMobility(
        validEmployeeId
      );
      break;

    case "career":
      aiOutput = await getCareerPaths(
        validEmployeeId,
        { targetRoleId: validRoleId }
      );
      break;

    case "risk": {
      const risks = await getSkillRisk({
        horizon: 12,
      });

      aiOutput = risks.find(
        (item) =>
          String(item.skillId) === String(validSkillId)
      );

      if (!aiOutput) {
        throw new AppError(
          404,
          "NOT_FOUND",
          "Skill risk result not found"
        );
      }

      break;
    }
  }

  if (
    !aiOutput ||
    typeof aiOutput !== "object" ||
    Array.isArray(aiOutput)
  ) {
    throw new AppError(
      503,
      "AI_NOT_READY",
      "AI recommendation is unavailable"
    );
  }

  // Save recommendation snapshot
  const review = await Review.create({
    type,
    employeeId: validEmployeeId,
    skillId: validSkillId,
    roleId: validRoleId,
    aiOutput,
    status: "pending",
    createdBy: req.user.userId,
  });

  const result = await populateReview(review);

  return ok(res, result);
}

// V2: GET /reviews
export async function getReviews(req, res) {
  const { status, type } = req.query;

  if (
    status !== undefined &&
    (
      typeof status !== "string" ||
      !REVIEW_STATUS.includes(status)
    )
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid review status"
    );
  }

  if (
    type !== undefined &&
    (
      typeof type !== "string" ||
      !REVIEW_TYPES.includes(type)
    )
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid review type"
    );
  }

  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (type) {
    filter.type = type;
  }

  // Employees see only reviews about themselves
  if (req.user.role !== "hr") {
    if (!req.user.employeeId) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Employee profile is not linked"
      );
    }

    filter.employeeId = req.user.employeeId;
  }

  const reviews = await Review.find(filter)
    .populate("employeeId", "code name")
    .populate("skillId", "name")
    .sort({ createdAt: -1 });

  return ok(res, reviews.map(formatReview));
}

// V3: PATCH /reviews/:id
// HR only - atomic approval decision
export async function updateReview(req, res) {
  const { id } = req.params;

  checkId(id, "review ID", true);

  const {
    status,
    comment,
    modifiedOutput,
  } = req.body || {};

  const allowedStatuses = [
    "approved",
    "rejected",
    "modified",
  ];

  if (!allowedStatuses.includes(status)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Status must be approved, rejected or modified"
    );
  }

  if (
    comment !== undefined &&
    typeof comment !== "string"
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Comment must be a string"
    );
  }

  const cleanComment = comment?.trim() ?? "";

  if (
    (status === "rejected" || status === "modified") &&
    !cleanComment
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Comment is required for rejection or modification"
    );
  }

  if (status === "modified") {
    if (
      !modifiedOutput ||
      typeof modifiedOutput !== "object" ||
      Array.isArray(modifiedOutput) ||
      Object.keys(modifiedOutput).length === 0 ||
      Object.keys(modifiedOutput).some(
        (key) =>
          key.startsWith("$") ||
          key.includes(".") ||
          key === "__proto__"
      )
    ) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        "modifiedOutput must be a non-empty object"
      );
    }
  } else if (modifiedOutput !== undefined) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "modifiedOutput is only allowed for modified reviews"
    );
  }

  const changes = {
    status,
    comment: cleanComment,
    decidedBy: req.user.userId,
    decidedAt: new Date(),
  };

  if (status === "modified") {
    changes.modifiedOutput = modifiedOutput;
  }

  // Atomic update:
  // Only a pending review can be decided.
  const updated = await Review.findOneAndUpdate(
    {
      _id: id,
      status: "pending",
    },
    {
      $set: changes,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updated) {
    const existing = await Review.findById(id);

    if (!existing) {
      throw new AppError(
        404,
        "NOT_FOUND",
        "Review not found"
      );
    }

    throw new AppError(
      409,
      "CONFLICT",
      "Review has already been decided"
    );
  }

  const result = await populateReview(updated);

  return ok(res, result);
}
