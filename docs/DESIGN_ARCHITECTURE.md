# SkillSight — Design & Architecture
**Skill Gap and Workforce Evolution Predictor** · HCLTech AI Future Ready FullStack Web Engineer Hackathon

---

## 1. The problem
Technology changes faster than companies can plan. HR usually finds out that skills are missing **after** a project is already short of people. Employees don't know what to learn next or which internal role they could grow into.

**Our goal:** one platform that knows what skills people have, predicts which skills will be needed, and recommends what each person should learn or where they can move, with clear reasons and HR always in control.

## 2. Users
| User | What they get |
|---|---|
| HR / Workforce planner | Company-wide gaps, demand forecasts, shortage risks, internal candidates, review queue, analytics report |
| Employee | Their own skill profile, gaps, learning plan, possible role moves, career path, review status |

## 3. Design principles
1. **Simple and explainable.** Every number can be explained in one sentence.
2. **Real AI, not if-else.** A pretrained language model for meaning, and a fitted regression model for prediction.
3. **Human in control.** The AI recommends. HR approves, rejects or modifies.
4. **Fair by design.** No gender, age, religion or similar fields exist at all. All data is synthetic.
5. **One stack we know.** JavaScript everywhere (React, Node, MongoDB). No Python, no paid APIs.

## 4. System architecture
```
┌─────────────────────────── FRONTEND (React + Vite + Tailwind) ───────────────────────────┐
│ Login │ Employees │ Profile (Skills, Gaps, Learning) │ Career & Mobility │ Market/Forecast │
│ Risk  │ Knowledge Graph │ HR Reviews │ Workforce Report                                  │
└───────────────────────────────────────┬──────────────────────────────────────────────────┘
                                        │  Axios + JWT token  (REST JSON, /api)
┌───────────────────────────────────────▼──────────────────────────────────────────────────┐
│ BACKEND (Node.js + Express)                                                              │
│  Auth & roles (JWT, bcrypt)   Employees & catalog   HR Reviews   Risk   Graph   Report   │
│  ┌──────────────────────────── AI ENGINE (JavaScript) ────────────────────────────────┐  │
│  │ Embeddings (MiniLM)  →  Skill matching · Related skills · Role/course similarity   │  │
│  │ Linear regression    →  Demand forecast + backtest vs baseline                     │  │
│  │ Scoring + explain    →  Gaps · Learning plan · Mobility · Career paths · Risk      │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────┬──────────────────────────────────────────────────┘
                                        │ Mongoose
┌───────────────────────────────────────▼──────────────────────────────────────────────────┐
│ MongoDB Atlas: Users · Employees · Skills · Roles · Projects · Courses · LearningRecords │
│                MarketDemand · Forecasts · Reviews                                        │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

## 5. Technology choices
| Need | We use | Why | Simpler option we rejected |
|---|---|---|---|
| UI | React + Vite + Tailwind | Fast to build, team knows it | – |
| API | Node + Express | Same language as the frontend | – |
| Database | MongoDB Atlas + Mongoose | Flexible documents, free tier, skills nested inside employees | – |
| Understanding skill text | Transformers.js + `all-MiniLM-L6-v2` | Free pretrained NLP model, runs inside Node on CPU | Exact text matching only (fails on "reactjs", "k8s") |
| Forecasting | Linear regression (`simple-statistics`) + backtest | Easy to explain, works with 24 months of data, measurable | Deep learning (too little data, hard to explain) |
| Knowledge graph | Built from MongoDB relations, drawn with `react-force-graph-2d` | No extra database to run | Neo4j (extra setup) |
| Explanations | Factor × weight = contribution | Exact and honest | LLM text (can hallucinate, costs money) |

## 6. Data model
```
            ┌────────── nextRoles ──────────┐
            ▼                               │
Employee ──roleId──► Role ──requiredSkills/futureSkills──► Skill ◄── related / prerequisites ──┐
   │  skills[{skillId, level}]                              ▲  ▲                                │
   │                                                        │  └────────────────────────────────┘
   ├── LearningRecord ──► Course ──skills[{skillId}]────────┤
   └── member of ─► Project ──requiredSkills────────────────┤
                                              MarketDemand ─┘──► Forecast (per skill)
