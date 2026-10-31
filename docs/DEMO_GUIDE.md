# SkillSight — Hackathon Demo Guide

**Project:** SkillSight — Skill Gap and Workforce Evolution Predictor
**Technology:** React, Vite, Tailwind CSS, Node.js, Express, MongoDB, Mongoose
**AI:** Sentence embeddings, semantic similarity, recommendation scoring, and statistical forecasting
**Demo duration:** 8 minutes
**Data source:** Synthetic workforce and market-demand data

---

## 1. Project Overview

SkillSight is an AI-powered workforce intelligence platform designed to help organizations understand employee skills, identify skill gaps, predict future workforce requirements, and recommend career development opportunities.

The application supports two roles:

**HR:** Can access organization-wide employee profiles, workforce risks, market forecasts, knowledge graphs, analytics reports, and review requests.

**Employee:** Can manage their own skills, view skill gaps, receive learning recommendations, explore internal mobility opportunities, and request HR reviews.

AI recommendations support decisions but do not automatically approve learning plans or assign employees to new roles.

All workforce and market data used in the demonstration is synthetic.

---

## 2. Application Startup

### Backend Setup

Open a terminal in the project root.

```powershell
cd server
npm install
```

Ensure `server/.env` contains valid configuration for MongoDB Atlas, JWT authentication, the frontend URL, and the demo password.

Example environment variable names:

```env
PORT=5000
MONGODB_URI=<your_mongodb_connection_string>
JWT_SECRET=<your_private_secret>
CLIENT_URL=http://localhost:5173
DEMO_PASSWORD=<your_demo_password>
```

Use real local configuration values. Never commit `.env` or expose credentials during the presentation.

### Prepare Demonstration Data

Run this only when the team is ready to initialize or reset the demonstration database:

```powershell
npm run setup:data
```

This runs the database seed process and AI preparation.

For a smaller demonstration dataset, use:

```powershell
npm run seed:small
npm run ai:build
```

**Important:** Seeding may replace existing demonstration records. Coordinate with P3 before executing it.

### Model Evaluation

To generate evaluation results:

```powershell
npm run eval
```

Only present evaluation measurements after this command has completed successfully.

### Start Backend

```powershell
npm run dev
```

Expected backend address:

```text
http://localhost:5000
```

### Start Frontend

Open another terminal in the project root.

```powershell
cd client
npm install
```

Create the local environment file if needed:

```powershell
Copy-Item .env.example .env
```

Confirm it contains:

```env
VITE_API_URL=http://localhost:5000/api
```

Start React:

```powershell
npm run dev
```

The frontend usually runs at:

```text
http://localhost:5173
```

If port 5173 is occupied, Vite may use 5174 or another available port.

Use the actual displayed URL. P3 must ensure `CLIENT_URL` matches the frontend origin where required by the backend configuration.

---

## 3. Demo Accounts

| Role     | Email                                                 | Password                 |
| -------- | ----------------------------------------------------- | ------------------------ |
| HR       | [hr@skillsight.com](mailto:hr@skillsight.com)         | Value of `DEMO_PASSWORD` |
| Employee | [emp001@skillsight.com](mailto:emp001@skillsight.com) | Value of `DEMO_PASSWORD` |

The example password in the shared development contract is `Demo@123`, but the actual password is determined by the backend's environment configuration when accounts are seeded.

Additional employee accounts may include `emp002@skillsight.com` through `emp005@skillsight.com`.

### Demonstration Employee

Use synthetic employee `EMP001`.

Find the corresponding employee in the HR directory.

The application's URLs require the employee's MongoDB `_id`, not the employee code `EMP001`.

Record the correct employee profile URL during rehearsal.

---

# 4. Eight-Minute Demonstration Script

## 0:00–0:45 — Introduction and HR Login

**URL:** `/login`

### Actions

1. Open SkillSight.
2. Enter the HR demo account.
3. Click **Sign In**.
4. Navigate to the Employee Directory.

### Presentation

"SkillSight is an AI-powered workforce intelligence platform that helps organizations understand their employees' current skills and prepare for future technology requirements.

It combines skill-gap analysis, personalized learning recommendations, workforce forecasting, and explainable AI.

The application provides separate HR and employee experiences."

### Expected Result

HR successfully logs in and reaches the employee directory.

---

## 0:45–1:40 — Employee Profile and Skill Gap Analysis

**URL:** `/employees`

### Actions

1. Search for `EMP001`.
2. Click **View Profile**.
3. Display the employee's skills and current role.
4. Under **Find Skills from Text**, enter:

