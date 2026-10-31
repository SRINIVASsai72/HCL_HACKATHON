
# SkillSight — AI Models and Algorithms

## 1. Overview

SkillSight is an AI-powered Skill Gap and Workforce
Evolution Predictor.

The system analyzes employee competencies, identifies
skill gaps, predicts future skill demand, recommends
learning paths, and suggests career opportunities.

The application uses JavaScript-based AI inference
and statistical forecasting within Node.js.

All employee information and market-demand history
in the demonstration dataset are synthetic.

## 2. Technology Stack

- JavaScript and Node.js
- Express.js REST APIs
- MongoDB and Mongoose
- @huggingface/transformers
- Xenova/all-MiniLM-L6-v2
- simple-statistics

No Python, paid AI API, external AI server, or
custom-trained large language model is required.

## 3. Sentence Embeddings

Model: Xenova/all-MiniLM-L6-v2

Purpose:
Convert natural-language skill, role, and course
descriptions into semantic vector representations.

Each embedding has 384 dimensions.

Implementation:
server/src/ai/embeddings.js

The pretrained transformer generates embeddings
using mean pooling and vector normalization.

The model is loaded lazily and reused across requests.

Skill text:
Skill name + skill description

Role text:
Role title + required skill names

Course text:
Course title + taught skill names

Embeddings are generated during the offline AI build
and stored in MongoDB.

The original MiniLM model is pretrained. SkillSight
uses inference; it does not retrain MiniLM.

## 4. Cosine Similarity

Cosine similarity compares the direction of two
vectors to estimate semantic relatedness.

Formula:

cosine(A,B) = dot(A,B) / (norm(A) * norm(B))

Raw cosine similarity ranges from -1 to 1.

For recommendation factors requiring values between
0 and 1, negative scores are clamped to zero.

Zero vectors are handled without division by zero.

Cosine similarity is used in:

- Hybrid skill matching
- Semantic gap credit
- Learning-course relevance
- Internal mobility recommendations
- Related skill discovery

## 5. Hybrid Skill Matching (FR-01)

Implementation:
server/src/ai/skillMatch.js

The algorithm uses two matching stages.

Stage 1: Exact and alias matching

User input is compared case-insensitively with
the skill names and aliases stored in MongoDB.

An exact or alias match receives a score of 1.

Stage 2: Semantic matching

Unmatched phrases are embedded using MiniLM.

The vectors are compared against stored skill
embeddings using cosine similarity.

Semantic match threshold: 0.60

The strongest valid match is selected.

Duplicate skill matches are removed.

Input restrictions:

- Maximum 2000 characters
- Maximum 30 extracted phrases
- Supported matching skills must exist in the catalog

Missing required embeddings result in AI_NOT_READY
rather than fabricated semantic matches.

## 6. Skill Gap Detection (FR-02)

Implementation:
server/src/ai/gaps.js

The algorithm compares employee skills against
the required skills of a target role.

Each required skill includes:

- Skill ID
- Required proficiency level (1–5)
- Importance weight (1–3)

For an employee who already possesses the required
skill, their actual level is used.

When the required skill is absent, semantic partial
credit may be awarded using a related owned skill.

Semantic credit threshold: 0.70

Partial-credit formula:

effective = min(
  required - 1,
  round(employeeLevel * cosine * 0.5, 1)
)

The measured similarity must meet the threshold.

The gap is:

gap = max(0, required - effective)

Readiness:

readiness = clamp(
  1 - sum(gap * weight) /
      sum(required * weight),
  0,
  1
)

If a role has no required skills, readiness is 1.

Current readiness uses current role requirements.

Future readiness additionally considers:

- Explicit future role skills
- Current skills with forecast growth >= 20%

For rapidly growing required skills, the target
level increases by one, capped at level 5.

Future growth is calculated using the selected
6-month or 12-month forecast horizon.

Skill gaps are ranked using weighted urgency,
including positive forecast-demand growth.

Organization-level readiness uses the same
underlying calculations as individual readiness.

## 7. Historical Market Trends (FR-03)

Implementation:
server/src/ai/trends.js

The system analyzes the most recent 12 months of
stored historical market demand.

It compares the average of the first three months
with the average of the last three months.

Formula:

growthPct =
  (average(last3) - average(first3)) /
  average(first3) * 100

Trend categories:

- Emerging: growth >= 40%
- Growing: growth >= 10%
- Declining: growth <= -10%
- Stable: all other values

