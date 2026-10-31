
import { buildReport } from "../analytics/report.js";
import { ok } from "../utils/http.js";

// RP1 — GET /api/reports/workforce
// Generate a live workforce analytics report
export async function getWorkforceReport(req, res) {
  const report = await buildReport();

  return ok(res, report);
}
