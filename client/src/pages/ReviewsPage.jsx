
import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../AuthContext";
import {
  Loading,
  ErrorBox,
  Badge,
  ExplainBox,
} from "../components/ui";

const TYPES = ["learning", "mobility", "career", "risk"];
const STATUSES = [
  "pending",
  "approved",
  "rejected",
  "modified",
];

function formatDate(date) {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString();
}

function getError(err, fallback) {
  if (err.response?.status === 403) {
    return "Access denied. You are not authorized.";
  }
  if (err.response?.status === 404) {
    return "Review not found.";
  }
  return err.response?.data?.message || fallback;
}

function ReviewExplanation({ explanation }) {
  if (!explanation) return null;
  return (
    <div className="mt-4">
      <ExplainBox explanation={explanation} />
    </div>
  );
}

function LearningDetails({ output }) {
  const recommendations = output?.recommendations || [];
  const path = output?.path || [];

  return (
    <div className="space-y-5">
      <div>
        <h4 className="mb-3 font-semibold">
          Recommended Courses
        </h4>

        {recommendations.length === 0 ? (
          <p className="text-sm text-slate-500">
            No course recommendations.
          </p>
        ) : (
          <div className="space-y-3">
            {recommendations.map((item, index) => (
              <div
                key={item.course?._id || index}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-indigo-600">
                      Rank #{item.rank}
                    </p>
                    <p className="font-semibold">
                      {item.course?.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.course?.provider} |{" "}
                      {item.course?.type} |{" "}
                      {item.course?.hours} hours
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-indigo-600">
                    {typeof item.score === "number"
                      ? `${(item.score * 100).toFixed(1)}% match`
                      : "—"}
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  Skills: {(item.skills || []).join(", ") || "None"}
                </p>

                <ReviewExplanation
                  explanation={item.explanation}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 font-semibold">Learning Path</h4>
        {path.length === 0 ? (
          <p className="text-sm text-slate-500">
            No learning path available.
          </p>
        ) : (
          <ol className="space-y-2">
            {[...path]
              .sort((a, b) => a.order - b.order)
              .map((step, index) => (
                <li
                  key={`${step.courseId}-${index}`}
                  className="rounded-lg bg-slate-50 p-3 text-sm"
                >
                  {step.order}. {step.title}
                </li>
              ))}
          </ol>
        )}
      </div>

      <p className="font-semibold">
        Total duration: {output?.totalHours ?? 0} hours
      </p>

      <div>
        <h4 className="font-semibold">Uncovered Skills</h4>
        <p className="mt-1 text-sm text-slate-600">
          {(output?.uncoveredSkills || []).join(", ") || "None"}
        </p>
      </div>
    </div>
  );
}

function MobilityDetails({ output }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Current role: {output?.currentRole?.title || "—"}
      </p>

      {(output?.recommendations || []).length === 0 && (
        <p className="text-sm text-slate-500">
          No mobility recommendations.
        </p>
      )}

      {(output?.recommendations || []).map((item, index) => (
        <div
          key={item.role?._id || index}
          className="rounded-lg border p-4"
        >
          <h4 className="font-semibold">
            #{item.rank} {item.role?.title}
          </h4>
          <p className="mt-2 text-sm">
            Readiness:{" "}
            {typeof item.readiness === "number"
              ? `${(item.readiness * 100).toFixed(1)}%`
              : "—"}
          </p>
          <p className="text-sm">
            Match score:{" "}
            {typeof item.score === "number"
              ? `${(item.score * 100).toFixed(1)}%`
              : "—"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Main gaps:{" "}
            {(item.topGaps || [])
              .map((gap) => gap.skillName)
              .join(", ") || "None"}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Suggested courses:{" "}
            {(item.courses || [])
              .map((course) => course.title)
              .join(", ") || "None"}
          </p>
          <ReviewExplanation explanation={item.explanation} />
        </div>
      ))}

      {output?.note && (
        <p className="text-sm text-slate-500">{output.note}</p>
      )}
    </div>
  );
}

function CareerDetails({ output }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Current role: {output?.currentRole?.title || "—"}
      </p>

      {(output?.paths || []).length === 0 && (
        <p className="text-sm text-slate-500">
          No career paths available.
        </p>
      )}

      {(output?.paths || []).map((path, index) => (
        <div key={index} className="rounded-lg border p-4">
          <h4 className="font-semibold">
            Path #{path.rank} — {path.totalMonths} months
          </h4>
          <p className="mt-1 text-sm">
            Score:{" "}
            {typeof path.score === "number"
              ? `${(path.score * 100).toFixed(1)}%`
              : "—"}
          </p>

          <div className="mt-3 space-y-3">
            {(path.steps || []).map((step, stepIndex) => (
              <div
                key={`${step.role?._id}-${stepIndex}`}
                className="rounded-lg bg-slate-50 p-3"
              >
                <p className="font-medium">
                  {stepIndex + 1}. {step.role?.title}
                </p>
                <p className="mt-1 text-sm">
                  Duration: {step.months} months
                </p>
                <p className="text-sm">
                  Skills to learn:{" "}
                  {(step.skillsToLearn || [])
                    .map(
                      (skill) =>
                        `${skill.skillName} (${skill.from} → ${skill.to})`
                    )
                    .join(", ") || "None"}
                </p>
                <p className="text-sm">
                  Courses:{" "}
                  {(step.courses || [])
                    .map((course) => course.title)
                    .join(", ") || "None"}
                </p>
              </div>
            ))}
          </div>

          <ReviewExplanation explanation={path.explanation} />
        </div>
      ))}

      {output?.note && (
        <p className="text-sm text-slate-500">{output.note}</p>
      )}
    </div>
  );
}

function RiskDetails({ output }) {
  // Risk review output is a risk item.
  if (!output || typeof output !== "object") {
    return <p>No risk information available.</p>;
  }

  return (
    <div className="space-y-3">
      <h4 className="text-lg font-semibold">
        {output.skillName || "Skill Risk"}
      </h4>
      <p>Risk score: {output.riskScore ?? "—"}</p>
      <p>Risk band: {output.band || "—"}</p>
      <p>Demand now: {output.demandNow ?? "—"}</p>
      <p>
        Projected demand: {output.projectedDemand ?? "—"}
      </p>
      <p>Supply: {output.supply ?? "—"}</p>
      <p>Experts: {output.experts ?? "—"}</p>
      <p>
        Key person risk: {output.keyPersonRisk ?? "—"}
      </p>
      <p>Growth: {output.growthPct ?? "—"}%</p>
      <ReviewExplanation explanation={output.explanation} />
    </div>
  );
}

function OutputDetails({ type, output }) {
  if (!output) {
    return (
      <p className="text-sm text-slate-500">
        No AI output available.
      </p>
    );
  }

  switch (type) {
    case "learning":
      return <LearningDetails output={output} />;
    case "mobility":
      return <MobilityDetails output={output} />;
    case "career":
      return <CareerDetails output={output} />;
    case "risk":
      return <RiskDetails output={output} />;
    default:
      return <p>Unsupported review type.</p>;
  }
}

export default function ReviewsPage() {
  const { isHR } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  const [selectedId, setSelectedId] = useState(null);
  const [comment, setComment] = useState("");
  const [decision, setDecision] = useState("approved");
  const [removedCourseIds, setRemovedCourseIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReviews() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/reviews", {
          params: {
            status: statusFilter,
            type: typeFilter,
          },
        });

        if (!cancelled) {
          setReviews(response.data.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setReviews([]);
          setError(getError(err, "Unable to load reviews."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [statusFilter, typeFilter, refreshCount]);

  const selectedReview =
    reviews.find((review) => review._id === selectedId) || null;

  function selectReview(review) {
    setSelectedId(review._id);
    setComment("");
    setDecision("approved");
    setRemovedCourseIds([]);
    setActionError("");
    setActionSuccess("");
  }

  function toggleCourse(courseId) {
    setRemovedCourseIds((previous) =>
      previous.includes(courseId)
        ? previous.filter((id) => id !== courseId)
        : [...previous, courseId]
    );
  }

  function makeModifiedOutput(review) {
    const original = review.aiOutput;

    if (review.type !== "learning") {
      // Retain the original recommendation structure.
      return { ...original };
    }

    const recommendations = (original.recommendations || []).filter(
      (item) => !removedCourseIds.includes(item.course?._id)
    );

    const allowedIds = new Set(
      recommendations.map((item) => item.course?._id)
    );

    const path = (original.path || []).filter((step) =>
      allowedIds.has(step.courseId)
    );

    const totalHours = path.reduce((sum, step) => {
      const item = recommendations.find(
        (rec) => rec.course?._id === step.courseId
      );
      return sum + (item?.course?.hours || 0);
    }, 0);

    return {
      ...original,
      recommendations: recommendations.map((item, index) => ({
        ...item,
        rank: index + 1,
      })),
      path: path.map((step, index) => ({
        ...step,
        order: index + 1,
      })),
      totalHours,
    };
  }

  async function submitDecision() {
    if (!selectedReview || !isHR) return;

    const cleanComment = comment.trim();

    if (
      (decision === "rejected" || decision === "modified") &&
      !cleanComment
    ) {
      setActionError(
        "A comment is required for rejection or modification."
      );
      return;
    }

    if (
      decision === "modified" &&
      selectedReview.type === "learning" &&
      removedCourseIds.length === 0
    ) {
      setActionError("Select at least one course to remove.");
      return;
    }

    // Modification for learning is supported through course removal.
    if (
      decision === "modified" &&
      selectedReview.type !== "learning"
    ) {
      setActionError(
        "Modification is currently supported for learning plans only. You can approve or reject other types."
      );
      return;
    }

    setSubmitting(true);
    setActionError("");
    setActionSuccess("");

    try {
      const payload = {
        status: decision,
        comment: cleanComment,
      };

      if (decision === "modified") {
        payload.modifiedOutput = makeModifiedOutput(selectedReview);
      }

      await api.patch(`/reviews/${selectedReview._id}`, payload);

      setActionSuccess("Review decision saved successfully.");
      setSelectedId(null);
      setRefreshCount((count) => count + 1);
    } catch (err) {
      if (err.response?.status === 409) {
        setActionError("Already decided.");
        setRefreshCount((count) => count + 1);
      } else {
        setActionError(
          getError(err, "Unable to save review decision.")
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isHR ? "HR Review Center" : "My Reviews"}
          </h1>
          <p className="mt-2 text-slate-500">
            {isHR
              ? "Review AI recommendations and make final decisions."
              : "Track the status of your submitted recommendations."}
          </p>
        </div>

        {/* Filters */}
        <div className="grid gap-4 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2">
          <div>
            <label
              htmlFor="review-status"
              className="mb-2 block text-sm font-medium"
            >
              Status
            </label>
            <select
              id="review-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSelectedId(null);
              }}
              className="w-full rounded-lg border p-3"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="review-type"
              className="mb-2 block text-sm font-medium"
            >
              Type
            </label>
            <select
              id="review-type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setSelectedId(null);
              }}
              className="w-full rounded-lg border p-3"
            >
              <option value="">All Types</option>
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {actionSuccess && (
          <p className="rounded-lg bg-green-50 p-4 text-green-800">
            {actionSuccess}
          </p>
        )}

        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Reviews table */}
            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="font-semibold">
                  Reviews ({reviews.length})
                </h2>
              </div>

              {reviews.length === 0 ? (
                <p className="p-8 text-center text-slate-500">
                  No reviews found for the selected filters.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Employee / Skill</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {reviews.map((review) => (
                        <tr
                          key={review._id}
                          onClick={() => selectReview(review)}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter" ||
                              e.key === " "
                            ) {
                              e.preventDefault();
                              selectReview(review);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          className={`cursor-pointer border-b hover:bg-indigo-50 ${
                            selectedId === review._id
                              ? "bg-indigo-50"
                              : ""
                          }`}
                        >
                          <td className="p-3">
                            {formatDate(review.createdAt)}
                          </td>
                          <td className="p-3 capitalize">
                            {review.type}
                          </td>
                          <td className="p-3">
                            {review.employee?.name ||
                              review.skill?.name ||
                              "—"}
                          </td>
                          <td className="p-3">
                            <Badge
                              text={review.status}
                              color={
                                review.status === "approved"
                                  ? "green"
                                  : review.status === "rejected"
                                    ? "red"
                                    : review.status === "pending"
                                      ? "yellow"
                                      : "blue"
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Review detail */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              {!selectedReview ? (
                <p className="py-12 text-center text-slate-500">
                  Select a review to see its details.
                </p>
              ) : (
                <div className="space-y-5">
                  <div className="border-b pb-4">
                    <h2 className="text-xl font-bold capitalize">
                      {selectedReview.type} Review
                    </h2>

                    <p className="mt-2 text-sm text-slate-600">
                      Employee:{" "}
                      {selectedReview.employee?.name || "—"}
                    </p>
                    <p className="text-sm text-slate-600">
                      Skill:{" "}
                      {selectedReview.skill?.name || "—"}
                    </p>
                    <p className="text-sm text-slate-600">
                      Submitted:{" "}
                      {formatDate(selectedReview.createdAt)}
                    </p>
                    <p className="text-sm text-slate-600">
                      Status: {selectedReview.status}
                    </p>
                    <p className="text-sm text-slate-600">
                      Decision date:{" "}
                      {formatDate(selectedReview.decidedAt)}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-3 text-lg font-semibold">
                      Original AI Recommendation
                    </h3>
                    <OutputDetails
                      type={selectedReview.type}
                      output={selectedReview.aiOutput}
                    />
                  </div>

                  {selectedReview.modifiedOutput && (
                    <div className="border-t pt-5">
                      <h3 className="mb-3 font-semibold">
                        HR Modified Recommendation
                      </h3>
                      <OutputDetails
                        type={selectedReview.type}
                        output={selectedReview.modifiedOutput}
                      />
                    </div>
                  )}

                  {selectedReview.comment && (
                    <div className="rounded-lg bg-slate-50 p-4">
                      <h3 className="font-semibold">
                        HR Comment
                      </h3>
                      <p className="mt-2 text-sm">
                        {selectedReview.comment}
                      </p>
                    </div>
                  )}

                  {/* HR decision controls */}
                  {isHR &&
                    selectedReview.status === "pending" && (
                      <div className="border-t pt-5">
                        <h3 className="mb-4 font-semibold">
                          HR Decision
                        </h3>

                        <div className="mb-4 flex flex-wrap gap-4">
                          {[
                            ["approved", "Approve"],
                            ["rejected", "Reject"],
                            ["modified", "Modify"],
                          ].map(([value, label]) => (
                            <label
                              key={value}
                              className="flex items-center gap-2"
                            >
                              <input
                                type="radio"
                                name="decision"
                                value={value}
                                checked={decision === value}
                                onChange={() => {
                                  setDecision(value);
                                  setActionError("");
                                }}
                                disabled={
                                  value === "modified" &&
                                  selectedReview.type !== "learning"
                                }
                              />
                              {label}
                            </label>
                          ))}
                        </div>

                        {decision === "modified" &&
                          selectedReview.type === "learning" && (
                            <div className="mb-4 rounded-lg bg-slate-50 p-4">
                              <p className="mb-3 font-medium">
                                Select courses to remove:
                              </p>

                              {(
                                selectedReview.aiOutput
                                  ?.recommendations || []
                              ).map((item) => (
                                <label
                                  key={item.course._id}
                                  className="mb-2 flex items-center gap-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={removedCourseIds.includes(
                                      item.course._id
                                    )}
                                    onChange={() =>
                                      toggleCourse(item.course._id)
                                    }
                                  />
                                  {item.course.title}
                                </label>
                              ))}
                            </div>
                          )}

                        <label
                          htmlFor="review-comment"
                          className="mb-2 block text-sm font-medium"
                        >
                          HR Comment
                          {decision !== "approved" && " (required)"}
                        </label>

                        <textarea
                          id="review-comment"
                          value={comment}
                          onChange={(e) =>
                            setComment(e.target.value)
                          }
                          rows={3}
                          placeholder="Enter your decision explanation..."
                          className="w-full rounded-lg border p-3"
                        />

                        {actionError && (
                          <div className="mt-4">
                            <ErrorBox message={actionError} />
                          </div>
                        )}

                        <button
                          type="button"
                          disabled={submitting}
                          onClick={submitDecision}
                          className="mt-4 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {submitting
                            ? "Saving Decision..."
                            : "Submit Decision"}
                        </button>
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
