
import {
  employeeGraph,
  skillGraph,
  graphStats,
} from "../analytics/graph.js";

import { ok } from "../utils/http.js";

// G1 — GET /api/graph/employee/:id
// Return an employee's skills, role,
// projects and learning connections.
export async function getEmployeeGraph(req, res) {
  const graph = await employeeGraph(req.params.id);

  return ok(res, graph);
}

// G2 — GET /api/graph/skill/:id
// Return related skills, prerequisites,
// roles, courses, projects and employees.
export async function getSkillGraph(req, res) {
  const graph = await skillGraph(req.params.id);

  return ok(res, graph);
}

// G3 — GET /api/graph/stats
// Return node/link counts and
// the 10 most connected skills.
export async function getGraphStats(req, res) {
  const stats = await graphStats();

  return ok(res, stats);
}