For a zero starting average, the implementation
uses a documented display convention of 100% for
positive ending demand and 0% otherwise.

Historical trends are separate from future forecasts.

Synthetic marketPattern labels are never used to
generate inference predictions.

## 8. Demand Forecasting (FR-04)

Implementation:
server/src/ai/forecast.js

Library: simple-statistics

Model: Linear regression

The regression model is fitted to the most recent
12 months of demand observations for each skill.

The model estimates:

y = slope * x + intercept

It predicts the following 12 months.

Negative predicted demand is clipped to zero.

Forecast months begin after the final historical
month, not after the current calendar date.

Forecast growth:

growthPct =
  (lastPredicted - lastActual) /
  lastActual * 100

For zero last actual demand, the implementation
uses 100% for a positive prediction and 0% when
the prediction remains zero.

Forecast trend thresholds:

- Emerging: >= 40%
- Growing: >= 10%
- Declining: <= -10%
- Stable: otherwise

### Uncertainty bounds

A heuristic uncertainty band is calculated using
the standard deviation of regression residuals.

Approximate band:

prediction +/- 1.28 * residualStdDev

The lower bound cannot be negative.

This is a residual-spread heuristic, not a
statistically calibrated 80% prediction interval.

### Backtesting

For 24 months of demand history:

- First 18 months are training history.
- Regression fits the last 12 training months.
- Last 6 months are held-out test observations.
- The naive baseline repeats the final training value.

Metrics:

MAE: Mean Absolute Error

MAPE: Mean Absolute Percentage Error

beatsNaive: Whether regression MAE is lower than
the naive baseline's MAE.

MAPE excludes observations with zero actual demand
to avoid division by zero.

MAE includes these observations.

When fewer than 24 valid months exist,
six-month backtest metrics are unavailable.

At least 12 valid observations are required for
forecast generation.

Forecasts are model-generated and do not guarantee
future real-market outcomes.

## 9. Personalized Learning Recommendations (FR-05)

Implementation:
server/src/ai/learning.js

The system selects courses that teach at least
one missing current or future skill.

Each candidate course receives four factor scores.

Formula:

score =
  0.40 * gapCoverage +
  0.25 * futureDemand +
  0.20 * completionRate +
  0.15 * relevance

All factors are normalized to the range 0–1.

Gap coverage:
Proportion of weighted skill gaps addressed
by the course.

Future demand:
Average normalized forecast demand for the
relevant gap skills taught by the course.

Normalization:
clamp(max(0, growthPct) / 100, 0, 1)

Completion rate:

completed / (completed + dropped)

When no decided learning records are available,
the neutral default is 0.5.

Enrolled courses are not treated as completed
or dropped.

Relevance:
Nonnegative cosine similarity between course
and target role embeddings.

The system returns:

- Up to five ranked courses
- No more than two assigned courses per skill
- Course ranking explanations
- An ordered learning path
- Total course study hours
- Skills without a qualifying catalog course

The learning sequence considers skill prerequisites
before course difficulty level.

## 10. Internal Mobility (FR-06)

Implementation:
server/src/ai/mobility.js

The algorithm recommends alternative employee roles.

Candidate roles:

- Must differ from the current role
- Must be at most one level above the current role

The employee embedding is calculated as a weighted
average of owned skill embeddings, using skill
proficiency levels as weights.

The resulting vector is normalized.

Mobility score:

score =
  0.50 * readiness +
  0.30 * similarity +
  0.20 * demandScore

Readiness:
Current skill readiness for the candidate role.

Similarity:
Nonnegative cosine similarity between employee
and candidate role embeddings.

Demand score:
Importance-weighted normalized forecast demand
across the candidate role's required skills.

The system returns up to five recommendations,
including:

- Role and ranking score
- Readiness and semantic similarity
- Demand score
- Top three missing skills
- Up to two courses
- Additive score explanation

No employee role is changed automatically.

AI suggestion only. HR makes the final decision.

## 11. Career Progression (FR-08)

Implementation:
server/src/ai/career.js

Career paths follow the nextRoles relationships
stored in the Role collection.

Depth-first search identifies possible paths.

Constraints:

- Maximum three role transitions
- No repeated roles within a path
- No cyclic paths
- Optional target role restriction

At every step, the algorithm identifies:

