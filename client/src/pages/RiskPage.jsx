import { useEffect, useState } from "react";

import api from "../api";
import { useAuth } from "../AuthContext";

import {
  Loading,
  ErrorBox,
  Badge,
  ScoreBar,
  ExplainBox,
} from "../components/ui";

// -------------------------------------------
// Helpers
// -------------------------------------------

function getErrorMessage(error) {
  const status = error.response?.status;
  const code = error.response?.data?.code;

  if (code === "AI_NOT_READY" || status === 503) {
    return "Forecast data is not ready. The backend team must run npm run ai:build in the server directory.";
  }

  if (status === 501) {
    return "This backend endpoint has not been implemented yet.";
  }

  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "Access denied. This feature is available only to HR.";
  }

  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong."
  );
}

function formatNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

function formatPercent(value) {
  const formatted = formatNumber(value);

  return formatted === "—" ? "—" : `${formatted}%`;
}

function formatScore(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return "—";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
}

// -------------------------------------------
// Risk Band Badge
// -------------------------------------------

function RiskBadge({ band }) {
  const colors = {
    high: "red",
    medium: "yellow",
    low: "green",
  };

  return (
    <Badge
      text={band ? `${band.toUpperCase()} RISK` : "UNKNOWN"}
      color={colors[band] || "gray"}
    />
  );
}

// -------------------------------------------
// Risk Summary Card
// -------------------------------------------