```text
I built a React and Node.js application using MongoDB and REST APIs.
```

5. Click **Find Skills**.
6. Show matching catalog skills and similarity scores.
7. Demonstrate the **Skill Gap Analysis** section.
8. Briefly compare current and future readiness.

If demonstrating a skill update, use **Add Skill** and **Save Skills**. Only do this if the change has been rehearsed.

### Presentation

"SkillSight maintains employee skill profiles with proficiency levels from one to five.

Our AI can identify technical skills from text using aliases and semantic similarity.

The application compares saved employee skills with role requirements to calculate current and future skill gaps."

### Expected Result

The profile displays saved skills, AI-matched skills when identified, readiness scores, and gap explanations.

Results depend on the actual seeded data.

---

## 1:40–2:30 — Market Trends and Forecasting

**URL:** `/market`

### Actions

1. Click **Market** in the navigation bar.
2. Show the Market Skill Trends table.
3. Filter by a skill category.
4. Select an available skill in the forecasts table.
5. Display the historical and predicted demand chart.
6. Explain the shaded forecast range.
7. Show model MAPE versus the naive baseline.

### Presentation

"SkillSight analyzes synthetic market-demand time series to identify emerging, growing, stable, and declining skill trends.

We use linear regression to forecast future demand.

The blue line represents historical demand, the dashed line represents predictions, and the shaded area represents the approximate forecast range.

We compare forecasting error against a naive baseline to evaluate whether our predictions provide an improvement."

### Expected Result

Market trends and forecast results appear using values returned by backend APIs.

**Important:** Forecasts are based on synthetic data. They must not be presented as verified real-world industry predictions.

Use **Run Forecasts** only if the demonstration requires recomputation and the operation has been tested beforehand.

---

## 2:30–3:20 — Internal Mobility and Career Planning

**URL:** `/employees/<employeeId>/career`

### Actions

1. Return to the selected employee's profile.
2. Click **Career & Mobility**.
3. Show the top available internal mobility recommendations.
4. Explain match score, readiness, similarity, and demand.
5. Highlight missing skills and suggested courses.
6. Scroll to Career Path Planning.
7. Select a target role.
8. Show the recommended career progression and estimated duration.
9. Optionally click **Request Career Review** if creating a review has been rehearsed.

### Presentation

"SkillSight also helps employees explore opportunities within their organization.

Our AI ranks alternative roles using skill readiness, semantic similarity, and demand information.

Career planning then recommends possible progression paths, required skills, and learning courses.

These are suggestions only. HR makes the final decision."

### Expected Result

Available mobility recommendations and career paths appear with scores, explanations, and learning requirements.

Selecting a target role updates the career recommendations.

---

## 3:20–4:10 — Workforce Shortage Risk

**URL:** `/risk`

### Actions

1. Click **Risk** in the HR navigation bar.
2. Display high-, medium-, and low-risk counts.
3. Switch between **6 Months** and **12 Months**.
4. Select a skill from the shortage table.
5. Highlight projected demand, available supply, and experts.
6. Explain any key-person dependency warning.

### Presentation

"SkillSight helps HR detect future workforce shortages.

It compares projected skill demand with the organization's available workforce supply.

The dashboard ranks skill risks and identifies cases where a small number of experts may create operational dependency.

HR can request a review of a specific risk."

### Expected Result

Risk scores, risk levels, demand projections, and available explanations appear from backend data.

Risk results must not be hardcoded or fabricated.

---

## 4:10–5:00 — Skills Knowledge Graph

**URL:** `/graph`

### Actions

1. Click **Graph**.
2. Select an employee from the dropdown.
3. Display their knowledge graph.
4. Explain the different node colors.
5. Select a skill or click an existing skill node.
6. Show skill relationships.
7. Display graph statistics and top connected skills.

### Presentation

"The knowledge graph helps HR understand relationships between employees, skills, roles, projects, and learning resources.

We visualize these relationships using an interactive two-dimensional graph.

The underlying connections are derived from MongoDB records, and the frontend renders them using react-force-graph-2d."

### Expected Result

The graph displays connected nodes and relationships returned by the backend.

Node and link labels must reflect actual stored relationships.

No separate graph database or graph server is used.

---

## 5:00–5:50 — Workforce Analytics Report

**URL:** `/report`

### Actions

1. Click **Report**.
2. Display employee and department statistics.
3. Show current and future workforce readiness.
4. Highlight organization-wide skill gaps.
5. Display the department readiness chart.
6. Briefly show workforce risks and forecast quality.
7. Click **Print / Save PDF** to demonstrate the reporting option.
8. Close the print dialog.

