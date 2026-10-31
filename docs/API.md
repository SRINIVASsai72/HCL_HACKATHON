
# SkillSight — REST API Documentation

## 1. Overview

SkillSight is an AI-powered workforce skill-gap and
workforce evolution prediction platform.

Backend: Node.js + Express 5  
Database: MongoDB Atlas + Mongoose 8  
Authentication: JWT + bcryptjs  
API base URL: http://localhost:5000/api

All API responses use JSON.

Employee information and market demand data are synthetic.

## 2. Response Format

Success:

```json
{
  "success": true,
  "data": {}
}
```

Failure:

```json
{
  "success": false,
  "code": "NOT_FOUND",
  "message": "Employee not found"
}
```

HTTP error codes:

| HTTP | Code | Meaning |
|---|---|---|
| 400 | BAD_REQUEST | Invalid input |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Requested resource missing |
| 409 | CONFLICT | Review already decided |
| 500 | SERVER_ERROR | Unexpected server error |
| 501 | NOT_IMPLEMENTED | Feature not implemented |
| 503 | AI_NOT_READY | AI data or forecasts unavailable |

## 3. Authentication

All protected endpoints require:

Authorization: Bearer YOUR_JWT_TOKEN

Tokens expire after 8 hours.

User roles:
- hr
- employee

Demo accounts:
- hr@skillsight.com
- emp001@skillsight.com through emp005@skillsight.com

Passwords are configured through DEMO_PASSWORD
in server/.env.

### A1 — Login

POST /auth/login

Access: Public

Request:

```json
{
  "email": "hr@skillsight.com",
  "password": "DEMO_PASSWORD_VALUE"
}
```

