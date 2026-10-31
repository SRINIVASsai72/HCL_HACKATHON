
import { getSkillRisk } from "../analytics/risk.js";
import { ok, AppError } from "../utils/http.js";

// R1 — GET /api/risk?horizon=6|12
export async function getRisk(req, res) {
  const { horizon = "12" } = req.query;

  // Accept only 6-month or 12-month forecasts
  if (horizon !== "6" && horizon !== "12") {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Horizon must be 6 or 12"
    );
  }

  const results = await getSkillRisk({
    horizon: Number(horizon),
  });

  return ok(res, results);
}
