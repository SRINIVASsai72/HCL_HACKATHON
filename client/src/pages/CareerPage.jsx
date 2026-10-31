import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import api from "../api";
import {
  Loading,
  ErrorBox,
  ScoreBar,
  ExplainBox,
  Badge,
} from "../components/ui";

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function getErrorMessage(error) {
  const status = error.response?.status;
  const code = error.response?.data?.code;

  if (code === "AI_NOT_READY" || status === 503) {
    return "AI recommendations are not ready. Run npm run ai:build in the server directory.";
  }

  if (status === 501) {
    return "This API has not been implemented yet.";
  }

  if (status === 401) {
    return "Session expired. Please log in again.";
  }

  if (status === 403) {
    return "You do not have permission to access this information.";
  }

  if (status === 404) {
    return "Requested employee or resource not found.";
  }

  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong."
  );
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

        <span className="font-semibold">
          {formatScore(value)}
        </span>
      </div>

      {valid && <ScoreBar value={score} />}
    </div>
  );
}

function AIExplanation({ explanation }) {
  if (!explanation) return null;

  if (typeof explanation === "string") {
    return (
      <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
        {explanation}
      </p>
    );
  }

  return <ExplainBox explanation={explanation} />;
}

// --------------------------------------------------
// Skill gaps
// --------------------------------------------------

function GapList({ gaps }) {
  const topGaps = Array.isArray(gaps)
    ? gaps.slice(0, 3)
    : [];

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
            <span className="font-medium">
              {gap.skillName}
            </span>

            <Badge text="Skill Gap" color="yellow" />
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Current Level: {gap.current ?? "—"}
            {" | "}
            Required Level: {gap.required ?? "—"}
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

// --------------------------------------------------
// Recommended courses for mobility
// --------------------------------------------------

function CourseList({ courses }) {
  const items = Array.isArray(courses)
    ? courses.slice(0, 2)
    : [];

  if (items.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No courses recommended.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((course, index) => (
        <div
          key={course._id || index}
          className="flex items-center gap-3 rounded-lg border bg-gray-50 p-3"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
            {index + 1}
          </span>

          <p className="text-sm font-medium">
            {course.title}
          </p>
        </div>
      ))}
    </div>
  );
}

// --------------------------------------------------
// F2a: Internal Mobility Recommendation Card
// --------------------------------------------------

function MobilityRoleCard({ recommendation }) {
  const role = recommendation.role || {};

  return (
    <article className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-blue-600">
            Recommendation #{recommendation.rank ?? "—"}
          </p>

          <h3 className="mt-1 text-xl font-bold">
            {role.title || "Unknown Role"}
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Role Level: {role.level ?? "—"}
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 px-4 py-3 text-center">
          <p className="text-xs text-gray-600">
            Match Score
          </p>

          <p className="text-2xl font-bold text-blue-700">
            {formatScore(recommendation.score)}
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Metric
          label="Overall Match"
          value={recommendation.score}
        />

        <Metric
          label="Job Readiness"
          value={recommendation.readiness}
        />

        <Metric
          label="Skill Similarity"
          value={recommendation.similarity}
        />

        <Metric
          label="Market Demand"
          value={recommendation.demandScore}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h4 className="mb-3 font-semibold">
            Top Skill Gaps
          </h4>

          <GapList gaps={recommendation.topGaps} />
        </section>

        <section>
          <h4 className="mb-3 font-semibold">
            Recommended Courses
          </h4>

          <CourseList courses={recommendation.courses} />
        </section>
      </div>

      {recommendation.explanation && (
        <div className="mt-6">
          <h4 className="mb-3 font-semibold">
            AI Explanation
          </h4>

          <AIExplanation
            explanation={recommendation.explanation}
          />
        </div>
      )}
    </article>
  );
}

// --------------------------------------------------
// F2b: Career Path Step
// --------------------------------------------------

