# SKILLSIGHT — SHARED CONTRACT v1
(Identical copy in all 4 prompts. If this contract and your own idea disagree, the CONTRACT WINS.)

## 1. Project
- Name: **SkillSight — Skill Gap and Workforce Evolution Predictor**
- GitHub repo: `HCL_HACKATHON` (https://github.com/SRINIVASsai72/HCL_HACKATHON); application name remains SkillSight
- Stack: React + Vite + Tailwind CSS v4 | Node.js + Express 5 | MongoDB Atlas + Mongoose 8 | Axios | JWT + bcryptjs
- AI (all JavaScript, free, no API keys):
  - `@huggingface/transformers` with model `Xenova/all-MiniLM-L6-v2` → text embeddings (384 numbers) for skill/role/course similarity
  - `simple-statistics` → linear regression forecasting + statistics
- No Python, no LLM, no paid API, no extra servers.
- All employee data is FAKE (synthetic). No gender, age, religion, caste, photo, address, salary fields anywhere.

## 2. Team and branches
| Person | Role | Branch |
|---|---|---|
| P1 | Frontend Developer 1 | `feature/frontend-1` |
| P2 | Frontend Developer 2 | `feature/frontend-2` |
| P3 | Backend Developer 1 + Repo Owner | `feature/backend-1` |
| P4 | Backend Developer 2 (AI/ML) | `feature/backend-2` |

## 3. Golden merge rules
1. P3 creates ALL shared files + empty stub files on `main` FIRST. Then everyone branches from `main`.
2. You only edit files YOU own (Section 6). Never create a file with another owner's path.
3. Shared files (owner "SHARED") are edited ONLY by P3 on `main`. Others then run `git merge origin/main`.
4. No one adds npm packages. All packages are installed by P3 in setup. Need one more? Ask P3 to add it on main.
5. Use exact names from this contract: file names, field names, URLs, JSON keys.
6. Merge order at the end: `feature/backend-1` → `feature/backend-2` → `feature/frontend-1` → `feature/frontend-2`.

## 4. Environment
- Backend port 5000, frontend port 5173
- `server/.env.example`
```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/skillsight
JWT_SECRET=change_me
CLIENT_URL=http://localhost:5173
DEMO_PASSWORD=Demo@123
```
- `client/.env.example`
```
VITE_API_URL=http://localhost:5000/api
```
- Server npm scripts (in `server/package.json`, `"type": "module"`):
| Script | Command | Owner of the script file |
|---|---|---|
| `dev` | `node --watch src/index.js` | SHARED |
| `start` | `node src/index.js` | SHARED |
| `seed` | `node src/seed/seed.js` (300 employees) | P3 |
| `seed:small` | `node src/seed/seed.js --small` (30 employees) | P3 |
| `ai:build` | `node src/scripts/aiBuild.js` | P4 |
| `eval` | `node src/scripts/evaluate.js` | P4 |
| `setup:data` | `npm run seed && npm run ai:build` | SHARED |
- Server packages: `express@5 mongoose@8 jsonwebtoken bcryptjs cors helmet dotenv @huggingface/transformers simple-statistics @faker-js/faker`
- Client packages: `axios react-router-dom recharts react-force-graph-2d` + dev `tailwindcss @tailwindcss/vite`
- Demo logins (password = DEMO_PASSWORD): `hr@skillsight.com` (HR), `emp001@skillsight.com` … `emp005@skillsight.com` (employees)

## 5. Folder structure
```
HCL_HACKATHON/
├── README.md                              SHARED
├── .gitignore                             SHARED
├── docs/
│   ├── SHARED_CONTRACT.md                 SHARED (this file)
│   ├── DESIGN_ARCHITECTURE.md             SHARED
│   ├── API.md                             P3
│   ├── DATASET.md                         P3
│   ├── AI_MODELS.md                       P4
│   ├── EVALUATION.md                      P4
│   ├── FRONTEND.md                        P1
│   └── DEMO_GUIDE.md                      P2
├── client/
│   ├── package.json, vite.config.js, index.html, .env.example   SHARED
│   └── src/
│       ├── main.jsx                       SHARED
│       ├── App.jsx                        SHARED (all routes already registered)
│       ├── index.css                      SHARED (@import "tailwindcss";)
│       ├── api.js                         SHARED (axios instance)
│       ├── AuthContext.jsx                SHARED
│       ├── components/
│       │   ├── Navbar.jsx                 SHARED
│       │   ├── ProtectedRoute.jsx         SHARED
│       │   └── ui.jsx                     SHARED (Loading, ErrorBox, Badge, ScoreBar, ExplainBox)
│       ├── mocks/p1Mocks.js               P1 (optional sample data)
│       ├── mocks/p2Mocks.js               P2 (optional sample data)
│       └── pages/
│           ├── LoginPage.jsx              P1
│           ├── EmployeesPage.jsx          P1
│           ├── ProfilePage.jsx            P1
│           ├── ReviewsPage.jsx            P1
│           ├── MarketPage.jsx             P2
│           ├── RiskPage.jsx               P2
│           ├── CareerPage.jsx             P2
│           ├── GraphPage.jsx              P2
│           └── ReportPage.jsx             P2
└── server/
    ├── package.json, .env.example         SHARED
    └── src/
        ├── index.js                       SHARED (connect DB, start server)
        ├── app.js                         SHARED (mounts all routers)
        ├── db.js                          SHARED
        ├── constants.js                   SHARED
        ├── middleware/auth.js             SHARED (requireAuth, requireHR, requireSelfOrHR)
        ├── middleware/error.js            SHARED (notFound, errorHandler)
        ├── utils/http.js                  SHARED (ok, AppError, isValidId)
        ├── models/                        SHARED (all 10 models; schema changes only via P3)
        │   User.js Employee.js Skill.js Role.js Project.js Course.js
        │   LearningRecord.js MarketDemand.js Forecast.js Review.js
        ├── routes/
        │   ├── auth.routes.js             P3
        │   ├── employee.routes.js         P3
        │   ├── review.routes.js           P3
        │   ├── risk.routes.js             P3
        │   ├── graph.routes.js            P3
        │   ├── report.routes.js           P3
        │   ├── ai.routes.js               P4
        │   └── market.routes.js           P4
        ├── controllers/                   (same names: auth.controller.js … market.controller.js, same owners as routes)
        ├── analytics/
        │   ├── risk.js                    P3
        │   ├── graph.js                   P3
        │   └── report.js                  P3
        ├── ai/
        │   ├── embeddings.js              P4
        │   ├── skillMatch.js              P4
        │   ├── gaps.js                    P4
        │   ├── trends.js                  P4
        │   ├── forecast.js                P4
        │   ├── learning.js                P4
        │   ├── mobility.js                P4
        │   ├── career.js                  P4
        │   └── explain.js                 P4
        ├── seed/
        │   ├── seed.js                    P3
        │   ├── random.js                  P3
        │   └── catalog.js                 P3 (40 skills, 12 roles, course templates)
        └── scripts/
            ├── aiBuild.js                 P4
            └── evaluate.js                P4
```
P3's setup creates a STUB for every P1/P2/P3/P4 file. The stubs have the right exports, so the app runs from day 1. Owners replace their stub content in their own branch, so merging causes no conflicts.

## 6. Stub rules (made by P3 in setup)
- A page stub is `export default function MarketPage() { return <div className="p-6">MarketPage — TODO (P2)</div>; }`
- A route stub is `import { Router } from 'express'; const router = Router(); export default router;`
- An ai/analytics stub exports the functions from Section 11. Each one throws `new AppError(501, 'NOT_IMPLEMENTED', '<name> not implemented yet')`.
- `app.js` mounts ALL routers on `/api` up front: `app.use('/api', authRoutes, employeeRoutes, reviewRoutes, riskRoutes, graphRoutes, reportRoutes, aiRoutes, marketRoutes)`.
  Every router uses full paths inside, for example `router.get('/employees/:id', …)`.

## 7. Database models (Mongoose, `{ timestamps: true }`)
**User**
| field | type | rules |
|---|---|---|
| email | String | required, unique, lowercase |
| passwordHash | String | required |
| role | String | enum `['hr','employee']` |
| employeeId | ObjectId → Employee | null for HR |

**Employee**
| field | type | rules |
|---|---|---|
| code | String | required, unique, like `EMP001` |
| name | String | required (fake name) |
| department | String | enum DEPARTMENTS |
| roleId | ObjectId → Role | required |
| skills | [{ skillId: ObjectId → Skill, level: Number 1–5 }] | no duplicate skillId |
| interests | [ObjectId → Role] | roles they'd like |

**Skill**
| field | type | rules |
|---|---|---|
| code | String | unique, like `react` |
| name | String | unique, like `React` |
| category | String | enum SKILL_CATEGORIES |
| description | String | one sentence |
| aliases | [String] | lowercase, like `['reactjs','react.js']` |
| prerequisites | [ObjectId → Skill] | |
| marketPattern | String | `emerging/growing/stable/declining`, `select:false` (used ONLY by evaluate.js, never by the AI) |
| embedding | [Number] | 384 numbers, `select:false`, written by ai:build |
| related | [{ skillId: ObjectId → Skill, score: Number }] | top 5 similar skills, written by ai:build |

**Role**
| field | type | rules |
|---|---|---|
| code | String | unique, like `frontend-dev` |
| title | String | |
| department | String | enum DEPARTMENTS |
| level | Number | 1–3 |
| requiredSkills | [{ skillId, level 1–5, weight 1–3 }] | |
| futureSkills | [{ skillId, level 1–5, weight 1–3 }] | skills needed in the next 12 months |
| nextRoles | [ObjectId → Role] | career ladder |
| embedding | [Number] | `select:false`, written by ai:build |

**Project**: code (`PRJ001`), name, department, status enum `['completed','active','planned']`, startDate Date, requiredSkills [{ skillId, level, headcount }], members [ObjectId → Employee]

**Course**: code (`CRS001`), title, type enum `['course','certification']`, provider, skills [{ skillId, targetLevel }], level Number 1–5 (entry level), hours Number, embedding [Number] `select:false`

**LearningRecord**: employeeId, courseId, status enum `['enrolled','completed','dropped']`, startedAt Date, completedAt Date (only if completed)

**MarketDemand**: skillId, month String `'YYYY-MM'`, value Number ≥ 0, source enum `['synthetic','external']`. Unique index (skillId, month).

**Forecast**: skillId, method String `'linear_regression'`, history [{ month, value }], predictions [{ month, value, low, high }], growthPct Number, trend String (TRENDS), metrics { mae, mape, naiveMae, naiveMape, beatsNaive: Boolean }, params { slope, intercept }, source String. Each `ai:build` replaces all forecasts.

**Review**: type enum REVIEW_TYPES, employeeId (optional), skillId (optional), roleId (optional), aiOutput Mixed (required), status enum REVIEW_STATUS default `'pending'`, comment String, modifiedOutput Mixed, createdBy ObjectId → User, decidedBy ObjectId → User, decidedAt Date

## 8. Constants (`server/src/constants.js`; same values hardcoded where the frontend needs them)
```
DEPARTMENTS = ['Engineering','Data & AI','Cloud','Quality','Embedded']
SKILL_CATEGORIES = ['language','frontend','backend','data','ai_ml','cloud_devops','testing','embedded']
TRENDS = ['emerging','growing','stable','declining']
REVIEW_TYPES = ['learning','mobility','career','risk']
REVIEW_STATUS = ['pending','approved','rejected','modified']
LEVELS: 1 Beginner, 2 Basic, 3 Intermediate, 4 Advanced, 5 Expert
HISTORY: 24 months, '2024-10' … '2026-09'. FORECAST: 12 months, '2026-10' … '2027-09'
```
**40 skills (name / category / market pattern):**
- language: Java/stable, Python/growing, JavaScript/stable, TypeScript/growing, C/stable, C++/stable, SQL/stable
- frontend: HTML/CSS/stable, React/growing, Angular/stable, Vue.js/stable, jQuery/declining
- backend: Node.js/growing, Express.js/stable, Spring Boot/growing, REST APIs/stable, Microservices/growing
- data: MongoDB/stable, PostgreSQL/growing, MySQL/declining, Power BI/stable
- ai_ml: Machine Learning/growing, Deep Learning/growing, NLP/growing, Generative AI/emerging, MLOps/emerging
- cloud_devops: AWS/growing, Azure/stable, Docker/growing, Kubernetes/growing, CI/CD/growing, Linux/stable
- testing: Manual Testing/declining, Selenium/declining, Playwright/emerging, API Testing/growing, JUnit/stable
- embedded: Embedded C/stable, Microcontrollers/stable, RTOS/stable

**12 roles (title / department / level → nextRoles):**
- Frontend Developer / Engineering / 1 → Full Stack Developer
- Backend Developer / Engineering / 1 → Full Stack Developer, DevOps Engineer
- Full Stack Developer / Engineering / 2 → Tech Lead
- Tech Lead / Engineering / 3 → (none)
- Data Analyst / Data & AI / 1 → ML Engineer
- ML Engineer / Data & AI / 2 → GenAI Engineer
- GenAI Engineer / Data & AI / 3 → (none)
- DevOps Engineer / Cloud / 2 → Cloud Architect
- Cloud Architect / Cloud / 3 → (none)
- QA Engineer / Quality / 1 → Test Automation Engineer
- Test Automation Engineer / Quality / 2 → Tech Lead
- Embedded Engineer / Embedded / 1 → Backend Developer, Test Automation Engineer

## 9. API rules
- Base URL `http://localhost:5000/api`. JSON only.
- Header `Authorization: Bearer <token>`. JWT payload `{ userId, role, employeeId }`, expiry 8h.
- Success response: `{ "success": true, "data": ... }`
- Error response: `{ "success": false, "code": "NOT_FOUND", "message": "Employee not found" }`
- Codes: 400 `BAD_REQUEST`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, 404 `NOT_FOUND`, 409 `CONFLICT`, 500 `SERVER_ERROR`, 501 `NOT_IMPLEMENTED`, 503 `AI_NOT_READY` (run ai:build)
- Access levels: **public** | **auth** (any logged-in user) | **hr** | **self/hr** (HR, or the employee whose employeeId = :id)
- Controllers: `export async function name(req, res) { … ok(res, data) }`. Throw `new AppError(status, code, message)` for errors. Express 5 sends async errors to errorHandler automatically.

## 10. Endpoints
| # | Method + URL | Access | Input | `data` returned | Owner |
|---|---|---|---|---|---|
| A1 | POST /auth/login | public | `{ email, password }` | `{ token, user:{ _id, email, role, employeeId } }` | P3 |
| A2 | GET /auth/me | auth | – | `{ user }` | P3 |
| E1 | GET /employees | hr | `?search=&department=` | `[{ _id, code, name, department, role:{_id,title}, skillCount }]` | P3 |
| E2 | GET /employees/:id | self/hr | – | `Profile` | P3 |
| E3 | PUT /employees/:id/skills | self/hr | `{ skills:[{ skillId, level }] }` (full list, level 1–5) | `Profile` | P3 |
| E4 | GET /skills | auth | – | `[{ _id, code, name, category, related:[{skillId, name, score}] }]` | P3 |
| E5 | GET /roles | auth | – | `[{ _id, code, title, department, level, requiredSkills:[{skillId, name, level, weight}], futureSkills:[…], nextRoles:[{_id,title}] }]` | P3 |
| E6 | GET /courses | auth | `?skillId=` | `[{ _id, code, title, type, provider, level, hours, skills:[{skillId, name, targetLevel}] }]` | P3 |
| AI1 | POST /ai/skills/match | auth | `{ text }` (max 2000 chars) | `[{ phrase, skillId, skillName, score, method:'alias'|'embedding' }]` | P4 |
| AI2 | GET /ai/gaps/:employeeId | self/hr | `?roleId=&horizon=6|12` (default: current role, 12) | `GapResult` | P4 |
| AI3 | GET /ai/learning/:employeeId | self/hr | `?roleId=` | `LearningResult` | P4 |
| AI4 | GET /ai/mobility/:employeeId | self/hr | – | `MobilityResult` | P4 |
| AI5 | GET /ai/career/:employeeId | self/hr | `?targetRoleId=` | `CareerResult` | P4 |
| M1 | GET /market/trends | auth | `?category=` | `[TrendItem]` | P4 |
| M2 | GET /market/forecasts | auth | – | `[{ skillId, skillName, category, lastValue, nextYearValue, growthPct, trend, mape }]` sorted by growthPct desc | P4 |
| M3 | GET /market/forecasts/:skillId | auth | – | `ForecastResult` | P4 |
| M4 | POST /market/forecasts/run | hr | – | `{ count, avgMape, avgNaiveMape, pctBeatNaive }` | P4 |
| M5 | GET /market/evaluation | auth | – | `{ forecast:{…}, skillMatch:{…}, recommendations:{…} }` from the last `npm run eval` (null if not run) | P4 |
| R1 | GET /risk | hr | `?horizon=6|12` | `[RiskItem]` sorted by riskScore desc | P3 |
| V1 | POST /reviews | self/hr | `{ type, employeeId?, skillId?, roleId? }` | `Review` (server re-computes aiOutput itself) | P3 |
| V2 | GET /reviews | auth | `?status=&type=` (employee sees only their own) | `[Review]` (employee name and skill name filled in) | P3 |
| V3 | PATCH /reviews/:id | hr | `{ status:'approved'|'rejected'|'modified', comment, modifiedOutput? }` (comment required unless approved) | `Review`, or 409 if not pending | P3 |
| G1 | GET /graph/employee/:id | hr | – | `GraphData` | P3 |
| G2 | GET /graph/skill/:id | hr | – | `GraphData` | P3 |
| G3 | GET /graph/stats | hr | – | `{ nodes, links, topSkills:[{ skillId, name, connections }] }` | P3 |
| RP1 | GET /reports/workforce | hr | – | `Report` | P3 |

## 11. Shared JSON shapes
```
Explanation = { summary: string, factors: [{ name: string, value: number, weight: number, contribution: number }] }
  // contribution = value × weight, and the contributions add up to the score

Profile = { _id, code, name, department, role:{ _id, title, level },
            skills:[{ skillId, name, category, level }], interests:[{ _id, title }],
            learning:{ completed, enrolled, dropped } }

GapItem = { skillId, skillName, required, current, effective, gap, weight, growthPct, reason }
GapResult = { employeeId, role:{ _id, title }, horizon, readiness:{ current, future },   // 0–1
              currentGaps:[GapItem], futureGaps:[GapItem], explanation }

TrendItem = { skillId, skillName, category, latest, growthPct, trend, source }

ForecastResult = { skillId, skillName, method, history:[{ month, value }],
                   predictions:[{ month, value, low, high }], growthPct, trend,
                   metrics:{ mae, mape, naiveMae, naiveMape, beatsNaive }, source, explanation }

LearningResult = { employeeId, role:{ _id, title },
                   recommendations:[{ rank, course:{ _id, code, title, type, provider, hours },
                                      skills:[string], score, explanation }],
                   path:[{ order, courseId, title }], totalHours, uncoveredSkills:[string] }

MobilityResult = { employeeId, currentRole:{ _id, title },
                   recommendations:[{ rank, role:{ _id, title, level }, score, readiness, similarity,
                                      demandScore, topGaps:[GapItem], courses:[{ _id, title }], explanation }],
                   note: "AI suggestion only. HR makes the final decision." }

CareerResult = { employeeId, currentRole:{ _id, title },
                 paths:[{ rank, steps:[{ role:{ _id, title, level },
                                         skillsToLearn:[{ skillName, from, to }],
                                         courses:[{ _id, title, hours }], months }],
                          totalMonths, score, explanation }],
                 note: "AI suggestion only. HR makes the final decision." }

RiskItem = { skillId, skillName, category, demandNow, projectedDemand, supply, riskScore, band,  // 'high'|'medium'|'low'
             keyPersonRisk, experts, growthPct, explanation }

Review = { _id, type, employee:{ _id, code, name }|null, skill:{ _id, name }|null, roleId, aiOutput, status,
           comment, modifiedOutput, createdBy, decidedBy, decidedAt, createdAt }

GraphData = { nodes:[{ id, label, type }],          // id = '<type>:<mongoId>', type = employee|skill|role|project|course
              links:[{ source, target, label }] }    // label = HAS_SKILL|REQUIRES|FUTURE_REQUIRES|TEACHES|NEEDS|RELATED_TO|PREREQUISITE|NEXT_ROLE|HOLDS_ROLE|MEMBER_OF

Report = { generatedAt, dataSource:'synthetic',
           workforce:{ employees, departments, avgSkillsPerEmployee },
           readiness:{ current, future },
           topGaps:[{ skillName, employees }],
           trends:{ emerging:[{ skillName, growthPct }], declining:[{ skillName, growthPct }] },
           risk:{ high, medium, low, top:[{ skillName, riskScore }] },
           learning:{ records, completionRate },
           reviews:{ pending, approved, rejected, modified },
           forecastQuality:{ avgMape, avgNaiveMape, pctBeatNaive },
           departments:[{ name, employees, readiness }] }
```

## 12. Function interfaces between backend files
P4 exports these (P3 calls them):
```
ai/embeddings.js : embed(texts: string[]) -> Promise<number[][]>,  cosine(a, b) -> number
ai/skillMatch.js : matchSkills(text) -> Promise<array>                      (AI1)
ai/gaps.js       : getGaps(employeeId, { roleId, horizon }) -> Promise<GapResult>
                   getOrgReadiness() -> Promise<{ current, future, topGaps:[{skillName, employees}],
                                                  departments:[{ name, employees, readiness }] }>
ai/trends.js     : getTrends({ category }) -> Promise<TrendItem[]>
ai/forecast.js   : linearForecast(values, steps), backtest(values), runAllForecasts() -> summary
ai/learning.js   : getLearningPlan(employeeId, { roleId }) -> Promise<LearningResult>
ai/mobility.js   : getMobility(employeeId) -> Promise<MobilityResult>
ai/career.js     : getCareerPaths(employeeId, { targetRoleId }) -> Promise<CareerResult>
ai/explain.js    : makeExplanation(factors, summaryText) -> Explanation
```
P3 exports these:
```
analytics/risk.js   : getSkillRisk({ horizon }) -> Promise<RiskItem[]>
analytics/graph.js  : employeeGraph(id), skillGraph(id), graphStats()
analytics/report.js : buildReport() -> Promise<Report>
```
POST /reviews (P3) fills in `aiOutput` by calling: learning → getLearningPlan, mobility → getMobility, career → getCareerPaths, risk → getSkillRisk (filtered by skillId).

## 13. Frontend contract (shared files made by P3)
- `api.js`: default export is an axios instance with `baseURL = import.meta.env.VITE_API_URL`. It adds the token from `localStorage.token`. On a 401 it clears the token and goes to `/login`. Pages read `res.data.data`.
- `AuthContext.jsx`: exports `AuthProvider` and `useAuth()`, which returns `{ user, login(email, password), logout(), isHR }`.
- `components/ui.jsx`: named exports `Loading`, `ErrorBox({ message })`, `Badge({ text, color })`, `ScoreBar({ value })` (value 0–1), `ExplainBox({ explanation })` (shows the summary plus a factor table with bars).
- `ProtectedRoute.jsx`: `<ProtectedRoute hrOnly>` wraps pages.
- `Navbar.jsx`: links. HR sees Employees, Market, Risk, Graph, Reviews, Report. An employee sees My Profile, Market, Reviews.
- Routes in `App.jsx`:
| Path | Page | Access | Owner |
|---|---|---|---|
| /login | LoginPage | public | P1 |
| / | redirects HR → /employees, employee → /employees/:ownId | auth | SHARED |
| /employees | EmployeesPage | hr | P1 |
| /employees/:id | ProfilePage | auth (self/hr) | P1 |
| /employees/:id/career | CareerPage | auth (self/hr) | P2 |
| /reviews | ReviewsPage | auth | P1 |
| /market | MarketPage | auth | P2 |
| /risk | RiskPage | hr | P2 |
| /graph | GraphPage | hr | P2 |
| /report | ReportPage | hr | P2 |
- Style: Tailwind classes only. Simple tables, forms, buttons, cards. No other UI libraries, no animation, no Redux. Use `useState` and `useEffect` only.
- Each page shows `<Loading/>` while loading and `<ErrorBox/>` on errors.
- Show a "Synthetic data" badge on market, forecast and report screens.

## 14. Which screen calls which API
| Page | APIs |
|---|---|
| LoginPage | A1 |
| EmployeesPage | E1 |
| ProfilePage | E2, E3, E4, E5, AI1, AI2, AI3, V1 (type learning), link to /employees/:id/career |
| ReviewsPage | V2, V3 |
| MarketPage | M1, M2, M3, M4, M5 |
| RiskPage | R1, V1 (type risk) |
| CareerPage | E5, AI4, AI5, V1 (types mobility and career) |
| GraphPage | E1, E4, G1, G2, G3 |
| ReportPage | RP1 (+ a "Print" button that calls window.print()) |
