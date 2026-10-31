
import {
  DEPARTMENTS,
  SKILL_CATEGORIES,
  TRENDS,
} from "../constants.js";

// All catalog data is synthetic and deterministic.
// Skills are resolved to MongoDB ObjectIds in seed.js.

const skill = (
  name,
  category,
  marketPattern,
  aliases = [],
  prerequisites = []
) => ({
 
code: name === "C++"
  ? "cpp"
  : name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),

  name,
  category,
  marketPattern,
  description: `${name} is a technical skill used in software and technology projects.`,
  aliases,
  prerequisites,
});

export const SKILL_CATALOG = [
  // Languages (7)
  skill("Java", "language", "stable"),
  skill("Python", "language", "growing", ["python3"]),
  skill("JavaScript", "language", "stable", ["js"]),
  skill("TypeScript", "language", "growing", ["ts"], ["JavaScript"]),
  skill("C", "language", "stable"),
  skill("C++", "language", "stable", ["cpp"]),
  skill("SQL", "language", "stable"),

  // Frontend (5)
  skill("HTML/CSS", "frontend", "stable", ["html", "css"]),
  skill("React", "frontend", "growing",
    ["reactjs", "react.js"], ["JavaScript"]),
  skill("Angular", "frontend", "stable",
    ["angular framework"], ["TypeScript"]),
  skill("Vue.js", "frontend", "stable",
    ["vue", "vuejs"], ["JavaScript"]),
  skill("jQuery", "frontend", "declining", [],
    ["JavaScript"]),

  // Backend (5)
  skill("Node.js", "backend", "growing",
    ["node", "nodejs"], ["JavaScript"]),
  skill("Express.js", "backend", "stable",
    ["express", "expressjs"], ["Node.js"]),
  skill("Spring Boot", "backend", "growing",
    ["springboot"], ["Java"]),
  skill("REST APIs", "backend", "stable",
    ["rest", "restful api"]),
  skill("Microservices", "backend", "growing",
    ["microservice architecture"], ["REST APIs"]),

  // Data (4)
  skill("MongoDB", "data", "stable",
    ["mongo"]),
  skill("PostgreSQL", "data", "growing",
    ["postgres", "psql"], ["SQL"]),
  skill("MySQL", "data", "declining",
    ["mysql database"], ["SQL"]),
  skill("Power BI", "data", "stable",
    ["powerbi"]),

  // AI / ML (5)
  skill("Machine Learning", "ai_ml", "growing",
    ["ml"], ["Python"]),
  skill("Deep Learning", "ai_ml", "growing",
    ["dl"], ["Machine Learning"]),
  skill("NLP", "ai_ml", "growing",
    ["natural language processing"], ["Machine Learning"]),
  skill("Generative AI", "ai_ml", "emerging",
    ["genai", "gen ai"], ["Deep Learning"]),
  skill("MLOps", "ai_ml", "emerging",
    ["ml ops"], ["Machine Learning", "Docker"]),

  // Cloud / DevOps (6)
  skill("AWS", "cloud_devops", "growing",
    ["amazon web services"]),
  skill("Azure", "cloud_devops", "stable",
    ["microsoft azure"]),
  skill("Docker", "cloud_devops", "growing",
    ["containers"]),
  skill("Kubernetes", "cloud_devops", "growing",
    ["k8s"], ["Docker"]),
  skill("CI/CD", "cloud_devops", "growing",
    ["continuous integration", "continuous delivery"]),
  skill("Linux", "cloud_devops", "stable"),

  // Testing (5)
  skill("Manual Testing", "testing", "declining"),
  skill("Selenium", "testing", "declining",
    ["selenium webdriver"], ["Manual Testing"]),
  skill("Playwright", "testing", "emerging",
    ["playwright testing"], ["Selenium"]),
  skill("API Testing", "testing", "growing"),
  skill("JUnit", "testing", "stable",
    ["junit testing"], ["Java"]),

  // Embedded (3)
  skill("Embedded C", "embedded", "stable",
    ["embedded programming"], ["C"]),
  skill("Microcontrollers", "embedded", "stable",
    ["mcu"], ["Embedded C"]),
  skill("RTOS", "embedded", "stable",
    ["real time operating system"], ["Embedded C"]),
];

