# SkillSight — Skill Gap and Workforce Evolution Predictor

HCLTech AI Future Ready FullStack Web Engineer hackathon project. GitHub repo: `SRINIVASsai72/HCL_HACKATHON`.

## Stack
React + Vite + Tailwind v4; Node + Express 5; MongoDB Atlas + Mongoose 8;
MiniLM (`@huggingface/transformers`) for semantic skill matching and
linear regression (`simple-statistics`) for future skill demand.

## Start locally
1. Create `server/.env` from `server/.env.example` and put your **own** Atlas URI and JWT secret in it.
2. Create `client/.env` from `client/.env.example` if needed.
3. `cd server && npm install && npm run dev` — API at `http://localhost:5000/api`.
4. In a separate terminal: `cd client && npm install && npm run dev` — UI at `http://localhost:5173`.
5. Verify `GET http://localhost:5000/api/health` returns `{"success":true,"data":{"status":"ok"}}`.

## Important
This initial commit is only the **shared scaffold**. Authentication, dataset, AI, and all feature
pages/routes are deliberately stubs until developers implement their respective branches.
Do not run the seed or AI scripts until they have been implemented and merged.

## Team branches
- P1 frontend: `feature/frontend-1`
- P2 frontend: `feature/frontend-2`
- P3 backend/repo owner: `feature/backend-1`
- P4 AI/ML backend: `feature/backend-2`

See `docs/SHARED_CONTRACT.md` for **canonical** paths, schema fields, APIs,
request/response formats and ownership. After the shared setup is pushed, branch from `main`.
Merge order: P3 → P4 → P1 → P2.

All employee and market records are synthetic demonstration data; AI recommendations do not
automatically approve HR decisions.