### Presentation

"SkillSight provides organization-wide workforce analytics in one report.

HR can monitor workforce readiness, skill shortages, learning activity, and the status of review requests.

The report retrieves values directly from the backend. It can be refreshed and exported through the browser's print-to-PDF functionality."

### Expected Result

The report displays current backend results and the print dialog opens.

The printed report should hide navigation controls.

---

## 5:50–6:50 — Employee Experience and Learning Plan

**URLs:** `/login`, then `/employees/<ownEmployeeId>`

### Actions

1. Click **Logout**.
2. Log in as `emp001@skillsight.com`.
3. Open **My Profile**.
4. Display the employee's skill-gap analysis.
5. Scroll to **Personalized Learning Plan**.
6. Show ranked courses and learning roadmap.
7. Click **Why this course?** on an available recommendation.
8. Click **Submit Plan for HR Review**.

### Presentation

"Employees have access to their own profiles and career-development recommendations.

SkillSight recommends courses based on identified skill gaps and the selected target role.

Each recommendation includes an explanation to help employees understand its relevance.

Employees can submit learning plans for HR review, but submission does not automatically enroll them in courses."

### Expected Result

A real review record is created with a pending status.

If no learning plan or courses are available for the selected employee, use another rehearsed demo employee rather than inventing recommendations.

---

## 6:50–7:40 — HR Review and Decision

**URLs:** `/login`, then `/reviews`

### Actions

1. Log out of the employee account.
2. Log back in using the HR account.
3. Open **Reviews**.
4. Filter for pending learning reviews.
5. Select the review created during the employee demonstration.
6. Show the original AI recommendation.
7. Choose **Approve**.
8. Click **Submit Decision**.
9. Confirm that the review status updates.

### Presentation

"SkillSight includes a human-in-the-loop review workflow.

AI produces recommendations, but HR retains decision-making authority.

HR can approve, reject, or, for supported learning plans, modify recommendations.

Review decisions are stored in the database, providing a traceable workflow."

### Expected Result

The review status changes from pending to approved.

Do not claim that approval automatically changes an employee's job role or enrolls them in a course.

---

## 7:40–8:00 — Conclusion

### Presentation

"SkillSight combines workforce analytics, semantic skill matching, career recommendations, and demand forecasting in a single application.

Our main focus is helping organizations identify skill gaps early and support better workforce-development decisions.

The platform uses explainable recommendations and HR review workflows rather than automated employee decisions.

All data used in this demonstration is synthetic."

### End of Demonstration

**Total duration: 8 minutes.**

---

# 5. Application Routes

| Route                   | Page                | Access        |
| ----------------------- | ------------------- | ------------- |
| `/login`                | Login               | Public        |
| `/employees`            | Employee Directory  | HR            |
| `/employees/:id`        | Employee Profile    | Self / HR     |
| `/employees/:id/career` | Mobility and Career | Self / HR     |
| `/market`               | Market Trends       | Authenticated |
| `/risk`                 | Workforce Risk      | HR            |
| `/graph`                | Knowledge Graph     | HR            |
| `/reviews`              | Review Management   | Authenticated |
| `/report`               | Workforce Report    | HR            |

The `:id` parameter is the actual employee MongoDB `_id`.

HR can access organization-wide analytics. Employees must not be able to access other employees' protected profiles or HR-only endpoints.

---

# 6. API Endpoints Used During the Demo

| API                            | Purpose                    |
| ------------------------------ | -------------------------- |
| `POST /auth/login`             | Authentication             |
| `GET /employees`               | Employee directory         |
| `GET /employees/:id`           | Employee profile           |
| `PUT /employees/:id/skills`    | Update saved skills        |
| `POST /ai/skills/match`        | Semantic skill matching    |
| `GET /ai/gaps/:employeeId`     | Skill-gap analysis         |
| `GET /ai/learning/:employeeId` | Learning recommendations   |
| `GET /ai/mobility/:employeeId` | Internal mobility          |
| `GET /ai/career/:employeeId`   | Career planning            |
| `GET /market/trends`           | Market trends              |
| `GET /market/forecasts`        | Skill forecasts            |
| `GET /risk`                    | Workforce shortage risks   |
| `GET /graph/employee/:id`      | Employee relationships     |
| `GET /graph/skill/:id`         | Skill relationships        |
| `GET /graph/stats`             | Knowledge graph statistics |
| `POST /reviews`                | Submit review              |
| `PATCH /reviews/:id`           | HR decision                |
| `GET /reports/workforce`       | Workforce report           |