// Each requirement: skill name, minimum level, importance weight.
// Levels: 1-5. Weights: 1-3.
const requirements = (entries) =>
  entries.map(([name, level, weight]) => ({
    name,
    level,
    weight,
  }));

const role = (
  code,
  title,
  department,
  level,
  required,
  future,
  nextRoles
) => ({
  code,
  title,
  department,
  level,
  requiredSkills: requirements(required),
  futureSkills: requirements(future),
  nextRoles,
});

export const ROLE_CATALOG = [
  role(
    "frontend-dev", "Frontend Developer", "Engineering", 1,
    [
      ["HTML/CSS", 3, 3],
      ["JavaScript", 3, 3],
      ["React", 3, 3],
      ["REST APIs", 2, 2],
    ],
    [
      ["TypeScript", 3, 3],
      ["Playwright", 2, 2],
    ],
    ["Full Stack Developer"]
  ),

  role(
    "backend-dev", "Backend Developer", "Engineering", 1,
    [
      ["JavaScript", 3, 3],
      ["Node.js", 3, 3],
      ["Express.js", 3, 3],
      ["REST APIs", 3, 3],
      ["SQL", 2, 2],
    ],
    [
      ["Docker", 3, 2],
      ["Microservices", 3, 3],
    ],
    ["Full Stack Developer", "DevOps Engineer"]
  ),

  role(
    "fullstack-dev", "Full Stack Developer", "Engineering", 2,
    [
      ["JavaScript", 4, 3],
      ["React", 3, 3],
      ["Node.js", 3, 3],
      ["MongoDB", 3, 2],
      ["REST APIs", 3, 3],
    ],
    [
      ["TypeScript", 3, 3],
      ["Docker", 3, 2],
      ["CI/CD", 3, 2],
    ],
    ["Tech Lead"]
  ),

  role(
    "tech-lead", "Tech Lead", "Engineering", 3,
    [
      ["JavaScript", 4, 3],
      ["Microservices", 4, 3],
      ["REST APIs", 4, 3],
      ["SQL", 3, 2],
      ["Docker", 3, 2],
    ],
    [
      ["Kubernetes", 3, 3],
      ["Generative AI", 2, 2],
    ],
    []
  ),

  role(
    "data-analyst", "Data Analyst", "Data & AI", 1,
    [
      ["SQL", 3, 3],
      ["Python", 3, 3],
      ["Power BI", 3, 3],
    ],
    [
      ["Machine Learning", 2, 3],
      ["PostgreSQL", 3, 2],
    ],
    ["ML Engineer"]
  ),

  role(
    "ml-engineer", "ML Engineer", "Data & AI", 2,
    [
      ["Python", 4, 3],
      ["Machine Learning", 4, 3],
      ["SQL", 3, 2],
      ["Deep Learning", 3, 3],
    ],
    [
      ["MLOps", 3, 3],
      ["Generative AI", 3, 3],
    ],
    ["GenAI Engineer"]
  ),

  role(
    "genai-engineer", "GenAI Engineer", "Data & AI", 3,
    [
      ["Python", 4, 3],
      ["Deep Learning", 4, 3],
      ["NLP", 4, 3],
      ["Generative AI", 4, 3],
    ],
    [
      ["MLOps", 4, 3],
      ["Kubernetes", 3, 2],
    ],
    []
  ),

  role(
    "devops-engineer", "DevOps Engineer", "Cloud", 2,
    [
      ["Linux", 4, 3],
      ["Docker", 4, 3],
      ["CI/CD", 4, 3],
      ["AWS", 3, 3],
    ],
    [
      ["Kubernetes", 4, 3],
      ["MLOps", 2, 2],
    ],
    ["Cloud Architect"]
  ),

  role(
    "cloud-architect", "Cloud Architect", "Cloud", 3,
    [
      ["AWS", 4, 3],
      ["Azure", 4, 3],
      ["Kubernetes", 4, 3],
      ["Docker", 4, 2],
      ["Linux", 4, 2],
    ],
    [
      ["MLOps", 3, 2],
      ["Microservices", 4, 3],
    ],
    []
  ),

  role(
    "qa-engineer", "QA Engineer", "Quality", 1,
    [
      ["Manual Testing", 3, 3],
      ["API Testing", 3, 3],
      ["SQL", 2, 2],
    ],
    [
      ["Selenium", 3, 3],
      ["Playwright", 3, 3],
    ],
    ["Test Automation Engineer"]
  ),

  role(
    "test-automation-engineer",
    "Test Automation Engineer", "Quality", 2,
    [
      ["Selenium", 4, 3],
      ["Java", 3, 3],
      ["API Testing", 4, 3],
      ["JUnit", 3, 2],
    ],
    [
      ["Playwright", 4, 3],
      ["CI/CD", 3, 2],
    ],
    ["Tech Lead"]
  ),

  role(
    "embedded-engineer", "Embedded Engineer", "Embedded", 1,
    [
      ["C", 3, 3],
      ["Embedded C", 3, 3],
      ["Microcontrollers", 3, 3],
      ["RTOS", 2, 2],
    ],
    [
      ["C++", 3, 3],
      ["Linux", 3, 2],
    ],
    ["Backend Developer", "Test Automation Engineer"]
  ),
];