Review ──► (employee / skill) + AI output snapshot + HR decision
```

**Dataset (synthetic, reproducible with seed 42):** 300 employees · 40 skills · 12 roles · 40 projects · ~60 courses and certifications · ~600 learning records · 24 months of demand per skill.

**Test employees:** EMP901 (no skills), EMP902 (fully ready), EMP903 (knows Vue.js but not React).

## 7. How each requirement works
| FR | Feature | How it works |
|---|---|---|
| FR-01 | Skill Inventory | Employee/HR edits skill levels 1–5. "Find skills from text" uses the embedding model to map free text ("reactjs", "docker containers") to official skills. |
| FR-02 | Gap Detection | Required level − own level. **Future** gaps come from the role's future skills plus skills whose forecast grows ≥ 20%. Similar skills (for example Vue.js → React) give partial credit using AI similarity. Readiness % = 1 − weighted gap / weighted requirement. |
| FR-03 | Market Intelligence | 12-month growth of each skill's demand classifies it as emerging, growing, stable or declining. |
| FR-04 | Demand Forecasting | Linear regression on the last 12 months predicts 12 months ahead, with an 80% range. Tested on the last 6 known months against a "no change" baseline. |
| FR-05 | Learning Paths | Course score = 40% gap coverage + 25% future demand + 20% past completion rate + 15% AI relevance to the target role. Ordered by prerequisites. |
| FR-06 | Internal Mobility | Role score = 50% readiness + 30% AI similarity between the employee's skills and the role + 20% future demand of the role's skills. |
| FR-07 | Workforce Risk | Projected demand (people needed × forecast growth) vs supply (skilled people) gives a risk score with high, medium or low band, plus a key-person warning when only one expert exists. |
| FR-08 | Career Paths | Follow the role ladder up to 3 steps. Each step lists skills to learn, courses and estimated months. |
| FR-09 | Explainable AI | Every result carries `factors[{name, value, weight, contribution}]` and a one-line summary, shown in a "Why?" box. |
| FR-10 | Human Review | Any recommendation can be submitted. HR approves, rejects or modifies with a comment. Nothing changes automatically. |

## 8. AI pipeline
```
 npm run seed ──► synthetic data in MongoDB
       │
 npm run ai:build
       ├─► Embed skills, roles, courses (MiniLM, 384 numbers each) ─► related skills
       └─► For each skill: backtest (train 18 mo → test 6 mo) ─► fit last 12 mo ─► forecast 12 mo
       │
 Live request (e.g. "learning plan for EMP903")
       employee skills + role + forecasts + embeddings
          ─► gaps (current + future) ─► score courses ─► ordered path ─► explanation
          ─► "Submit for HR review" ─► HR decision ─► report
```

## 9. Skills knowledge graph (Deliverable 2)
- **Nodes:** employees, skills, roles, projects, courses.
- **Links:** HAS_SKILL, REQUIRES, FUTURE_REQUIRES, TEACHES, NEEDS (project), RELATED_TO (AI similarity), PREREQUISITE, NEXT_ROLE, HOLDS_ROLE, MEMBER_OF.
- Built live from MongoDB references, so no separate graph database.
- Views: an employee's network, a skill's network, and the "most connected skills" (the skills that unlock the most roles, projects and courses).

## 10. Human review flow
```
AI recommendation ─► "Submit for HR review" ─► Review (pending, AI output saved)
                                                   │
                       HR: Approve | Reject (comment) | Modify (edit + comment)
                                                   │
                         Employee sees the status · counted in the report
```

## 11. Responsible AI
- Hiring and role changes stay **human decisions**. Mobility and career results say "AI suggestion only".
- **No sensitive attributes** are stored or used. Scoring uses only skills, roles, courses, learning history and market demand.
- All employees are **synthetic**. Market data is labelled "Synthetic data" on every screen.
- Access control: HR sees everyone, an employee sees only themselves (JWT + role checks). Passwords are hashed with bcrypt.

## 12. How we measure quality (honest numbers from `npm run eval`)
| What | Test | Compared with |
|---|---|---|
| Forecast accuracy | MAPE on the last 6 months (unseen during the test fit) | "No change" baseline |
| Trend detection | Predicted trend vs the pattern planted in the synthetic data | – |
| Skill matching | 30 hand-written phrases (for example "k8s", "gen ai") | Exact-name matching |
| Learning recommendations | Precision@5 on 8 team-labelled cases | "Most popular courses" |
| Explainability | Contributions add up exactly to each score | – |

*(Fill in the real numbers after running `npm run eval`.)*

## 13. Evaluation criteria → our evidence
| Criterion | What we show |
|---|---|
| Forecast Accuracy | Forecast chart with range, MAPE vs baseline, % of skills beating the baseline |
| Recommendation Relevance | Two employees get different plans, Precision@5 vs popularity |
| Explainability | "Why?" box on gaps, courses, roles, forecasts and risks |
| Business Impact | Readiness %, shortage risks found early, HR review loop, live report |
| Innovation | AI similarity credit, forecast-driven future gaps, knowledge graph |

## 14. Team
| Person | Owns |
|---|---|
| P1 Frontend 1 | Login, Employees, Profile (skills, gaps, learning), HR Reviews |
| P2 Frontend 2 | Market & Forecast, Risk, Career & Mobility, Knowledge Graph, Report |
| P3 Backend 1 + Repo Owner | Setup, dataset, auth, employee APIs, reviews, risk, graph, report |
| P4 Backend 2 (AI/ML) | Embeddings, skill matching, gaps, trends, forecast, learning, mobility, career, evaluation |

## 15. Limitations
- The data is synthetic, so the numbers prove the method works, not real-market accuracy.
- Linear regression doesn't capture seasonality or sudden shocks.
- Recommendation weights are set by the team and documented.
- Career durations assume 20 study hours per month.
- The model understands English text only.

## 16. Future work
Import real job-market data, use a stronger forecasting model when more history exists, collect HR feedback to tune the weights, and add manager skill assessments.