- Missing or insufficient skills
- Required skill proficiency levels
- Up to two suggested courses
- Estimated study duration

The algorithm simulates acquiring role skills
between career steps without modifying the
employee's actual database profile.

Study duration assumes:

20 study hours per month

months = ceil(courseHours / 20)

This is a study-time estimate, not a guaranteed
time to promotion or job readiness.

Career score:

score =
  0.60 * normalizedGapReadiness +
  0.40 * finalRoleDemandScore

The best three paths are returned.

An unreachable target role produces an empty
paths array rather than an invented path.

AI suggestion only. HR makes the final decision.

## 12. Explainable AI

Implementation:
server/src/ai/explain.js

Each score explanation contains:

{
  summary,
  factors: [
    {
      name,
      value,
      weight,
      contribution
    }
  ]
}

Contribution formula:

contribution = value * weight

Contributions are rounded to three decimals
with rounding adjustment to preserve the
displayed score total.

The explanations identify the factors
contributing to recommendation scores.

Forecast slope, MAPE, and residual spread
are diagnostics, not additive recommendation
score factors.

Explanations improve transparency but do not
prove that recommendations are unbiased.

## 13. Offline AI Build

Implementation:
server/src/scripts/aiBuild.js

Command:

npm run ai:build

The script:

1. Connects to MongoDB.
2. Loads the seeded skill, role and course catalogs.
3. Generates pretrained sentence embeddings.
4. Stores embeddings in MongoDB.
5. Identifies up to five related skills per skill
   using cosine similarity >= 0.50.
6. Builds 12-month skill-demand forecasts.
7. Prints the build summary.

Missing seeded data causes a meaningful error.

The script must be rerun after reseeding because
previous AI-generated documents may be removed.

## 14. REST API Integration

AI endpoints:

POST /api/ai/skills/match

GET /api/ai/gaps/:employeeId

GET /api/ai/learning/:employeeId

GET /api/ai/mobility/:employeeId

GET /api/ai/career/:employeeId

Market endpoints:

GET /api/market/trends

GET /api/market/forecasts

GET /api/market/forecasts/:skillId

POST /api/market/forecasts/run

GET /api/market/evaluation

Authentication uses the shared JWT middleware.

Employee-sensitive endpoints are restricted
to the employee themselves or HR.

Forecast regeneration is HR-only.

All public recommendation scores and readiness
values are in the 0–1 range.

Percentage demand growth and MAPE are expressed
as percentages.

Internal embedding vectors and marketPattern
labels must never be exposed in API responses.

## 15. Model Evaluation

Implementation:
server/src/scripts/evaluate.js

Command:

npm run eval

Evaluation measures:

- Forecast MAE and MAPE
- Comparison with a naive forecasting baseline
- Historical trend agreement with synthetic labels
- Alias-only versus hybrid top-1 matching accuracy
- Learning recommendation Precision@5
- Explainability consistency checks
- Selected edge cases

The evaluation stores measured results in:

server/eval-results.json

The actual metrics are documented separately in:

docs/EVALUATION.md

Metrics must be obtained by executing the
evaluation script, never invented.

## 16. Limitations and Risks

### Synthetic data

Employee profiles and market-demand histories
are synthetic.

Therefore, evaluation results cannot establish
predictive accuracy in real-world labor markets.

### Embedding limitations

MiniLM may assign high similarity to related but
noninterchangeable technologies.

Cosine similarity alone does not establish
professional competency.

### Forecast limitations

Linear regression assumes a locally linear trend.

It may not capture:

- Sudden technology changes
- Economic disruptions
- Hiring seasonality
- Nonlinear adoption patterns
- Changes in job-market reporting

### Recommendation limitations

Recommendation weights are configured design
choices rather than empirically learned weights.

Completion history may not generalize to new
employees or course providers.

### Fairness and human oversight

SkillSight uses synthetic, skills-based records.

It does not model protected demographic traits.

The system is intended as decision support.

Recommendations must not be treated as automatic
promotion, hiring, rejection, or reassignment
decisions.

Human review remains necessary.

## 17. Conclusion

SkillSight combines pretrained semantic embeddings,
statistical demand forecasting, weighted skill-gap
analysis, explainable recommendations, and graph-
based career progression.

The project demonstrates an integrated AI/ML
workflow using Node.js and MongoDB.

The reported evaluation results apply to the
synthetic demonstration data and should not be
represented as proven real-world performance.