// 40 foundational courses + 15 advanced courses
// + 5 certifications = exactly 60 courses.

const advancedSkills = [
  "React",
  "TypeScript",
  "Node.js",
  "Spring Boot",
  "Python",
  "Machine Learning",
  "Deep Learning",
  "NLP",
  "Generative AI",
  "MLOps",
  "AWS",
  "Docker",
  "Kubernetes",
  "Playwright",
  "Microservices",
];

const certificationSkills = [
  "AWS",
  "Azure",
  "Kubernetes",
  "Machine Learning",
  "Generative AI",
];

export const COURSE_TEMPLATES = [
  ...SKILL_CATALOG.map((s) => ({
    title: `${s.name} Fundamentals`,
    type: "course",
    provider: "SkillSight Academy",
    skills: [{ name: s.name, targetLevel: 3 }],
    level: 1,
    hours: 12,
  })),

  ...advancedSkills.map((name) => ({
    title: `Advanced ${name}`,
    type: "course",
    provider: "SkillSight Academy",
    skills: [{ name, targetLevel: 5 }],
    level: 3,
    hours: 24,
  })),

  ...certificationSkills.map((name) => ({
    title: `${name} Professional Certification`,
    type: "certification",
    provider: "SkillSight Certifications",
    skills: [{ name, targetLevel: 5 }],
    level: 3,
    hours: 36,
  })),
];

// Validate data definitions before database insertion.
export function validateCatalog() {
  const skillNames = new Set(SKILL_CATALOG.map((s) => s.name));
  const roleNames = new Set(ROLE_CATALOG.map((r) => r.title));

  if (
    SKILL_CATALOG.length !== 40 ||
    skillNames.size !== 40
  ) {
    throw new Error("Catalog must contain 40 unique skills");
  }

  if (
    ROLE_CATALOG.length !== 12 ||
    roleNames.size !== 12
  ) {
    throw new Error("Catalog must contain 12 unique roles");
  }

  if (COURSE_TEMPLATES.length !== 60) {
    throw new Error("Catalog must contain 60 courses");
  }

  for (const s of SKILL_CATALOG) {
    if (!SKILL_CATEGORIES.includes(s.category)) {
      throw new Error(`Invalid category: ${s.name}`);
    }

    if (!TRENDS.includes(s.marketPattern)) {
      throw new Error(`Invalid market pattern: ${s.name}`);
    }

    for (const prerequisite of s.prerequisites) {
      if (!skillNames.has(prerequisite)) {
        throw new Error(`Unknown prerequisite: ${prerequisite}`);
      }
    }
  }

  for (const r of ROLE_CATALOG) {
    if (!DEPARTMENTS.includes(r.department)) {
      throw new Error(`Invalid department: ${r.title}`);
    }

    if (r.level < 1 || r.level > 3) {
      throw new Error(`Invalid role level: ${r.title}`);
    }

    for (const item of [
      ...r.requiredSkills,
      ...r.futureSkills,
    ]) {
      if (!skillNames.has(item.name)) {
        throw new Error(`Unknown role skill: ${item.name}`);
      }

      if (
        item.level < 1 || item.level > 5 ||
        item.weight < 1 || item.weight > 3
      ) {
        throw new Error(`Invalid requirement: ${r.title}`);
      }
    }

    for (const nextRole of r.nextRoles) {
      if (!roleNames.has(nextRole)) {
        throw new Error(`Unknown next role: ${nextRole}`);
      }
    }
  }

  return true;
}