function CareerStep({ step, index }) {
  const role = step.role || {};

  const skills = Array.isArray(step.skillsToLearn)
    ? step.skillsToLearn
    : [];

  const courses = Array.isArray(step.courses)
    ? step.courses
    : [];

  return (
    <div className="relative border-l-4 border-blue-200 pb-8 pl-7 last:pb-0">
      {/* Timeline number */}
      <div className="absolute -left-4 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
        {index + 1}
      </div>

      <div className="rounded-xl border bg-gray-50 p-5">
        {/* Role */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-600">
              Step {index + 1}
            </p>

            <h4 className="mt-1 text-lg font-bold">
              {role.title || "Unknown Role"}
            </h4>

            <p className="text-sm text-gray-500">
              Role Level: {role.level ?? "—"}
            </p>
          </div>

          <Badge
            text={`${step.months ?? "—"} months`}
            color="blue"
          />
        </div>

        {/* Skills */}
        <div className="mt-5">
          <h5 className="mb-3 font-semibold">
            Skills to Learn
          </h5>

          {skills.length === 0 ? (
            <p className="text-sm text-gray-500">
              No additional skills listed.
            </p>
          ) : (
            <div className="space-y-2">
              {skills.map((skill, skillIndex) => (
                <div
                  key={`${skill.skillName}-${skillIndex}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-3 text-sm"
                >
                  <span className="font-medium">
                    {skill.skillName}
                  </span>

                  <span className="text-gray-600">
                    Level {skill.from ?? "—"}
                    {" → "}
                    Level {skill.to ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Courses */}
        <div className="mt-5">
          <h5 className="mb-3 font-semibold">
            Recommended Learning Courses
          </h5>

          {courses.length === 0 ? (
            <p className="text-sm text-gray-500">
              No courses listed for this step.
            </p>
          ) : (
            <div className="space-y-2">
              {courses.map((course, courseIndex) => (
                <div
                  key={course._id || courseIndex}
                  className="flex flex-wrap justify-between gap-2 rounded-lg bg-white p-3 text-sm"
                >
                  <span className="font-medium">
                    {course.title}
                  </span>

                  <span className="text-gray-500">
                    {course.hours ?? "—"} hours
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// F2b: Complete Career Path Card
// --------------------------------------------------

function CareerPathCard({ path }) {
  const steps = Array.isArray(path.steps)
    ? path.steps
    : [];

  return (
    <article className="rounded-xl border bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Career Path #{path.rank ?? "—"}
          </p>

          <h3 className="mt-1 text-xl font-bold">
            Recommended Career Journey
          </h3>

          <p className="mt-2 text-sm text-gray-600">
            Estimated Duration:{" "}
            <strong>
              {path.totalMonths ?? "—"} months
            </strong>
          </p>
        </div>

        <div className="rounded-lg bg-green-50 px-5 py-3 text-center">
          <p className="text-xs text-gray-600">
            Path Score
          </p>

          <p className="text-2xl font-bold text-green-700">
            {formatScore(path.score)}
          </p>
        </div>
      </div>

      {/* Suitability */}
      <div className="mb-7">
        <Metric
          label="Career Path Suitability"
          value={path.score}
        />
      </div>

      {/* Timeline */}
      <div>
        <h4 className="mb-5 text-lg font-semibold">
          Career Progression Timeline
        </h4>

        {steps.length === 0 ? (
          <p className="text-sm text-gray-500">
            No progression steps available.
          </p>
        ) : (
          <div className="ml-3">
            {steps.map((step, index) => (
              <CareerStep
                key={`${step.role?._id || "role"}-${index}`}
                step={step}
                index={index}
              />
            ))}
          </div>
        )}
      </div>

      {/* Explanation */}
      {path.explanation && (
        <div className="mt-7 border-t pt-5">
          <h4 className="mb-3 font-semibold">
            AI Career Explanation
          </h4>

          <AIExplanation explanation={path.explanation} />
        </div>
      )}
    </article>
  );
}

// --------------------------------------------------
// Review Request Result
// --------------------------------------------------

function ReviewResult({ review }) {
  if (!review) return null;

  return (
    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
      <p className="font-semibold text-green-800">
        Review request submitted successfully.
      </p>

      <p className="mt-2 text-sm text-green-700">
        Status: {review.status || "Unknown"}
      </p>

      {review._id && (
        <p className="mt-1 break-all text-xs text-green-700">
          Review ID: {review._id}
        </p>
      )}

      <Link
        to="/reviews"
        className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
      >
        View Reviews →
      </Link>
    </div>
  );
}

// --------------------------------------------------
// Main Career Page
// --------------------------------------------------

export default function CareerPage() {
  const { id: employeeId } = useParams();

  // F2a: Mobility states
  const [mobility, setMobility] = useState(null);
  const [mobilityLoading, setMobilityLoading] = useState(true);
  const [mobilityError, setMobilityError] = useState("");

  // F2b: Career states
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState("");

  const [targetRoleId, setTargetRoleId] = useState("");

  const [career, setCareer] = useState(null);
  const [careerLoading, setCareerLoading] = useState(true);
  const [careerError, setCareerError] = useState("");

  // Review states
  const [mobilityReview, setMobilityReview] = useState(null);
  const [careerReview, setCareerReview] = useState(null);

  const [mobilitySubmitting, setMobilitySubmitting] = useState(false);
  const [careerSubmitting, setCareerSubmitting] = useState(false);

  const [mobilityReviewError, setMobilityReviewError] = useState("");
  const [careerReviewError, setCareerReviewError] = useState("");

  // ----------------------------------------------
  // AI4: GET /ai/mobility/:employeeId
  // ----------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadMobility() {
      setMobilityLoading(true);
      setMobilityError("");
      setMobility(null);
      setMobilityReview(null);
      setMobilityReviewError("");

      if (!employeeId) {
        setMobilityError("Employee ID is missing.");
        setMobilityLoading(false);
        return;
      }

      try {
        const response = await api.get(
          `/ai/mobility/${employeeId}`
        );

        if (active) {
          setMobility(response.data.data);
        }
      } catch (error) {
        if (active) {
          setMobilityError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setMobilityLoading(false);
        }
      }
    }

    loadMobility();

    return () => {
      active = false;
    };
  }, [employeeId]);

  // ----------------------------------------------
  // E5: GET /roles
  // ----------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadRoles() {
      setRolesLoading(true);
      setRolesError("");

      try {
        const response = await api.get("/roles");

        if (active) {
          setRoles(
            Array.isArray(response.data.data)
              ? response.data.data
              : []
          );
        }
      } catch (error) {
        if (active) {
          setRoles([]);
          setRolesError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setRolesLoading(false);
        }
      }
    }

    loadRoles();

    return () => {
      active = false;
    };
  }, []);

  // ----------------------------------------------
  // AI5: GET /ai/career/:employeeId
  // Optional query: ?targetRoleId=
  // ----------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadCareerPaths() {
      setCareerLoading(true);
      setCareerError("");
      setCareer(null);

      setCareerReview(null);
      setCareerReviewError("");

      if (!employeeId) {
        setCareerError("Employee ID is missing.");
        setCareerLoading(false);
        return;
      }

      try {
        const response = await api.get(
          `/ai/career/${employeeId}`,
          {
            params: targetRoleId
              ? { targetRoleId }
              : {},
          }
        );

        if (active) {
          setCareer(response.data.data);
        }
      } catch (error) {
        if (active) {
          setCareerError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setCareerLoading(false);
        }
      }
    }

    loadCareerPaths();

    return () => {
      active = false;
    };
  }, [employeeId, targetRoleId]);

  // ----------------------------------------------
  // V1: POST /reviews (Mobility)
  // ----------------------------------------------

  async function requestMobilityReview() {
    if (!employeeId || mobilitySubmitting || mobilityReview) {
      return;
    }

    setMobilitySubmitting(true);
    setMobilityReviewError("");

    try {
      const response = await api.post("/reviews", {
        type: "mobility",
        employeeId,
      });

      setMobilityReview(response.data.data);
    } catch (error) {
      setMobilityReviewError(getErrorMessage(error));
    } finally {
      setMobilitySubmitting(false);
    }
  }

  // ----------------------------------------------
  // V1: POST /reviews (Career)
  // ----------------------------------------------

  async function requestCareerReview() {
    if (
      !employeeId ||
      !career ||
      careerLoading ||
      careerSubmitting ||
      careerReview
    ) {
      return;
    }

    setCareerSubmitting(true);
    setCareerReviewError("");

    try {
      const payload = {
        type: "career",
        employeeId,
        ...(targetRoleId ? { roleId: targetRoleId } : {}),
      };

      const response = await api.post(
        "/reviews",
        payload
      );

      setCareerReview(response.data.data);
    } catch (error) {
      setCareerReviewError(getErrorMessage(error));
    } finally {
      setCareerSubmitting(false);
    }
  }

  // ----------------------------------------------
  // Prepare recommendations
  // ----------------------------------------------

  const recommendations = Array.isArray(mobility?.recommendations)
    ? [...mobility.recommendations]
        .sort(
          (a, b) =>
            (a.rank ?? Infinity) - (b.rank ?? Infinity)
        )
        .slice(0, 5)
    : [];

  const careerPaths = Array.isArray(career?.paths)
    ? [...career.paths]
        .sort(
          (a, b) =>
            (a.rank ?? Infinity) - (b.rank ?? Infinity)
        )
        .slice(0, 3)
    : [];

  // ----------------------------------------------
  // Render
  // ----------------------------------------------

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-6">

      {/* PAGE HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Career Development
          </h1>

          <p className="mt-2 text-gray-600">
            AI-powered internal mobility and career path planning.
          </p>
        </div>

        {employeeId && (
          <Link
            to={`/employees/${employeeId}`}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            ← Back to Profile
          </Link>
        )}
      </header>

      {/* AI NOTICE */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h2 className="font-semibold text-blue-900">
          AI-Assisted Career Guidance
        </h2>

        <p className="mt-2 text-sm text-blue-800">
          AI suggestion only. HR makes the final decision.
        </p>
      </div>

      {/* ======================================== */}
      {/* F2a: INTERNAL MOBILITY */}
      {/* ======================================== */}

      <section className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold">
            1. Internal Mobility Recommendations
          </h2>

          <p className="mt-2 text-gray-600">
            Discover alternative roles matching your existing skills.
          </p>
        </div>

        {mobilityLoading ? (
          <Loading />
        ) : mobilityError ? (
          <ErrorBox message={mobilityError} />
        ) : !mobility ? (
          <p className="text-gray-500">
            No mobility data available.
          </p>
        ) : (
          <>
            {/* Current role */}
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">
                Current Position
              </h3>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-xl font-bold text-blue-700">
                  {mobility.currentRole?.title || "Not Available"}
                </span>

                <Badge text="Current Role" color="blue" />
              </div>
            </div>

            {/* Recommended roles */}
            <div className="space-y-5">
              <h3 className="text-xl font-semibold">
                Recommended Opportunities
              </h3>

              {recommendations.length === 0 ? (
                <p className="text-gray-500">
                  No suitable alternative roles identified.
                </p>
              ) : (
                recommendations.map((item, index) => (
                  <MobilityRoleCard
                    key={item.role?._id || index}
                    recommendation={item}
                  />
                ))
              )}
            </div>

            {/* Mobility review */}
            <div className="rounded-xl border bg-white p-6">
              <h3 className="text-xl font-semibold">
                Request Mobility Review
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Send these recommendations to HR for review.
                This does not automatically change your role.
              </p>

              {mobilityReviewError && (
                <div className="mt-4">
                  <ErrorBox message={mobilityReviewError} />
                </div>
              )}

              {mobilityReview ? (
                <ReviewResult review={mobilityReview} />
              ) : (
                <button
                  type="button"
                  onClick={requestMobilityReview}
                  disabled={
                    mobilitySubmitting ||
                    recommendations.length === 0
                  }
                  className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {mobilitySubmitting
                    ? "Submitting..."
                    : "Request Mobility Review"}
                </button>
              )}
            </div>
          </>
        )}
      </section>

      {/* ======================================== */}
      {/* F2b: CAREER PATH PLANNING */}
      {/* ======================================== */}

      <section className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold">
            2. Career Path Planning
          </h2>

          <p className="mt-2 text-gray-600">
            Explore potential career progressions, required skills,
            and recommended learning opportunities.
          </p>
        </div>

        {/* Target Role Selection */}
        <div className="rounded-xl border bg-white p-5">
          <label
            htmlFor="targetRole"
            className="mb-3 block font-semibold"
          >
            Select Your Target Role
          </label>

          {rolesLoading ? (
            <Loading />
          ) : (
            <>
              <select
                id="targetRole"
                value={targetRoleId}
                onChange={(event) =>
                  setTargetRoleId(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 focus:border-blue-500 focus:outline-none"
              >
                <option value="">
                  Automatic Career Recommendations
                </option>

                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.title} — Level {role.level}
                  </option>
                ))}
              </select>

              <p className="mt-3 text-sm text-gray-500">
                Select a future role or leave the default option
                to receive AI-generated career recommendations.
              </p>
            </>
          )}

          {rolesError && (
            <div className="mt-4">
              <ErrorBox message={rolesError} />
            </div>
          )}
        </div>

        {/* Career Results */}
        {careerLoading ? (
          <Loading />
        ) : careerError ? (
          <ErrorBox message={careerError} />
        ) : !career ? (
          <p className="text-gray-500">
            No career planning data available.
          </p>
        ) : (
          <>
            {/* AI note returned by backend */}
            {career.note && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                {career.note}
              </div>
            )}

            {/* Current role */}
            <div className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold">
                Starting Career Position
              </h3>

              <p className="mt-2 text-lg font-bold text-blue-700">
                {career.currentRole?.title || "Not Available"}
              </p>
            </div>

            {/* Career Paths */}
            <div>
              <h3 className="mb-5 text-xl font-semibold">
                AI-Recommended Career Paths
              </h3>

              {careerPaths.length === 0 ? (
                <div className="rounded-xl border bg-white p-6">
                  <p className="text-gray-500">
                    No career paths found for the selected target role.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {careerPaths.map((path, index) => (
                    <CareerPathCard
                      key={`${path.rank ?? index}-${index}`}
                      path={path}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Career Review Request */}
            <div className="rounded-xl border bg-white p-6">
              <h3 className="text-xl font-semibold">
                Request Career Plan Review
              </h3>

              <p className="mt-2 text-sm text-gray-600">
                Submit your suggested career plan to HR.
                HR can review and approve or reject the request.
                No role assignment happens automatically.
              </p>

              {careerReviewError && (
                <div className="mt-4">
                  <ErrorBox message={careerReviewError} />
                </div>
              )}

              {careerReview ? (
                <ReviewResult review={careerReview} />
              ) : (
                <button
                  type="button"
                  onClick={requestCareerReview}
                  disabled={
                    careerSubmitting ||
                    careerLoading ||
                    careerPaths.length === 0
                  }
                  className="mt-5 rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {careerSubmitting
                    ? "Submitting..."
                    : "Request Career Review"}
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}