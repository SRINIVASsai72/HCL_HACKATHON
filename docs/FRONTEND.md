
# SkillSight — Frontend Documentation

## 1. Project Overview

SkillSight is an AI-powered Skill Gap and Workforce Evolution
Predictor developed for the HCLTech Hackathon.

The application helps employees and HR teams:
- Maintain employee skill inventories.
- Identify current and future skill gaps.
- Explore AI-recommended learning paths.
- Submit recommendations for HR review.
- Track approval, rejection, and modification decisions.

The application uses synthetic employee data.

## 2. Technology Stack

- React.js — User interface
- Vite — Frontend development and build tool
- Tailwind CSS v4 — Styling
- React Router — Client-side routing
- Axios — Backend API communication
- React Hooks — State and lifecycle management

Backend:
- Node.js and Express.js
- MongoDB Atlas with Mongoose
- JWT authentication
- JavaScript-based AI models

## 3. Frontend Setup

Prerequisites:
- Node.js
- npm
- Git
- Access to the SkillSight GitHub repository

Clone the repository:

```bash
git clone https://github.com/SRINIVASsai72/HCL_HACKATHON.git
cd HCL_HACKATHON
```

Open the frontend folder:

```bash
cd client
npm install
```

Create the environment file:

Windows CMD:

```cmd
copy .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Verify that `client/.env` contains:

```env
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:

```bash
npm run dev
```

Open the local URL shown by Vite, normally:

http://localhost:5173

## 4. Backend Requirements

The frontend uses backend APIs running locally at:

http://localhost:5000/api

The backend requires:
- A configured MongoDB connection.
- Seeded synthetic employee and demo account data.
- A working authentication API.
- Initialized AI models for skill matching and recommendations.

Backend setup is managed by P3 and P4.

The frontend does not generate fake successful responses
when the backend is unavailable.

## 5. Authentication and Authorization

Authentication uses the shared AuthContext.

Supported roles:

HR:
- Access employee directory.
- View employee profiles.
- Manage employee skills.
- View and decide HR reviews.

Employee:
- Access their own profile.
- Manage their own skills.
- View AI recommendations.
- Submit learning plans for review.
- View their own review records.

Employee accounts cannot access other employee profiles.

Protected routes and backend authorization enforce access rules.

Demo account emails:
- HR: hr@skillsight.com
- Employee: emp001@skillsight.com through emp005@skillsight.com

The password is configured by the backend demo environment.

## 6. Frontend Pages

### F1 — LoginPage.jsx

Route: `/login`

Features:
- Email and password inputs.
- Required field validation.
- Loading and error messages.
- JWT-based login using AuthContext.
- Role-based navigation.

API:
- POST `/auth/login`

After successful authentication:
- HR navigates to `/employees`.
- Employee navigates to `/employees/:id`.

### F2 — EmployeesPage.jsx

Route: `/employees`

Access: HR only.

Features:
- Employee directory.
- Search by name or employee code.
- Department filtering.
- Employee code, name, department, role and skill count.
- Navigation to individual employee profiles.
- Loading, empty and error states.

API:
- GET `/employees?search=&department=`

### F3 — ProfilePage.jsx

Route: `/employees/:id`

Access: Employee owner or HR.

F3a — Profile and Skill Inventory

Features:
- Employee details and learning statistics.
- View existing skills.
- Add or remove skills.
- Modify proficiency levels from 1 to 5.
- Save the complete skill inventory.
- Find skills from text using AI matching.
- Link to Career and Mobility.

APIs:
- GET `/employees/:id`
- PUT `/employees/:id/skills`
- GET `/skills`
- POST `/ai/skills/match`

F3b — AI Skill Gap Analysis

Features:
- Target role selection.
- 6-month or 12-month forecast horizon.
- Current readiness score.
- Future readiness score.
- Current and future skill gap tables.
- Explainable AI output.
- Refresh analysis after skill updates.

APIs:
- GET `/roles`
- GET `/ai/gaps/:employeeId`

F3c — Personalized Learning Plan

Features:
- AI-ranked learning recommendations.
- Course details, duration and skills.
- Explanation for recommendations.
- Ordered learning roadmap.
- Total learning duration.
- Uncovered skills.
- Submit learning plan for HR review.

APIs:
- GET `/ai/learning/:employeeId`
- POST `/reviews`

Learning review submissions are computed by the backend.
Submitting a plan does not automatically enroll employees.

