
import Employee from "../models/Employee.js";
import Skill from "../models/Skill.js";
import Role from "../models/Role.js";
import Course from "../models/Course.js";
import LearningRecord from "../models/LearningRecord.js";

import { DEPARTMENTS } from "../constants.js";
import { ok, AppError, isValidId } from "../utils/http.js";

// Helper: validate MongoDB ObjectId
function validateId(id) {
  if (!isValidId(id)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid MongoDB ID"
    );
  }
}

// Helper: return exact employee profile shape
async function buildProfile(id) {
  validateId(id);

  const employee = await Employee.findById(id)
    .populate("roleId", "title level")
    .populate("skills.skillId", "name category")
    .populate("interests", "title")
    .lean();

  if (!employee) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Employee not found"
    );
  }

  const learningRecords = await LearningRecord.aggregate([
    { $match: { employeeId: employee._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const learning = {
    completed: 0,
    enrolled: 0,
    dropped: 0,
  };

  for (const record of learningRecords) {
    if (record._id in learning) {
      learning[record._id] = record.count;
    }
  }

  return {
    _id: employee._id,
    code: employee.code,
    name: employee.name,
    department: employee.department,
    role: employee.roleId
      ? {
          _id: employee.roleId._id,
          title: employee.roleId.title,
          level: employee.roleId.level,
        }
      : null,
    skills: employee.skills.map((item) => ({
      skillId: item.skillId?._id ?? item.skillId,
      name: item.skillId?.name ?? "",
      category: item.skillId?.category ?? "",
      level: item.level,
    })),
    interests: employee.interests.map((item) => ({
      _id: item._id,
      title: item.title,
    })),
    learning,
  };
}

// E1: GET /employees
// HR only - list and filter employees
export async function getEmployees(req, res) {
  const { search, department } = req.query;

  if (
    search !== undefined &&
    typeof search !== "string"
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid search filter"
    );
  }

  if (
    department !== undefined &&
    (
      typeof department !== "string" ||
      (department && !DEPARTMENTS.includes(department))
    )
  ) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Invalid department"
    );
  }

  const filter = {};

  if (department) {
    filter.department = department;
  }

  if (search?.trim()) {
    const escaped = search.trim().replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { code: { $regex: escaped, $options: "i" } },
    ];
  }

  const employees = await Employee.find(filter)
    .populate("roleId", "title")
    .sort({ code: 1 })
    .lean();

  const result = employees.map((employee) => ({
    _id: employee._id,
    code: employee.code,
    name: employee.name,
    department: employee.department,
    role: employee.roleId
      ? {
          _id: employee.roleId._id,
          title: employee.roleId.title,
        }
      : null,
    skillCount: employee.skills.length,
  }));

  return ok(res, result);
}

// E2: GET /employees/:id
// HR or the employee themselves
export async function getEmployee(req, res) {
  const profile = await buildProfile(req.params.id);

  return ok(res, profile);
}

// E3: PUT /employees/:id/skills
// Full replacement of employee skills
export async function updateEmployeeSkills(req, res) {
  const { id } = req.params;

  validateId(id);

  const employee = await Employee.findById(id);

  if (!employee) {
    throw new AppError(
      404,
      "NOT_FOUND",
      "Employee not found"
    );
  }

  const { skills } = req.body || {};

  if (!Array.isArray(skills)) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "skills must be an array"
    );
  }

  const seen = new Set();

  for (const item of skills) {
    if (
      !item ||
      !isValidId(item.skillId) ||
      !Number.isInteger(item.level) ||
      item.level < 1 ||
      item.level > 5
    ) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        "Each skill needs a valid skillId and level 1-5"
      );
    }

    const key = String(item.skillId);

    if (seen.has(key)) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        "Duplicate skill IDs are not allowed"
      );
    }

    seen.add(key);
  }

  const validSkills = await Skill.find({
    _id: { $in: [...seen] },
  })
    .select("_id")
    .lean();

  if (validSkills.length !== seen.size) {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "One or more skills do not exist"
    );
  }

  employee.skills = skills.map((item) => ({
    skillId: item.skillId,
    level: item.level,
  }));

  await employee.save();

  const profile = await buildProfile(id);

  return ok(res, profile);
}

// E4: GET /skills
// List all technical skills
export async function getSkills(req, res) {
  const skills = await Skill.find()
    .populate("related.skillId", "name")
    .sort({ name: 1 })
    .lean();

  const result = skills.map((skill) => ({
    _id: skill._id,
    code: skill.code,
    name: skill.name,
    category: skill.category,
    related: (skill.related || [])
      .filter((r) => r.skillId)
      .map((r) => ({
        skillId: r.skillId._id,
        name: r.skillId.name,
        score: r.score,
      })),
  }));

  return ok(res, result);
}

// E5: GET /roles
// List job roles and required skills
export async function getRoles(req, res) {
  const roles = await Role.find()
    .populate("requiredSkills.skillId", "name")
    .populate("futureSkills.skillId", "name")
    .populate("nextRoles", "title")
    .sort({ level: 1, title: 1 })
    .lean();

  const formatRequirements = (items) =>
    items
      .filter((item) => item.skillId)
      .map((item) => ({
        skillId: item.skillId._id,
        name: item.skillId.name,
        level: item.level,
        weight: item.weight,
      }));

  const result = roles.map((role) => ({
    _id: role._id,
    code: role.code,
    title: role.title,
    department: role.department,
    level: role.level,
    requiredSkills: formatRequirements(role.requiredSkills),
    futureSkills: formatRequirements(role.futureSkills),
    nextRoles: role.nextRoles
      .filter(Boolean)
      .map((next) => ({
        _id: next._id,
        title: next.title,
      })),
  }));

  return ok(res, result);
}

// E6: GET /courses
// Optional filter: ?skillId=
export async function getCourses(req, res) {
  const { skillId } = req.query;

  if (skillId !== undefined) {
    validateId(skillId);
  }

  const filter = skillId
    ? { "skills.skillId": skillId }
    : {};

  const courses = await Course.find(filter)
    .populate("skills.skillId", "name")
    .sort({ code: 1 })
    .lean();

  const result = courses.map((course) => ({
    _id: course._id,
    code: course.code,
    title: course.title,
    type: course.type,
    provider: course.provider,
    level: course.level,
    hours: course.hours,
    skills: course.skills
      .filter((item) => item.skillId)
      .map((item) => ({
        skillId: item.skillId._id,
        name: item.skillId.name,
        targetLevel: item.targetLevel,
      })),
  }));

  return ok(res, result);
}
