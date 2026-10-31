import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../api";
import { Loading, ErrorBox, ScoreBar, ExplainBox, Badge } from "../components/ui";

function getErrorMessage(error) {
  const status = error.response?.status;
  const code = error.response?.data?.code;

  if (code === "AI_NOT_READY" || status === 503) {
    return "AI recommendations are not ready. The backend team must run npm run ai:build.";
  }

  if (status === 501) {
    return "The mobility recommendation API has not been implemented yet.";
  }

  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "You do not have permission to access this employee's career information.";
  }

  if (status === 404) {
    return "Employee or requested resource not found.";
  }

  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong."
  );
}

function formatScore(value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "—";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
}

function Metric({ label, value }) {
  const valid =
    value !== null &&
    value !== undefined &&
    Number.isFinite(Number(value));

  const score = valid
    ? Math.max(0, Math.min(1, Number(value)))
    : 0;

  return (
    <div>
      <div className="mb-2 flex justify-between gap-2 text-sm">
        <span className="text-gray-600">{label}</span>

        <span className="font-semibold text-gray-900">
          {formatScore(value)}
        </span>
      </div>

      {valid && <ScoreBar value={score} />}
    </div>
  );
}

function GapList({ gaps }) {
  const topGaps = Array.isArray(gaps) ? gaps.slice(0, 3) : [];

  if (topGaps.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No major skill gaps identified.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {topGaps.map((gap, index) => (
        <div
          key={gap.skillId || index}
          className="rounded-lg border border-orange-100 bg-orange-50 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-gray-800">
              {gap.skillName}
            </span>

            <Badge text="Skill Gap" color="yellow" />
          </div>

          <p className="mt-1 text-sm text-gray-600">
            Current Level: {gap.current ?? "—"} | Required Level:{" "}
            {gap.required ?? "—"}
          </p>

          {gap.reason && (
            <p className="mt-2 text-xs text-gray-500">
              {gap.reason}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function CourseList({ courses }) {
  const recommendedCourses = Array.isArray(courses)
    ? courses.slice(0, 2)
    : [];

  if (recommendedCourses.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No courses recommended.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {recommendedCourses.map((course, index) => (
        <div
          key={course._id || index}
          className="flex items-start gap-3 rounded-lg border bg-gray-50 p-3"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {index + 1}
          </span>

          <p className="text-sm font-medium text-gray-700">
            {course.title}
          </p>
        </div>
      ))}
    </div>
  );
}

function RoleCard({ recommendation }) {
  const role = recommendation.role || {};

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Recommendation #{recommendation.rank ?? "—"}
          </p>

          <h3 className="mt-1 text-xl font-bold text-gray-900">
            {role.title || "Unknown Role"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Role Level: {role.level ?? "—"}
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 px-4 py-3 text-center">
          <p className="text-xs text-gray-600">Match Score</p>

          <p className="text-2xl font-bold text-blue-700">
            {formatScore(recommendation.score)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Metric label="Overall Match" value={recommendation.score} />

        <Metric label="Job Readiness" value={recommendation.readiness} />

        <Metric label="Skill Similarity" value={recommendation.similarity} />

        <Metric label="Market Demand" value={recommendation.demandScore} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h4 className="mb-3 font-semibold text-gray-800">
            Top Skill Gaps
          </h4>

          <GapList gaps={recommendation.topGaps} />
        </section>

        <section>
          <h4 className="mb-3 font-semibold text-gray-800">
            Recommended Courses
          </h4>

          <CourseList courses={recommendation.courses} />
        </section>
      </div>

      {recommendation.explanation && (
        <div className="mt-6">
          <h4 className="mb-3 font-semibold text-gray-800">
            AI Explanation
          </h4>

          <ExplainBox explanation={recommendation.explanation} />
        </div>
      )}
    </article>
  );
}

export default function CareerPage() {
  const { id: employeeId } = useParams();

  const [mobility, setMobility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [submittedReview, setSubmittedReview] = useState(null);

  // AI4: GET /ai/mobility/:employeeId
  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      setError("Employee ID is missing.");
      setMobility(null);
      return;
    }

    let active = true;

    async function loadMobility() {
      setLoading(true);
      setError("");
      setMobility(null);
      setSubmittedReview(null);
      setReviewError("");

      try {
        const response = await api.get(
          `/ai/mobility/${employeeId}`
        );

        if (active) {
          setMobility(response.data.data);
        }
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadMobility();

    return () => {
      active = false;
    };
  }, [employeeId]);

  // V1: POST /reviews
  async function requestMobilityReview() {
    if (!employeeId || submitting || submittedReview) return;

    setSubmitting(true);
    setReviewError("");

    try {
      const response = await api.post("/reviews", {
        type: "mobility",
        employeeId,
      });

      setSubmittedReview(response.data.data);
    } catch (err) {
      setReviewError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const recommendations = Array.isArray(mobility?.recommendations)
    ? [...mobility.recommendations]
        .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
        .slice(0, 5)
    : [];

  return (
    <main className="mx-auto max-w-6xl space-y-7 p-6">
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Internal Mobility
          </h1>

          <p className="mt-2 text-gray-600">
            Explore career opportunities based on existing skills,
            readiness, and workforce demand.
          </p>
        </div>

        {employeeId && (
          <Link
            to={`/employees/${employeeId}`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Back to Profile
          </Link>
        )}
      </header>

      {/* AI DISCLAIMER */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h2 className="font-semibold text-blue-900">
          AI-Assisted Career Recommendations
        </h2>

        <p className="mt-1 text-sm text-blue-800">
          {mobility?.note ||
            "AI suggestion only. HR makes the final decision."}
        </p>
      </div>

      {/* LOADING / ERROR / RESULTS */}
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : !mobility ? (
        <p className="text-gray-500">
          No mobility information available.
        </p>
      ) : (
        <>
          {/* CURRENT ROLE */}
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Current Position
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xl font-bold text-blue-700">
                {mobility.currentRole?.title || "Not Available"}
              </span>

              <Badge text="Current Role" color="blue" />
            </div>
          </section>

          {/* RECOMMENDATIONS */}
          <section>
            <div className="mb-5">
              <h2 className="text-2xl font-bold text-gray-900">
                Recommended Career Opportunities
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Up to five AI-generated role recommendations.
              </p>
            </div>

            {recommendations.length === 0 ? (
              <div className="rounded-xl border bg-white p-6">
                <p className="text-gray-500">
                  No suitable alternative roles were identified.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {recommendations.map((recommendation, index) => (
                  <RoleCard
                    key={recommendation.role?._id || index}
                    recommendation={recommendation}
                  />
                ))}
              </div>
            )}
          </section>

          {/* REVIEW REQUEST */}
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900">
              Request HR Review
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Submit these mobility recommendations for review by HR.
              Submitting a request does not automatically change your role.
            </p>

            {reviewError && (
              <div className="mt-4">
                <ErrorBox message={reviewError} />
              </div>
            )}

            {submittedReview ? (
              <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
                <p className="font-semibold text-green-800">
                  Mobility review request submitted successfully.
                </p>

                <p className="mt-2 text-sm text-green-700">
                  Status: {submittedReview.status || "Pending"}
                </p>

                {submittedReview._id && (
                  <p className="mt-1 break-all text-xs text-green-700">
                    Review ID: {submittedReview._id}
                  </p>
                )}

                <Link
                  to="/reviews"
                  className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
                >
                  View Reviews →
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={requestMobilityReview}
                disabled={submitting || recommendations.length === 0}
                className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Submitting Request..."
                  : "Request Mobility Review"}
              </button>
            )}
          </section>
        </>
      )}
    </main>
  );
}