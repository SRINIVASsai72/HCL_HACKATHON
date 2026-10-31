
import "dotenv/config";
import mongoose from "mongoose";
import { writeFile } from "node:fs/promises";

import Skill from "../models/Skill.js";
import Role from "../models/Role.js";
import Employee from "../models/Employee.js";
import Course from "../models/Course.js";
import LearningRecord from "../models/LearningRecord.js";
import Forecast from "../models/Forecast.js";

import { matchSkills } from "../ai/skillMatch.js";
import { getLearningPlan } from "../ai/learning.js";
import { getCareerPaths } from "../ai/career.js";
import { getGaps } from "../ai/gaps.js";
import { getTrends } from "../ai/trends.js";
import { makeExplanation } from "../ai/explain.js";
import { cosine } from "../ai/embeddings.js";

const OUTPUT_FILE = new URL(
  "../../eval-results.json",
  import.meta.url
);

const round = (value) =>
  Number(value.toFixed(3));

const id = (value) => String(value);

function mean(values) {
  if (!values.length) return null;

  return round(
    values.reduce((a, b) => a + b, 0) /
    values.length
  );
}

function normalize(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// Fixed BEFORE evaluation.
// These include aliases, skill names and descriptions.
const MATCH_CASES = [
  { text: "React", expected: "React" },
  { text: "reactjs", expected: "React" },
  { text: "JavaScript", expected: "JavaScript" },
  { text: "TypeScript", expected: "TypeScript" },
  { text: "Python", expected: "Python" },
  { text: "SQL", expected: "SQL" },
  { text: "MongoDB", expected: "MongoDB" },
  { text: "PostgreSQL", expected: "PostgreSQL" },
  { text: "Docker", expected: "Docker" },
  { text: "Kubernetes", expected: "Kubernetes" },
  { text: "Node.js", expected: "Node.js" },
  { text: "Express.js", expected: "Express.js" },
  { text: "AWS", expected: "AWS" },
  { text: "Azure", expected: "Azure" },
  { text: "Linux", expected: "Linux" },
  { text: "Selenium", expected: "Selenium" },
  { text: "Playwright", expected: "Playwright" },
  { text: "Power BI", expected: "Power BI" },
  { text: "Machine Learning", expected: "Machine Learning" },
  { text: "REST APIs", expected: "REST APIs" },
  {
    text: "building interactive user interfaces using React",
    expected: "React",
  },
  {
    text: "writing scripts and applications with Python",
    expected: "Python",
  },
  {
    text: "containerizing applications using Docker",
    expected: "Docker",
  },
  {
    text: "orchestrating containers using Kubernetes",
    expected: "Kubernetes",
  },
  {
    text: "working with relational PostgreSQL databases",
    expected: "PostgreSQL",
  },
  {
    text: "developing server applications with Node.js",
    expected: "Node.js",
  },
  {
    text: "automating browser testing using Selenium",
    expected: "Selenium",
  },
  {
    text: "building dashboards using Power BI",
    expected: "Power BI",
  },
  {
    text: "deploying cloud applications on AWS",
    expected: "AWS",
  },
  {
    text: "creating automated build and deployment pipelines",
    expected: "CI/CD",
  },
];

// These are predetermined illustrative gold cases.
// They must not be adjusted to improve evaluation scores.
const LEARNING_CASES = [
  {
    employeeCode: "EMP001",
    roleTitle: "Cloud Architect",
    goodSkills: ["AWS", "Azure", "Kubernetes", "Docker"],
  },
  {
    employeeCode: "EMP002",
    roleTitle: "Frontend Developer",
    goodSkills: ["React", "JavaScript", "TypeScript", "HTML/CSS"],
  },
  {
    employeeCode: "EMP003",
    roleTitle: "Backend Developer",
    goodSkills: ["Node.js", "Express.js", "REST APIs", "SQL"],
  },
  {
    employeeCode: "EMP004",
    roleTitle: "Full Stack Developer",
    goodSkills: ["React", "Node.js", "MongoDB", "REST APIs"],
  },
  {
    employeeCode: "EMP005",
    roleTitle: "ML Engineer",
    goodSkills: ["Python", "Machine Learning", "Deep Learning", "MLOps"],
  },
  {
    employeeCode: "EMP006",
    roleTitle: "DevOps Engineer",
    goodSkills: ["Docker", "Kubernetes", "Linux", "CI/CD"],
  },
  {
    employeeCode: "EMP007",
    roleTitle: "QA Engineer",
    goodSkills: ["Manual Testing", "Selenium", "API Testing"],
  },
  {
    employeeCode: "EMP008",
    roleTitle: "Data Analyst",
    goodSkills: ["SQL", "Python", "Power BI", "PostgreSQL"],
  },
];

function trendFromGrowth(growthPct) {
  if (growthPct >= 40) return "emerging";
  if (growthPct >= 10) return "growing";
  if (growthPct <= -10) return "declining";
  return "stable";
}

async function evaluateForecasts(skills, forecasts) {
  const evaluated = forecasts.filter(
    (forecast) =>
      Number.isFinite(forecast.metrics?.mae) &&
      Number.isFinite(forecast.metrics?.naiveMae)
  );

  const percentageCases = evaluated.filter(
    (forecast) =>
      Number.isFinite(forecast.metrics?.mape) &&
      Number.isFinite(forecast.metrics?.naiveMape)
  );

  const beats = evaluated.filter(
    (forecast) =>
      forecast.metrics.mae <
      forecast.metrics.naiveMae
  ).length;

  // marketPattern is selected ONLY for evaluation.
  // Never use it during model inference.
  const labeledSkills = await Skill.find()
    .select("+marketPattern")
    .lean();

  const patterns = new Map(
    labeledSkills.map((skill) => [
      id(skill._id),
      skill.marketPattern,
    ])
  );

  let trendCorrect = 0;
  let trendTotal = 0;

  // Evaluate the historical trend detector,
  // not the forecast trend, against synthetic labels.
  const historicalTrends = await getTrends({});

  for (const trend of historicalTrends) {
    const expected = patterns.get(id(trend.skillId));

    if (!expected) continue;

    trendTotal++;

    if (trend.trend === expected) {
      trendCorrect++;
    }
  }

  return {
    totalForecasts: forecasts.length,
    backtested: evaluated.length,
    mapeEvaluated: percentageCases.length,
    avgMae: mean(evaluated.map(f => f.metrics.mae)),
    avgMape: mean(percentageCases.map(f => f.metrics.mape)),
    avgNaiveMae: mean(
      evaluated.map(f => f.metrics.naiveMae)
    ),
    avgNaiveMape: mean(
      percentageCases.map(f => f.metrics.naiveMape)
    ),
    pctBeatNaive: evaluated.length
      ? round(beats / evaluated.length * 100)
      : null,
    historicalTrendAccuracy: trendTotal
      ? round(trendCorrect / trendTotal)
      : null,
    historicalTrendCases: trendTotal,
    trendRule: "emerging >=40%, growing >=10%, declining <=-10%",
    source: "synthetic",
  };
}

function aliasBaseline(text, skills) {
  const query = normalize(text);

  return skills.find(
    (skill) =>
      normalize(skill.name) === query ||
      (skill.aliases || []).some(
        alias => normalize(alias) === query
      )
  )?.name ?? null;
}

async function evaluateSkillMatching(skills) {
  let aliasCorrect = 0;
  let hybridCorrect = 0;

  const cases = [];

  for (const testCase of MATCH_CASES) {
    const aliasPrediction = aliasBaseline(
      testCase.text,
      skills
    );

    const matches = await matchSkills(testCase.text);
    const hybridPrediction =
      matches.length ? matches[0].skillName : null;

    const aliasMatch =
      aliasPrediction === testCase.expected;

    const hybridMatch =
      hybridPrediction === testCase.expected;

    if (aliasMatch) aliasCorrect++;
    if (hybridMatch) hybridCorrect++;

    cases.push({
      text: testCase.text,
      expected: testCase.expected,
      aliasPrediction,
      hybridPrediction,
      aliasCorrect: aliasMatch,
      hybridCorrect: hybridMatch,
    });
  }

  const total = MATCH_CASES.length;

  return {
    totalCases: total,
    aliasTop1Accuracy: round(aliasCorrect / total),
    hybridTop1Accuracy: round(hybridCorrect / total),
    aliasCorrect,
    hybridCorrect,
    cases,
  };
}

// Precision@5 denominator is always five.
// Returning fewer than five relevant courses
// does not artificially increase the metric.
function precisionAt5(courses, goldSkills, courseMap) {
  const gold = new Set(goldSkills.map(normalize));

  let relevant = 0;

  for (const course of courses.slice(0, 5)) {
    const skillNames = course.skills || [];

    // A course is relevant if it teaches
    // at least one predefined gold skill.
    if (
      skillNames.some(name => gold.has(normalize(name)))
    ) {
      relevant++;
    }
  }

  return round(relevant / 5);
}

async function evaluateLearning(
  employees,
  roles,
  courses,
  skills
) {
  const employeeMap = new Map(
    employees.map(e => [e.code, e])
  );

  const roleMap = new Map(
    roles.map(r => [r.title, r])
  );

  const skillMap = new Map(
    skills.map(s => [id(s._id), s.name])
  );

  const records = await LearningRecord.find().lean();

  const popularity = new Map();

  for (const record of records) {
    const key = id(record.courseId);

    popularity.set(
      key,
      (popularity.get(key) || 0) + 1
    );
  }

  const courseById = new Map(
    courses.map(c => [id(c._id), c])
  );

  const results = [];

  for (const testCase of LEARNING_CASES) {
    const employee = employeeMap.get(
      testCase.employeeCode
    );

    const role = roleMap.get(testCase.roleTitle);

    if (!employee || !role) {
      results.push({
        employeeCode: testCase.employeeCode,
        roleTitle: testCase.roleTitle,
        status: "unavailable",
        reason: "Employee or role missing",
      });
      continue;
    }

    const plan = await getLearningPlan(
      id(employee._id),
      { roleId: id(role._id) }
    );

    const gapResult = await getGaps(
      id(employee._id),
      { roleId: id(role._id) }
    );

    const gapMap = new Map();

    for (const gap of [
      ...gapResult.currentGaps,
      ...gapResult.futureGaps,
    ]) {
      if (gap.gap <= 0) continue;

      const key = id(gap.skillId);
      const previous = gapMap.get(key);

      if (!previous || gap.gap > previous.gap) {
        gapMap.set(key, gap);
      }
    }

    // Use the same eligible course pool as the
    // recommendation algorithm.
    const eligibleCourses = courses.filter(
      course => (course.skills || []).some(
        item => {
          const gap = gapMap.get(id(item.skillId));

          return (
            gap &&
            Number(item.targetLevel) > gap.effective
          );
        }
      )
    );

    const baselineCourses = [...eligibleCourses]
      .sort((a, b) =>
        (popularity.get(id(b._id)) || 0) -
        (popularity.get(id(a._id)) || 0) ||
        a.title.localeCompare(b.title)
      )
      .slice(0, 5);

    const modelCourses = plan.recommendations.map(
      recommendation => {
        const course = courseById.get(
          id(recommendation.course._id)
        );

        return {
          title: recommendation.course.title,
          skills: (course?.skills || []).map(
            item => skillMap.get(id(item.skillId))
          ).filter(Boolean),
        };
      }
    );

    const baselineMapped = baselineCourses.map(
      course => ({
        title: course.title,
        skills: (course.skills || []).map(
          item => skillMap.get(id(item.skillId))
        ).filter(Boolean),
      })
    );

    results.push({
      employeeCode: testCase.employeeCode,
      roleTitle: testCase.roleTitle,
      status: "evaluated",
      goldSkills: testCase.goodSkills,
      eligibleCourses: eligibleCourses.length,
      recommendedCount: modelCourses.length,
      baselineCount: baselineMapped.length,
      modelPrecisionAt5: precisionAt5(
        modelCourses,
        testCase.goodSkills
      ),
      baselinePrecisionAt5: precisionAt5(
        baselineMapped,
        testCase.goodSkills
      ),
    });
  }

  const evaluated = results.filter(
    result => result.status === "evaluated"
  );

  return {
    predefinedCases: LEARNING_CASES.length,
    evaluatedCases: evaluated.length,
    unavailableCases:
      LEARNING_CASES.length - evaluated.length,
    modelPrecisionAt5: mean(
      evaluated.map(r => r.modelPrecisionAt5)
    ),
    baselinePrecisionAt5: mean(
      evaluated.map(r => r.baselinePrecisionAt5)
    ),
    denominator: 5,
    note:
      "Gold labels are predefined illustrative skill targets, not independently annotated hiring outcomes.",
    cases: results,
  };
}

async function evaluateExplainability(
  employees,
  roles
) {
  const checks = [];

  function record(name, passed, detail = null) {
    checks.push({ name, passed, detail });
  }

  const mobilityFactors = [
    { name: "Readiness", value: 0.8, weight: 0.5 },
    { name: "Similarity", value: 0.7, weight: 0.3 },
    { name: "Demand", value: 0.6, weight: 0.2 },
  ];

  const explanation = makeExplanation(
    mobilityFactors,
    "Test explanation"
  );

  const total = explanation.factors.reduce(
    (sum, f) => sum + f.contribution,
    0
  );

  record(
    "Mobility contributions sum to score",
    Math.abs(total - 0.73) <= 0.001
  );

  const learningFactors = [
    { name: "Gap coverage", value: 0.8, weight: 0.4 },
    { name: "Demand", value: 0.6, weight: 0.25 },
    { name: "Completion", value: 0.7, weight: 0.2 },
    { name: "Relevance", value: 0.9, weight: 0.15 },
  ];

  const learningExplanation = makeExplanation(
    learningFactors,
    "Test learning score"
  );

  const learningExpected =
    learningFactors.reduce(
      (sum, f) => sum + f.value * f.weight,
      0
    );

  const learningActual =
    learningExplanation.factors.reduce(
      (sum, f) => sum + f.contribution,
      0
    );

  record(
    "Learning contributions sum to score",
    Math.abs(learningExpected - learningActual) <= 0.001
  );

  record(
    "Zero vector returns zero cosine",
    cosine([0, 0, 0], [1, 2, 3]) === 0
  );

  record(
    "Opposite vectors preserve negative cosine",
    Math.abs(cosine([1, 0], [-1, 0]) + 1) < 0.000001
  );

  try {
    await getGaps("invalid-employee-id");
    record("Invalid employee ID rejected", false);
  } catch (error) {
    record(
      "Invalid employee ID rejected",
      error.code === "BAD_REQUEST"
    );
  }

  // Do not delete model data to test missing-state
  // behavior on the team's shared database.
  const matching = await matchSkills("React");
  record(
    "Exact matching works with seeded catalog",
    matching.some(
      item => item.skillName === "React"
    )
  );

  const employee = employees[0];

  if (employee) {
    const ownGaps = await getGaps(id(employee._id));

    record(
      "Readiness remains between zero and one",
      ownGaps.readiness.current >= 0 &&
      ownGaps.readiness.current <= 1 &&
      ownGaps.readiness.future >= 0 &&
      ownGaps.readiness.future <= 1
    );

    const ownRole = roles.find(
      role => id(role._id) === id(employee.roleId)
    );

    if (ownRole) {
      const ownPaths = await getCareerPaths(
        id(employee._id),
        { targetRoleId: id(ownRole._id) }
      );

      record(
        "Current role is not a career transition",
        ownPaths.paths.length === 0
      );
    }
  }

  // Some edge cases require isolated fixture data,
  // rather than mutation of the shared database.
  return {
    passed: checks.filter(c => c.passed).length,
    total: checks.length,
    checks,
    notTested: [
      "Missing model data under controlled isolation",
      "Zero historical market demand fixture",
      "Employee with no skill gaps fixture",
      "Unreachable distinct target role fixture",
    ],
  };
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing from server/.env"
    );
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const [
    skills,
    roles,
    employees,
    courses,
    forecasts,
  ] = await Promise.all([
    Skill.find().lean(),
    Role.find().lean(),
    Employee.find().lean(),
    Course.find().lean(),
    Forecast.find().lean(),
  ]);

  if (
    !skills.length ||
    !roles.length ||
    !employees.length ||
    !courses.length ||
    !forecasts.length
  ) {
    throw new Error(
      "Dataset or AI results are missing. Run npm run seed and npm run ai:build before evaluation."
    );
  }

  console.log("Evaluating forecasts...");
  const forecast = await evaluateForecasts(
    skills,
    forecasts
  );

  console.log("Evaluating skill matching...");
  const skillMatch = await evaluateSkillMatching(
    skills
  );

  console.log("Evaluating learning recommendations...");
  const recommendations = await evaluateLearning(
    employees,
    roles,
    courses,
    skills
  );

  console.log("Evaluating explainability...");
  const explainability = await evaluateExplainability(
    employees,
    roles
  );

  const results = {
    evaluatedAt: new Date().toISOString(),
    dataSource: "synthetic",
    forecast,
    skillMatch,
    recommendations,
    explainability,
    limitations: [
      "Synthetic demand does not prove real-market accuracy.",
      "MiniLM is pretrained, not trained on this employee dataset.",
      "Forecast intervals are heuristic, not calibrated.",
      "Learning gold labels are predefined illustrative cases.",
      "This is offline evaluation, not a clinical or hiring validation.",
    ],
  };

  await writeFile(
    OUTPUT_FILE,
    JSON.stringify(results, null, 2),
    "utf8"
  );

  console.log("\n=== SKILLSIGHT AI EVALUATION ===");

  console.log("Forecast:", {
    count: forecast.totalForecasts,
    avgMape: forecast.avgMape,
    avgNaiveMape: forecast.avgNaiveMape,
    pctBeatNaive: forecast.pctBeatNaive,
    historicalTrendAccuracy:
      forecast.historicalTrendAccuracy,
  });

  console.log("Skill matching:", {
    cases: skillMatch.totalCases,
    aliasAccuracy: skillMatch.aliasTop1Accuracy,
    hybridAccuracy: skillMatch.hybridTop1Accuracy,
  });

  console.log("Learning recommendations:", {
    cases: recommendations.evaluatedCases,
    modelPrecisionAt5: recommendations.modelPrecisionAt5,
    baselinePrecisionAt5:
      recommendations.baselinePrecisionAt5,
  });

  console.log("Explainability:", {
    passed: explainability.passed,
    total: explainability.total,
  });

  console.log(
    "\nEvaluation saved to server/eval-results.json"
  );
}

try {
  await main();
} catch (error) {
  console.error("Evaluation failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