All API routes use the `/api` prefix on the backend.

---

# 7. Model Explanation for Evaluators

## Semantic Skill Matching

SkillSight uses a pretrained text-embedding model to represent technical skills as numerical vectors.

Cosine similarity helps estimate how closely skills or descriptions are related.

The matching system can also use known aliases for exact catalog matching.

## Skill Gap Analysis

Employee proficiency levels are compared with job-role requirements.

The AI-assisted system can consider related skills when calculating effective readiness.

## Internal Mobility

Mobility recommendations use factors such as role readiness, semantic similarity, and demand information.

## Career Path Planning

Career paths are generated from role progression relationships, skill requirements, and learning resources.

## Market Forecasting

Synthetic historical demand values are analyzed using linear regression to estimate future demand.

Forecasts are evaluated using error metrics such as MAPE and compared with a naive baseline.

## Explainability

The platform provides explanation summaries and contributing factors for supported AI-generated scores.

## Human Review

AI recommendations do not automatically become HR decisions.

Employees request reviews, and HR approves, rejects, or modifies supported recommendations.

---

# 8. Troubleshooting and Demo Fallbacks

## Backend Not Responding

Check that the Express server is running on port 5000.

Verify MongoDB connectivity and backend environment configuration.

Do not present a frontend error message as a successful API response.

## Frontend Running on Another Port

If port 5173 is occupied, Vite may select 5174 or another port.

Use the actual URL printed in the terminal.

Verify that the backend CORS configuration permits that frontend origin.

## AI_NOT_READY (503)

The backend requires AI preparation.

Coordinate with P4 to execute:

```powershell
cd server
npm run ai:build
```

If the model cannot be downloaded or initialized, show the actual error and explain the unavailable dependency.

Do not generate fake recommendations to hide the problem.

## Model Download or Network Failure

The embedding model may require downloading files during initial setup.

Prepare the environment before the presentation.

If the network becomes unavailable, use previously captured screenshots from a successfully completed run as clearly labeled backup evidence.

Do not describe screenshots as live output.

## Evaluation Metrics Missing

If model evaluation has not been run:

```powershell
cd server
npm run eval
```

Do not claim benchmark accuracy or model superiority without generated evaluation results.

## Empty Graph or Forecasts

Verify database seeding and AI preparation.

An empty graph or forecast must be displayed as unavailable or empty, not replaced with fabricated data.

## Employee Login Cannot Open HR Pages

This is expected behavior.

The backend and frontend must both enforce the appropriate access restrictions.

## Browser Print Issues

Use the report's **Print / Save PDF** button.

Choose **Save as PDF** from the browser print dialog.

Check that the shared navbar and action buttons are hidden in print output.

---

# 9. Pre-Demo Verification Checklist

* [ ] Backend starts successfully.
* [ ] MongoDB connection works.
* [ ] Frontend starts successfully.
* [ ] HR login works.
* [ ] Employee login works.
* [ ] Employee directory contains seeded employees.
* [ ] Selected employee's MongoDB `_id` is available.
* [ ] Skill matching API works.
* [ ] Skill-gap and learning recommendations load.
* [ ] Market trends and forecasts load.
* [ ] Career recommendations load.
* [ ] Workforce risk dashboard loads.
* [ ] Knowledge graph renders.
* [ ] Workforce report loads.
* [ ] Employee can submit a review.
* [ ] HR can approve a pending review.
* [ ] Report printing works.
* [ ] HR-only access restrictions are verified.
* [ ] Evaluation results are presented only if generated.
* [ ] Screenshots are available as clearly labeled fallback material.
* [ ] The team has rehearsed the 8-minute presentation.

---

# 10. Team Responsibilities

| Developer | Responsibility                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------- |
| P1        | Authentication, employee directory, profiles, skill editing, learning UI, review management                     |
| P2        | Market dashboard, workforce risk, mobility, career planning, knowledge graph, workforce report, demo guide      |
| P3        | Shared platform, authentication backend, database, employee APIs, review APIs, risk, graph, and report services |
| P4        | AI embeddings, skill matching, gap analysis, recommendations, forecasting, and evaluation                       |

All team members work in separate feature branches and follow the shared integration contract.

---

# 11. Final Notes

SkillSight is a demonstration application developed for the HCLTech hackathon.

Its workforce records and market-demand values are synthetic.

The objective is to demonstrate a functional, AI-assisted workforce intelligence workflow with transparent explanations, predictive analytics, and HR-controlled decision-making.

**End of Demo Guide.**