function SummaryCard({ title, count, color }) {
  const styles = {
    red: "border-red-200 bg-red-50 text-red-700",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-700",
    green: "border-green-200 bg-green-50 text-green-700",
  };

  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        styles[color] || ""
      }`}
    >
      <p className="text-sm font-medium">{title}</p>

      <h3 className="mt-3 text-3xl font-bold">{count}</h3>

      <p className="mt-2 text-xs">
        Skills in this risk category
      </p>
    </div>
  );
}

// -------------------------------------------
// Risk Score Component
// -------------------------------------------

function RiskScore({ value }) {
  const valid =
    value !== null &&
    value !== undefined &&
    Number.isFinite(Number(value));

  const score = valid
    ? Math.max(0, Math.min(1, Number(value)))
    : 0;

  return (
    <div className="min-w-[110px]">
      <p className="mb-2 text-sm font-semibold">
        {formatScore(value)}
      </p>

      {valid && <ScoreBar value={score} />}
    </div>
  );
}

// -------------------------------------------
// Selected Skill Detail
// -------------------------------------------

function RiskDetails({
  risk,
  submitting,
  review,
  reviewError,
  onSubmit,
}) {
  if (!risk) return null;

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Skill Risk Analysis
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Detailed risk assessment for the selected skill.
          </p>
        </div>

        <RiskBadge band={risk.band} />
      </div>

      {/* Skill Information */}
      <div className="rounded-lg bg-gray-50 p-5">
        <h3 className="text-2xl font-bold text-blue-700">
          {risk.skillName}
        </h3>

        <p className="mt-2 text-sm text-gray-600">
          Category: {risk.category || "Not available"}
        </p>
      </div>

      {/* Metrics */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">
            Current Demand
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {formatNumber(risk.demandNow)}
          </h3>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">
            Projected Demand
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {formatNumber(risk.projectedDemand)}
          </h3>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">
            Available Supply
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {formatNumber(risk.supply)}
          </h3>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-500">
            Available Experts
          </p>

          <h3 className="mt-2 text-2xl font-bold">
            {formatNumber(risk.experts)}
          </h3>
        </div>
      </div>

      {/* Risk Score */}
      <div className="mt-6 rounded-lg border p-5">
        <h3 className="mb-4 font-semibold">
          Overall Workforce Risk Score
        </h3>

        <RiskScore value={risk.riskScore} />
      </div>

      {/* Key Person Warning */}
      {risk.keyPersonRisk && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5">

          <h3 className="font-semibold text-red-800">
            Key-Person Dependency Warning
          </h3>

          <p className="mt-2 text-sm text-red-700">
            This skill has been flagged for key-person risk.
            The organization may depend on a small number
            of employees with expertise in this skill.
          </p>
        </div>
      )}

      {/* Growth */}
      <div className="mt-6 rounded-lg bg-blue-50 p-5">
        <p className="text-sm text-gray-600">
          Expected Demand Growth
        </p>

        <h3 className="mt-2 text-2xl font-bold text-blue-700">
          {formatPercent(risk.growthPct)}
        </h3>
      </div>

      {/* AI Explanation */}
      <div className="mt-6">
        <h3 className="mb-3 text-lg font-semibold">
          Risk Explanation
        </h3>

        {risk.explanation ? (
          <ExplainBox explanation={risk.explanation} />
        ) : (
          <p className="text-sm text-gray-500">
            No explanation is available for this risk assessment.
          </p>
        )}
      </div>

      {/* HR Review Request */}
      <div className="mt-8 rounded-lg border bg-gray-50 p-5">
        <h3 className="text-lg font-semibold">
          Request Risk Review
        </h3>

        <p className="mt-2 text-sm text-gray-600">
          Submit this skill risk for an HR review.

          The backend will recompute the risk snapshot
          before creating the review request.
        </p>

        {reviewError && (
          <div className="mt-4">
            <ErrorBox message={reviewError} />
          </div>
        )}

        {review ? (
          <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">

            <p className="font-semibold text-green-800">
              Risk review request submitted successfully.
            </p>

            <p className="mt-2 text-sm text-green-700">
              Status: {review.status || "—"}
            </p>

            {review._id && (
              <p className="mt-1 break-all text-xs text-green-700">
                Review ID: {review._id}
              </p>
            )}

          </div>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !risk.skillId}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Submitting Review..."
              : "Request Risk Review"}
          </button>
        )}
      </div>
    </section>
  );
}

// -------------------------------------------
// Main Risk Page
// -------------------------------------------

export default function RiskPage() {
  const { isHR } = useAuth();

  const [horizon, setHorizon] = useState(12);

  const [risks, setRisks] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [selectedSkillId, setSelectedSkillId] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const [review, setReview] = useState(null);

  const [reviewError, setReviewError] = useState("");

  // -------------------------------------------
  // R1: GET /risk?horizon=6|12
  // -------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadRisks() {
      if (!isHR) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      setRisks([]);

      try {
        const response = await api.get("/risk", {
          params: { horizon },
        });

        if (!active) return;

        const data = response.data.data;

        if (!Array.isArray(data)) {
          throw new Error(
            "Unexpected risk response format from the server."
          );
        }

        // Backend already returns risks sorted by score.
        // Sort defensively in descending score order.
        const sorted = [...data].sort(
          (a, b) =>
            (Number(b.riskScore) || 0) -
            (Number(a.riskScore) || 0)
        );

        setRisks(sorted);
      } catch (err) {
        if (active) {
          setRisks([]);
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRisks();

    return () => {
      active = false;
    };
  }, [horizon, isHR]);

  // -------------------------------------------
  // Select a skill
  // -------------------------------------------

  function selectSkill(skillId) {
    if (!skillId || submitting) return;

    setSelectedSkillId(skillId);
    setReview(null);
    setReviewError("");
  }

  // -------------------------------------------
  // Change forecast horizon
  // -------------------------------------------

  function changeHorizon(value) {
    if (value === horizon || submitting) return;

    setHorizon(value);

    setSelectedSkillId(null);
    setReview(null);
    setReviewError("");
  }

  // -------------------------------------------
  // V1: POST /reviews
  // -------------------------------------------

  async function requestRiskReview() {
    if (
      !isHR ||
      !selectedSkillId ||
      submitting ||
      review
    ) {
      return;
    }

    setSubmitting(true);
    setReviewError("");

    try {
      const response = await api.post("/reviews", {
        type: "risk",
        skillId: selectedSkillId,
      });

      setReview(response.data.data);
    } catch (err) {
      setReviewError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------
  // Derived data
  // -------------------------------------------

  const highRisks = risks.filter(
    (item) => item.band === "high"
  ).length;

  const mediumRisks = risks.filter(
    (item) => item.band === "medium"
  ).length;

  const lowRisks = risks.filter(
    (item) => item.band === "low"
  ).length;

  const selectedRisk = risks.find(
    (item) => item.skillId === selectedSkillId
  );

  // -------------------------------------------
  // Access Control
  // -------------------------------------------

  if (!isHR) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <ErrorBox message="Access denied. Workforce risk analytics are available only to HR." />
      </main>
    );
  }

  // -------------------------------------------
  // Render
  // -------------------------------------------

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">

      {/* PAGE HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-4">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Workforce Risk Dashboard
          </h1>

          <p className="mt-2 text-gray-600">
            Identify future skill shortages and workforce
            dependency risks.
          </p>
        </div>

        <Badge text="Synthetic data" color="yellow" />
      </header>

      {/* FORECAST HORIZON */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h2 className="text-lg font-semibold">
              Risk Forecast Horizon
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select how far into the future to evaluate
              workforce shortages.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => changeHorizon(6)}
              disabled={submitting}
              className={`rounded-lg px-5 py-2 font-medium ${
                horizon === 6
                  ? "bg-blue-600 text-white"
                  : "border bg-gray-50 text-gray-700 hover:bg-gray-100"
              } disabled:opacity-50`}
            >
              6 Months
            </button>

            <button
              type="button"
              onClick={() => changeHorizon(12)}
              disabled={submitting}
              className={`rounded-lg px-5 py-2 font-medium ${
                horizon === 12
                  ? "bg-blue-600 text-white"
                  : "border bg-gray-50 text-gray-700 hover:bg-gray-100"
              } disabled:opacity-50`}
            >
              12 Months
            </button>
          </div>
        </div>
      </section>

      {/* LOADING / ERROR */}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : (
        <>
          {/* RISK SUMMARY */}
          <section>
            <h2 className="mb-4 text-xl font-semibold">
              Risk Overview
            </h2>

            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryCard
                title="High Risk Skills"
                count={highRisks}
                color="red"
              />

              <SummaryCard
                title="Medium Risk Skills"
                count={mediumRisks}
                color="yellow"
              />

              <SummaryCard
                title="Low Risk Skills"
                count={lowRisks}
                color="green"
              />
            </div>
          </section>

          {/* RISK TABLE */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">

            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

              <div>
                <h2 className="text-xl font-semibold">
                  Skill Shortage Analysis
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Click any skill row to view its risk explanation
                  and request an HR review.
                </p>
              </div>

              <Badge text="Synthetic data" color="yellow" />
            </div>

            {risks.length === 0 ? (
              <div className="rounded-lg bg-gray-50 p-8 text-center">

                <h3 className="font-semibold">
                  No Workforce Risk Data Available
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  The risk API returned no skills for this horizon.
                  Check whether workforce skills have been seeded.
                </p>

              </div>
            ) : (
              <div className="overflow-x-auto">

                <table className="w-full min-w-[1050px] text-left text-sm">

                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3">Skill</th>
                      <th className="p-3">Current Demand</th>
                      <th className="p-3">Projected Demand</th>
                      <th className="p-3">Supply</th>
                      <th className="p-3">Experts</th>
                      <th className="p-3">Risk Score</th>
                      <th className="p-3">Risk Level</th>
                      <th className="p-3">Key-Person Risk</th>
                      <th className="p-3">Growth</th>
                    </tr>
                  </thead>

                  <tbody>
                    {risks.map((risk) => (
                      <tr
                        key={risk.skillId}
                        onClick={() => selectSkill(risk.skillId)}
                        className={`cursor-pointer border-t transition-colors ${
                          selectedSkillId === risk.skillId
                            ? "bg-blue-50"
                            : "hover:bg-gray-50"
                        }`}
                      >

                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => selectSkill(risk.skillId)}
                            className="text-left font-semibold text-blue-700 hover:underline focus:outline-blue-500"
                          >
                            {risk.skillName}
                          </button>
                        </td>

                        <td className="p-3">
                          {formatNumber(risk.demandNow)}
                        </td>

                        <td className="p-3">
                          {formatNumber(risk.projectedDemand)}
                        </td>

                        <td className="p-3">
                          {formatNumber(risk.supply)}
                        </td>

                        <td className="p-3">
                          {formatNumber(risk.experts)}
                        </td>

                        <td className="p-3">
                          <RiskScore value={risk.riskScore} />
                        </td>

                        <td className="p-3">
                          <RiskBadge band={risk.band} />
                        </td>

                        <td className="p-3">
                          {risk.keyPersonRisk ? (
                            <Badge
                              text="Warning"
                              color="red"
                            />
                          ) : (
                            <Badge
                              text="No"
                              color="green"
                            />
                          )}
                        </td>

                        <td className="p-3">
                          {formatPercent(risk.growthPct)}
                        </td>

                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            )}
          </section>

          {/* SELECTED SKILL DETAILS */}
          {selectedRisk && (
            <RiskDetails
              risk={selectedRisk}
              submitting={submitting}
              review={review}
              reviewError={reviewError}
              onSubmit={requestRiskReview}
            />
          )}
        </>
      )}
    </main>
  );
}