### F4 — ReviewsPage.jsx

Route: `/reviews`

Features:
- Review listing and filtering.
- Status and type filters.
- Original AI recommendation details.
- Review decision history.
- Employee read-only access.
- HR approval and rejection.
- HR modification of learning plans.
- Required comments for rejection and modification.
- Conflict handling for already-decided reviews.

APIs:
- GET `/reviews?status=&type=`
- PATCH `/reviews/:id`

Review types:
- learning
- mobility
- career
- risk

Review statuses:
- pending
- approved
- rejected
- modified

## 7. Shared Frontend Components

Shared components are managed by P3.

- AuthContext.jsx — Authentication state.
- api.js — Axios instance and JWT handling.
- ProtectedRoute.jsx — Route protection.
- Navbar.jsx — Navigation.
- ui.jsx — Loading, ErrorBox, Badge, ScoreBar, ExplainBox.
- App.jsx — Application routes.

P1 imports these components without modifying them.

## 8. Error Handling

Pages display appropriate messages for:
- Network failures.
- Invalid login credentials.
- Unauthorized access.
- Missing employee records.
- AI model unavailable (503).
- Empty skill gaps or recommendations.
- Failed skill updates.
- Failed review submissions.
- Review conflicts (409).

AI-dependent features require successful backend integration.

## 9. Frontend Testing Checklist

Authentication:
- [ ] HR login redirects to the employee directory.
- [ ] Employee login redirects to their profile.
- [ ] Invalid credentials display an error.
- [ ] Refresh preserves valid login state.

Employee Directory:
- [ ] HR can view employees.
- [ ] Search works.
- [ ] Department filtering works.
- [ ] Employee profile navigation works.
- [ ] Employee role cannot access the HR directory.

Skill Inventory:
- [ ] Employee profile loads.
- [ ] Skills can be added and removed.
- [ ] Skill levels can be modified.
- [ ] Saving persists after refresh.
- [ ] AI skill matching returns suggestions.

AI Gap Analysis:
- [ ] Target role selection works.
- [ ] Both forecast horizons work.
- [ ] Current and future readiness display.
- [ ] Gap tables display correctly.
- [ ] AI explanations display.
- [ ] Saving skills refreshes the analysis.

Learning Plan:
- [ ] AI recommendations load.
- [ ] Course explanations display.
- [ ] Learning roadmap displays.
- [ ] Total hours and uncovered skills display.
- [ ] Learning plan submission succeeds.

HR Reviews:
- [ ] Pending reviews appear.
- [ ] Filters work.
- [ ] HR can approve.
- [ ] HR can reject with a comment.
- [ ] HR can modify a learning plan.
- [ ] Employees cannot approve or reject.
- [ ] Already-decided reviews handle 409 conflicts.

Edge Cases:
- [ ] EMP901 — No skills.
- [ ] EMP902 — No gaps.
- [ ] EMP903 — Vue.js/React semantic partial credit.
- [ ] Empty and error states.
- [ ] No browser console errors.

## 10. Screenshot Checklist

Capture screenshots after backend integration:

1. Login page.
2. HR employee directory.
3. Employee profile and skill inventory.
4. AI skill extraction results.
5. Current and future gap analysis.
6. Personalized learning recommendations.
7. Learning roadmap.
8. HR review details and decision controls.

## 11. Production Build

From the client directory:

```bash
npm run build
```

Vite generates production files inside `client/dist`.

The production build should complete without errors.

## 12. Frontend Ownership

P1 owns:
- client/src/pages/LoginPage.jsx
- client/src/pages/EmployeesPage.jsx
- client/src/pages/ProfilePage.jsx
- client/src/pages/ReviewsPage.jsx
- docs/FRONTEND.md

Branch: feature/frontend-1

Other frontend pages belong to P2.

Backend endpoints belong to P3 and P4.

Shared frontend configuration is owned by P3.

## 13. Integration and Handoff

Once backend changes are merged into main:

```bash
git switch feature/frontend-1
git fetch origin
git merge origin/main
```

After resolving any conflicts:
- Run the frontend.
- Start the backend separately.
- Verify real API integration.
- Complete the testing checklist.
- Run the production build.
- Commit and push final P1 changes.
- Open a Pull Request from feature/frontend-1 to main.

All final results must use the real backend.
No temporary mock results should be presented as actual AI output.
