
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import connectDB from "../db.js";
import { DEPARTMENTS } from "../constants.js";

import User from "../models/User.js";
import Employee from "../models/Employee.js";
import Skill from "../models/Skill.js";
import Role from "../models/Role.js";
import Project from "../models/Project.js";
import Course from "../models/Course.js";
import LearningRecord from "../models/LearningRecord.js";
import MarketDemand from "../models/MarketDemand.js";
import Forecast from "../models/Forecast.js";
import Review from "../models/Review.js";

import {
  rand,
  randInt,
  pick,
  normal,
  fakeName,
  resetRandom,
} from "./random.js";

import {
  SKILL_CATALOG,
  ROLE_CATALOG,
  COURSE_TEMPLATES,
  validateCatalog,
} from "./catalog.js";

const small = process.argv.includes("--small");
const EMPLOYEE_COUNT = small ? 30 : 300;

const pad = (n) => String(n).padStart(3, "0");
const date = (value) => new Date(`${value}T00:00:00.000Z`);

function skillRef(name, map) {
  const id = map.get(name);
  if (!id) throw new Error(`Unknown skill: ${name}`);
  return id;
}

function roleRef(name, map) {
  const id = map.get(name);
  if (!id) throw new Error(`Unknown role: ${name}`);
  return id;
}

function months() {
  return Array.from({ length: 24 }, (_, index) => {
    const year = 2024 + Math.floor((9 + index) / 12);
    const month = ((9 + index) % 12) + 1;
    return `${year}-${String(month).padStart(2, "0")}`;
  });
}

function generateSkills(role, skillIds) {
  const selected = new Map();

  for (const requirement of role.requiredSkills) {
    if (rand() < 0.86) {
      selected.set(
        String(requirement.skillId),
        {
          skillId: requirement.skillId,
          level: Math.max(
            1,
            Math.min(5, requirement.level + randInt(-2, 1))
          ),
        }
      );
    }
  }

  const extras = [...skillIds.values()];

  for (let i = 0; i < 3; i++) {
    const id = pick(extras);
    const key = String(id);

    if (!selected.has(key)) {
      selected.set(key, {
        skillId: id,
        level: randInt(1, 4),
      });
    }
  }

  return [...selected.values()];
}

async function clearDatabase() {
  // Delete dependent collections before their references.
  for (const model of [
    Review,
    Forecast,
    MarketDemand,
    LearningRecord,
    User,
    Project,
    Course,
    Employee,
    Role,
    Skill,
  ]) {
    await model.deleteMany({});
  }
}

async function seedSkills() {
  const docs = await Skill.insertMany(
    SKILL_CATALOG.map((item) => ({
      code: item.code,
      name: item.name,
      category: item.category,
      description: item.description,
      aliases: item.aliases,
      marketPattern: item.marketPattern,
      prerequisites: [],
      related: [],
    }))
  );

  const ids = new Map(docs.map((s) => [s.name, s._id]));

  for (const item of SKILL_CATALOG) {
    await Skill.updateOne(
      { name: item.name },
      {
        $set: {
          prerequisites: item.prerequisites.map((name) =>
            skillRef(name, ids)
          ),
        },
      }
    );
  }

  return ids;
}

async function seedRoles(skillIds) {
  const docs = await Role.insertMany(
    ROLE_CATALOG.map((item) => ({
      code: item.code,
      title: item.title,
      department: item.department,
      level: item.level,
      requiredSkills: item.requiredSkills.map((r) => ({
        skillId: skillRef(r.name, skillIds),
        level: r.level,
        weight: r.weight,
      })),
      futureSkills: item.futureSkills.map((r) => ({
        skillId: skillRef(r.name, skillIds),
        level: r.level,
        weight: r.weight,
      })),
      nextRoles: [],
    }))
  );

  const ids = new Map(docs.map((r) => [r.title, r._id]));

  for (const item of ROLE_CATALOG) {
    await Role.updateOne(
      { title: item.title },
      {
        $set: {
          nextRoles: item.nextRoles.map((name) =>
            roleRef(name, ids)
          ),
        },
      }
    );
  }

  return ids;
}

async function seedCourses(skillIds) {
  return Course.insertMany(
    COURSE_TEMPLATES.map((item, index) => ({
      code: `CRS${pad(index + 1)}`,
      title: item.title,
      type: item.type,
      provider: item.provider,
      skills: item.skills.map((s) => ({
        skillId: skillRef(s.name, skillIds),
        targetLevel: s.targetLevel,
      })),
      level: item.level,
      hours: item.hours,
    }))
  );
}