Response data:

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "_id": "USER_ID",
    "email": "hr@skillsight.com",
    "role": "hr",
    "employeeId": null
  }
}
```

### A2 — Current User

GET /auth/me

Access: Authenticated

Response data:

```json
{
  "user": {
    "_id": "USER_ID",
    "email": "hr@skillsight.com",
    "role": "hr",
    "employeeId": null
  }
}
```

## 4. Employee and Catalog APIs

### E1 — List Employees

GET /employees

Access: HR only

Optional filters:
- search
- department

Example:

GET /employees?search=EMP001&department=Engineering

Response data:

```json
[
  {
    "_id": "EMPLOYEE_ID",
    "code": "EMP001",
    "name": "Synthetic Employee",
    "department": "Engineering",
    "role": {
      "_id": "ROLE_ID",
      "title": "Frontend Developer"
    },
    "skillCount": 5
  }
]
```

### E2 — Employee Profile

GET /employees/:id

Access: HR or the employee themselves

Response data:

```json
{
  "_id": "EMPLOYEE_ID",
  "code": "EMP001",
  "name": "Synthetic Employee",
  "department": "Engineering",
  "role": {
    "_id": "ROLE_ID",
    "title": "Frontend Developer",
    "level": 1
  },
  "skills": [
    {
      "skillId": "SKILL_ID",
      "name": "React",
      "category": "frontend",
      "level": 3
    }
  ],
  "interests": [],
  "learning": {
    "completed": 1,
    "enrolled": 1,
    "dropped": 0
  }
}
```

### E3 — Update Employee Skills

PUT /employees/:id/skills

Access: HR or self

This replaces the entire employee skill list.

Request:

```json
{
  "skills": [
    {
      "skillId": "VALID_SKILL_ID",
      "level": 4
    }
  ]
}
```

Response: Updated Profile (same format as E2).

Valid levels: integers 1–5.

Invalid skill IDs, nonexistent skills and duplicate
skill IDs return 400 BAD_REQUEST.

### E4 — List Skills

GET /skills

Access: Authenticated

Response data:

```json
[
  {
    "_id": "SKILL_ID",
    "code": "react",
    "name": "React",
    "category": "frontend",
    "related": [
      {
        "skillId": "OTHER_SKILL_ID",
        "name": "JavaScript",
        "score": 0.85
      }
    ]
  }
]
```

Related skills may be empty before AI embedding build.

### E5 — List Roles

GET /roles

Access: Authenticated

Response data:

```json
[
  {
    "_id": "ROLE_ID",
    "code": "frontend-dev",
    "title": "Frontend Developer",
    "department": "Engineering",
    "level": 1,
    "requiredSkills": [
      {
        "skillId": "SKILL_ID",
        "name": "React",
        "level": 3,
        "weight": 3
      }
    ],
    "futureSkills": [],
    "nextRoles": [
      {
        "_id": "NEXT_ROLE_ID",
        "title": "Full Stack Developer"
      }
    ]
  }
]
```

### E6 — List Courses

GET /courses

Access: Authenticated

Optional query: skillId

Example:
GET /courses?skillId=VALID_SKILL_ID

Response data:

```json
[
  {
    "_id": "COURSE_ID",
    "code": "CRS001",
    "title": "React Fundamentals",
    "type": "course",
    "provider": "SkillSight Academy",
    "level": 1,
    "hours": 12,
    "skills": [
      {
        "skillId": "SKILL_ID",
        "name": "React",
        "targetLevel": 3
      }
    ]
  }
]
```

## 5. AI Recommendation APIs

Owner: P4

All endpoints require authentication.

AI1 — POST /ai/skills/match

Input:
{"text":"React Node.js MongoDB"}

Maximum input length: 2000 characters.

Returns an array of extracted skill matches with
phrase, skillId, skillName, score and method.

AI2 — GET /ai/gaps/:employeeId

Access: Self/HR

Queries:
- roleId (optional)
- horizon=6 or 12

Returns GapResult, including readiness,
currentGaps, futureGaps and explanation.

AI3 — GET /ai/learning/:employeeId

Access: Self/HR

Optional query: roleId

Returns LearningResult with course recommendations,
learning path, totalHours and uncoveredSkills.

AI4 — GET /ai/mobility/:employeeId

Access: Self/HR

Returns MobilityResult with ranked alternative roles.

AI5 — GET /ai/career/:employeeId

Access: Self/HR

Optional query: targetRoleId

Returns CareerResult with ranked career paths.

AI suggestions are advisory.
HR makes the final decision.

## 6. Market and Forecast APIs

Owner: P4

M1 — GET /market/trends

Access: Authenticated

Optional query: category

Returns TrendItem[].

M2 — GET /market/forecasts

Access: Authenticated

Returns forecast summaries ordered by growthPct.

M3 — GET /market/forecasts/:skillId

Access: Authenticated

Returns ForecastResult with history, predictions,
metrics, trend and explanation.

M4 — POST /market/forecasts/run

Access: HR only

Returns:
- count
- avgMape
- avgNaiveMape
- pctBeatNaive

M5 — GET /market/evaluation

Access: Authenticated

Returns:
- forecast
- skillMatch
- recommendations

Evaluation fields may be null until npm run eval.

Forecasts require npm run ai:build.

## 7. Skill Shortage Risk

### R1 — Workforce Risk

GET /risk?horizon=12

Access: HR only

Allowed horizons: 6 and 12.

Response data:

```json
[
  {
    "skillId": "SKILL_ID",
    "skillName": "Kubernetes",
    "category": "cloud_devops",
    "demandNow": 100,
    "projectedDemand": 120,
    "supply": 40,
    "riskScore": 0.6667,
    "band": "high",
    "keyPersonRisk": false,
    "experts": 5,
    "growthPct": 20,
    "explanation": {
      "summary": "Demand exceeds qualified supply.",
      "factors": [
        {
          "name": "Projected shortage fraction",
          "value": 0.6667,
          "weight": 1,
          "contribution": 0.6667
        }
      ]
    }
  }
]
```

Values are illustrative, not actual dataset results.

Risk thresholds:
- high: score >= 0.5
- medium: score >= 0.2
- low: score < 0.2

If forecasts are unavailable, returns:

HTTP 503

```json
{
  "success": false,
  "code": "AI_NOT_READY",
  "message": "Skill forecasts are missing. Run npm run ai:build."
}
```

## 8. Human Review Workflow

### V1 — Create Review

POST /reviews

Access: Authenticated

Employees can create learning, mobility or career
reviews for their own employee profile.

HR can also create risk reviews.

Learning request:

```json
{
  "type": "learning",
  "employeeId": "EMPLOYEE_ID",
  "roleId": "ROLE_ID"
}
```

Mobility request:

```json
{
  "type": "mobility",
  "employeeId": "EMPLOYEE_ID"
}
```

Career request:

```json
{
  "type": "career",
  "employeeId": "EMPLOYEE_ID",
  "roleId": "ROLE_ID"
}
```

Risk request (HR only):

```json
{
  "type": "risk",
  "skillId": "SKILL_ID"
}
```

The backend generates aiOutput using the appropriate
AI or risk analytics function.

The browser cannot supply aiOutput.

Response data contains a Review with:

- _id
- type
- employee
- skill
- roleId
- aiOutput
- status
- comment
- modifiedOutput
- createdBy
- decidedBy
- decidedAt
- createdAt

New reviews have status "pending".

### V2 — List Reviews

GET /reviews

Access: Authenticated

Optional filters:
- status
- type

HR sees all reviews.

Employees see only their own reviews.

Response data: Review[].

### V3 — Decide Review

PATCH /reviews/:id

Access: HR only

Approve:

```json
{
  "status": "approved"
}
```

Reject:

```json
{
  "status": "rejected",
  "comment": "Further training is required."
}
```

Modify:

```json
{
  "status": "modified",
  "comment": "Learning plan adjusted by HR.",
  "modifiedOutput": {
    "note": "Complete prerequisite training first."
  }
}
```

Rejection and modification require comments.

modifiedOutput must be a nonempty object.

The backend uses an atomic update that only changes
reviews with status "pending".

Further decisions return:

HTTP 409

```json
{
  "success": false,
  "code": "CONFLICT",
  "message": "Review has already been decided"
}
```

Approvals do not automatically change employee
skills, roles or course enrollments.

## 9. Knowledge Graph APIs

Access: HR only

### G1 — Employee Graph

GET /graph/employee/:id

Returns GraphData showing:
- employee
- role
- current skills
- required and future skills
- projects
- relevant courses

### G2 — Skill Graph

GET /graph/skill/:id

Returns:
- prerequisites
- similar skills
- roles
- courses
- projects
- up to 15 high-skilled employees

Graph response data:

```json
{
  "nodes": [
    {
      "id": "skill:SKILL_ID",
      "label": "React",
      "type": "skill"
    }
  ],
  "links": [
    {
      "source": "role:ROLE_ID",
      "target": "skill:SKILL_ID",
      "label": "REQUIRES"
    }
  ]
}
```

Graph visualization endpoints are capped at 120 nodes.

### G3 — Graph Statistics

GET /graph/stats

Response data:

```json
{
  "nodes": 452,
  "links": 2621,
  "topSkills": [
    {
      "skillId": "SKILL_ID",
      "name": "JavaScript",
      "connections": 136
    }
  ]
}
```

Counts above are from one verified 300-employee
synthetic dataset run and may change after reseeding
or employee updates.

## 10. Workforce Report

### RP1 — Workforce Analytics Report

GET /reports/workforce

Access: HR only

Response data:

```json
{
  "generatedAt": "2026-10-31T08:00:00.000Z",
  "dataSource": "synthetic",
  "workforce": {
    "employees": 300,
    "departments": 5,
    "avgSkillsPerEmployee": 5.2
  },
  "readiness": {
    "current": 0.75,
    "future": 0.62
  },
  "topGaps": [
    {
      "skillName": "Kubernetes",
      "employees": 40
    }
  ],
  "trends": {
    "emerging": [
      {
        "skillName": "Generative AI",
        "growthPct": 35
      }
    ],
    "declining": []
  },
  "risk": {
    "high": 10,
    "medium": 15,
    "low": 15,
    "top": [
      {
        "skillName": "Kubernetes",
        "riskScore": 0.67
      }
    ]
  },
  "learning": {
    "records": 600,
    "completionRate": 0.5
  },
  "reviews": {
    "pending": 0,
    "approved": 0,
    "rejected": 0,
    "modified": 0
  },
  "forecastQuality": {
    "avgMape": 5.2,
    "avgNaiveMape": 8.4,
    "pctBeatNaive": 85
  },
  "departments": [
    {
      "name": "Engineering",
      "employees": 100,
      "readiness": 0.75
    }
  ]
}
```

Numbers are illustrative except the seeded employee
count. All report metrics are computed from database
records and AI outputs.

Current/future readiness and completionRate use
fractions from 0 to 1.

MAPE, growthPct and pctBeatNaive use percentage units.

Until P4 AI is integrated, this endpoint can return
501 NOT_IMPLEMENTED or 503 AI_NOT_READY.

## 11. Security Rules

- Passwords are hashed using bcryptjs.
- JWTs expire after eight hours.
- Employees cannot view another employee's profile.
- HR-only endpoints enforce authorization on the server.
- The backend calculates aiOutput for review creation.
- Employee demographic and sensitive personal fields
  are excluded from the synthetic dataset.
- MongoDB URI, JWT secrets and real passwords must
  remain in ignored .env files.
- Frontend authorization guards are not a replacement
  for backend authorization.

## 12. Frontend Integration

Shared Axios instance:
client/src/api.js

Base URL:
VITE_API_URL=http://localhost:5000/api

Token storage:
localStorage.token

Protected request header:
Authorization: Bearer TOKEN

Read successful API results using:

res.data.data

React authentication context:
client/src/AuthContext.jsx

Exports:
- AuthProvider
- useAuth

## 13. Implementation Ownership

P3:
- Authentication
- Employee and catalog APIs
- Review workflow
- Skill shortage risk
- Knowledge graph
- Workforce report

P4:
- AI matching
- Skill gaps
- Learning recommendations
- Mobility and career recommendations
- Market trends
- Forecasting
- Evaluation

P1:
- Login, employee profile, directory and review UI

P2:
- Market, risk, career, graph and report UI

## 14. Implementation Status

P3 routes and controllers have been implemented.

P4-dependent AI responses require integration.

Final end-to-end verification must be completed after
merging all four developer branches.