async function seedEmployees(roleIds, skillIds) {
  const roles = await Role.find().lean();
  const frontend = roles.find(
    (r) => r.title === "Frontend Developer"
  );

  if (!frontend) {
    throw new Error("Frontend Developer role missing");
  }

  const employees = [];

  // EMP001 to EMP005 must exist for demo user logins.
  const normalCount = EMPLOYEE_COUNT - 3;

  for (let i = 1; i <= normalCount; i++) {
    const role = pick(roles);

    const interests = roles
      .filter((r) => String(r._id) !== String(role._id))
      .slice(0, 2)
      .map((r) => r._id);

    employees.push({
      code: `EMP${pad(i)}`,
      name: fakeName(),
      department: role.department,
      roleId: role._id,
      skills: generateSkills(role, skillIds),
      interests,
    });
  }

  // Special test 1: No skills
  employees.push({
    code: "EMP901",
    name: "Test No Skills",
    department: "Engineering",
    roleId: frontend._id,
    skills: [],
    interests: [],
  });

  // Special test 2: Meets every current-role requirement
  employees.push({
    code: "EMP902",
    name: "Test Fully Skilled",
    department: "Engineering",
    roleId: frontend._id,
    skills: frontend.requiredSkills.map((r) => ({
      skillId: r.skillId,
      level: r.level,
    })),
    interests: [],
  });

  // Special test 3: Vue skilled, React missing
  employees.push({
    code: "EMP903",
    name: "Test Vue Developer",
    department: "Engineering",
    roleId: frontend._id,
    skills: [
      { skillId: skillRef("Vue.js", skillIds), level: 4 },
      { skillId: skillRef("JavaScript", skillIds), level: 4 },
      { skillId: skillRef("HTML/CSS", skillIds), level: 3 },
    ],
    interests: [],
  });

  return Employee.create(employees);
}

async function seedProjects(employees, skillIds) {
  const docs = [];

  const statuses = ["completed", "active", "planned"];

  const shortageSkills = [
    "Kubernetes",
    "MLOps",
    "Generative AI",
  ];

  for (let i = 1; i <= 40; i++) {
    const status = statuses[(i - 1) % 3];

    const requiredSkills = [];

    if (status === "planned") {
      for (const name of shortageSkills) {
        requiredSkills.push({
          skillId: skillRef(name, skillIds),
          level: 4,
          headcount: randInt(3, 7),
        });
      }
    } else {
      const selected = pick(SKILL_CATALOG);

      requiredSkills.push({
        skillId: skillRef(selected.name, skillIds),
        level: randInt(2, 4),
        headcount: randInt(2, 6),
      });
    }

    const members = [];

    if (status !== "planned") {
      const used = new Set();

      while (used.size < 5) {
        const employee = pick(employees);
        used.add(String(employee._id));
      }

      members.push(
        ...[...used].map((id) => new mongoose.Types.ObjectId(id))
      );
    }

    docs.push({
      code: `PRJ${pad(i)}`,
      name: `Synthetic Project ${pad(i)}`,
      department: pick(DEPARTMENTS),
      status,
      startDate: date(
        status === "planned"
          ? "2026-11-01"
          : status === "active"
            ? "2026-04-01"
            : "2025-05-01"
      ),
      requiredSkills,
      members,
    });
  }

  await Project.create(docs);
}

async function seedLearning(employees, courses) {
  const records = [];

  // Two learning records per employee.
  // Special test employees keep their skill invariants.
  for (const employee of employees) {
    const usedCourses = new Set();

    for (let index = 0; index < 2; index++) {
      let course;

      do {
        course = pick(courses);
      } while (usedCourses.has(String(course._id)));

      usedCourses.add(String(course._id));

      const status = pick([
        "completed",
        "completed",
        "enrolled",
        "dropped",
      ]);

      const startedAt = date(
        index === 0 ? "2026-01-10" : "2026-06-10"
      );

      records.push({
        employeeId: employee._id,
        courseId: course._id,
        status,
        startedAt,
        ...(status === "completed"
          ? {
              completedAt: date(
                index === 0 ? "2026-02-15" : "2026-07-15"
              ),
            }
          : {}),
      });
    }
  }

  await LearningRecord.create(records);
}

async function seedMarket(skillIds) {
  const records = [];
  const monthList = months();

  for (const item of SKILL_CATALOG) {
    const base = randInt(60, 130);

    const slope = {
      emerging: 5,
      growing: 2.4,
      stable: 0.15,
      declining: -1.7,
    }[item.marketPattern];

    for (let i = 0; i < monthList.length; i++) {
      const noise = normal(0, 2);

      const value = Math.max(
        0,
        Math.round(base + slope * i + noise)
      );

      records.push({
        skillId: skillRef(item.name, skillIds),
        month: monthList[i],
        value,
        source: "synthetic",
      });
    }
  }

  await MarketDemand.create(records);
}

async function seedUsers(employees) {
  const password = process.env.DEMO_PASSWORD;

  if (!password) {
    throw new Error("DEMO_PASSWORD is missing in server/.env");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const employeeByCode = new Map(
    employees.map((e) => [e.code, e])
  );

  const users = [
    {
      email: "hr@skillsight.com",
      passwordHash,
      role: "hr",
      employeeId: null,
    },
  ];

  for (let i = 1; i <= 5; i++) {
    const code = `EMP${pad(i)}`;
    const employee = employeeByCode.get(code);

    if (!employee) {
      throw new Error(`Demo employee missing: ${code}`);
    }

    users.push({
      email: `emp${pad(i)}@skillsight.com`,
      passwordHash,
      role: "employee",
      employeeId: employee._id,
    });
  }

  await User.create(users);
}

async function verifyDataset() {
  const counts = {
    skills: await Skill.countDocuments(),
    roles: await Role.countDocuments(),
    employees: await Employee.countDocuments(),
    courses: await Course.countDocuments(),
    projects: await Project.countDocuments(),
    learning: await LearningRecord.countDocuments(),
    market: await MarketDemand.countDocuments(),
    users: await User.countDocuments(),
    forecasts: await Forecast.countDocuments(),
    reviews: await Review.countDocuments(),
  };

  const expected = {
    skills: 40,
    roles: 12,
    employees: EMPLOYEE_COUNT,
    courses: 60,
    projects: 40,
    learning: EMPLOYEE_COUNT * 2,
    market: 40 * 24,
    users: 6,
    forecasts: 0,
    reviews: 0,
  };

  for (const [key, value] of Object.entries(expected)) {
    if (counts[key] !== value) {
      throw new Error(
        `${key}: expected ${value}, found ${counts[key]}`
      );
    }
  }

  const special = await Employee.find({
    code: { $in: ["EMP901", "EMP902", "EMP903"] },
  }).lean();

  const byCode = new Map(special.map((e) => [e.code, e]));

  const frontend = await Role.findOne({
    title: "Frontend Developer",
  }).lean();

  const react = await Skill.findOne({ name: "React" }).lean();
  const vue = await Skill.findOne({ name: "Vue.js" }).lean();

  const noSkills = byCode.get("EMP901");
  const fullySkilled = byCode.get("EMP902");
  const vueSkilled = byCode.get("EMP903");

  if (
    !noSkills ||
    noSkills.skills.length !== 0 ||
    !fullySkilled ||
    !vueSkilled
  ) {
    throw new Error("Special test employees invalid");
  }

  for (const required of frontend.requiredSkills) {
    const actual = fullySkilled.skills.find(
      (s) => String(s.skillId) === String(required.skillId)
    );

    if (!actual || actual.level < required.level) {
      throw new Error("EMP902 does not satisfy its role");
    }
  }

  if (
    !vueSkilled.skills.some(
      (s) =>
        String(s.skillId) === String(vue._id) &&
        s.level === 4
    ) ||
    vueSkilled.skills.some(
      (s) => String(s.skillId) === String(react._id)
    )
  ) {
    throw new Error("EMP903 invariant failed");
  }

  const marketRows = await MarketDemand.aggregate([
    { $group: { _id: "$skillId", count: { $sum: 1 } } },
  ]);

  if (
    marketRows.length !== 40 ||
    marketRows.some((r) => r.count !== 24)
  ) {
    throw new Error("Market history verification failed");
  }

  const allEmployees = await Employee.find().lean();

  const validRoleIds = new Set(
    (await Role.find().select("_id").lean()).map((r) =>
      String(r._id)
    )
  );

  const validSkillIds = new Set(
    (await Skill.find().select("_id").lean()).map((s) =>
      String(s._id)
    )
  );

  for (const employee of allEmployees) {
    if (!validRoleIds.has(String(employee.roleId))) {
      throw new Error(`Invalid role: ${employee.code}`);
    }

    const seen = new Set();

    for (const s of employee.skills) {
      const id = String(s.skillId);

      if (
        !validSkillIds.has(id) ||
        seen.has(id) ||
        s.level < 1 ||
        s.level > 5
      ) {
        throw new Error(`Invalid skills: ${employee.code}`);
      }

      seen.add(id);
    }
  }

  console.table(counts);
  console.log("Special employees verified");
  console.log("All employee skill references verified");
  console.log("24 demand months per skill verified");
  console.log("Dataset verification passed");
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seeding production is forbidden");
  }

  if (
    !process.env.MONGODB_URI ||
    !process.env.DEMO_PASSWORD
  ) {
    throw new Error(
      "MONGODB_URI and DEMO_PASSWORD are required"
    );
  }

  // Explicit guard: use a database dedicated to SkillSight.
  const dbName = new URL(
    process.env.MONGODB_URI
  ).pathname.slice(1).split("?")[0];

  if (!dbName.startsWith("skillsight")) {
    throw new Error(
      "Use a dedicated database named skillsight or skillsight-dev"
    );
  }

  validateCatalog();
  resetRandom();

  await connectDB();

  console.log(
    `Seeding ${EMPLOYEE_COUNT} synthetic employees...`
  );
  console.log(
    "WARNING: Replacing existing SkillSight demo collections"
  );

  await clearDatabase();

  const skillIds = await seedSkills();
  const roleIds = await seedRoles(skillIds);
  const courses = await seedCourses(skillIds);
  const employees = await seedEmployees(roleIds, skillIds);

  await seedProjects(employees, skillIds);
  await seedLearning(employees, courses);
  await seedMarket(skillIds);
  await seedUsers(employees);

  await verifyDataset();

  console.log("SkillSight synthetic dataset ready");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
