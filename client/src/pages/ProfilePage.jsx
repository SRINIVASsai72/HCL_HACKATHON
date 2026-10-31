
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import {
  Loading,
  ErrorBox,
  ScoreBar,
  ExplainBox,
} from "../components/ui";

const LEVELS = [
  { value: 1, label: "1 - Beginner" },
  { value: 2, label: "2 - Basic" },
  { value: 3, label: "3 - Intermediate" },
  { value: 4, label: "4 - Advanced" },
  { value: 5, label: "5 - Expert" },
];

function getError(err, fallback) {
  if (err.response?.status === 503) {
    return "AI is not ready. Ask the backend team to run npm run ai:build.";
  }
  if (err.response?.status === 403) {
    return "Access denied. You are not authorized for this action.";
  }
  return err.response?.data?.message || fallback;
}

function GapTable({ title, gaps = [] }) {
  return (
    <div>
      <h3 className="mb-3 text-lg font-semibold">{title}</h3>

      {gaps.length === 0 ? (
        <p className="rounded-lg bg-green-50 p-4 text-green-800">
          No skill gaps identified.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100">
              <tr>
                {[
                  "Skill",
                  "Required",
                  "Current",
                  "Effective",
                  "Gap",
                  "Reason",
                ].map((heading) => (
                  <th key={heading} className="p-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gaps.map((gap, index) => (
                <tr
                  key={`${gap.skillId}-${index}`}
                  className="border-b border-slate-100"
                >
                  <td className="p-3">{gap.skillName}</td>
                  <td className="p-3">{gap.required}</td>
                  <td className="p-3">{gap.current}</td>
                  <td className="p-3">{gap.effective}</td>
                  <td className="p-3 font-semibold text-red-600">
                    {gap.gap}
                  </td>
                  <td className="p-3">{gap.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams();

  // F3a: Employee and skills
  const [profile, setProfile] = useState(null);
  const [allSkills, setAllSkills] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [skillsDirty, setSkillsDirty] = useState(false);
  const [skillsVersion, setSkillsVersion] = useState(0);

  const [newSkillId, setNewSkillId] = useState("");
  const [newLevel, setNewLevel] = useState(1);

  const [skillText, setSkillText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchDone, setMatchDone] = useState(false);

  // F3b: Gap analysis
  const [roles, setRoles] = useState([]);
  const [targetRoleId, setTargetRoleId] = useState("");
  const [horizon, setHorizon] = useState(12);
  const [gapData, setGapData] = useState(null);
  const [gapLoading, setGapLoading] = useState(false);
  const [gapError, setGapError] = useState("");

  // F3c: Learning recommendations and review
  const [learningData, setLearningData] = useState(null);
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningError, setLearningError] = useState("");
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(null);
  const [reviewError, setReviewError] = useState("");

  // Load employee, catalog, and roles
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setProfile(null);
      setGapData(null);
      setLearningData(null);
      setTargetRoleId("");
      setSkillsDirty(false);
      setSubmittedReview(null);

      try {
        const [employeeRes, skillsRes, rolesRes] =
          await Promise.all([
            api.get(`/employees/${id}`),
            api.get("/skills"),
            api.get("/roles"),
          ]);

        if (cancelled) return;

        const employee = employeeRes.data.data;
        setProfile(employee);
        setSkills(employee.skills || []);
        setAllSkills(skillsRes.data.data || []);
        setRoles(rolesRes.data.data || []);
        setTargetRoleId(employee.role?._id || "");
      } catch (err) {
        if (!cancelled) {
          setError(getError(err, "Unable to load profile."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // F3b: Fetch gaps whenever saved skills, role, or horizon changes
  useEffect(() => {
    if (!profile || !targetRoleId || skillsDirty) {
      setGapData(null);
      return;
    }

    let cancelled = false;

    async function loadGaps() {
      setGapLoading(true);
      setGapError("");
      setGapData(null);

      try {
        const res = await api.get(`/ai/gaps/${id}`, {
          params: { roleId: targetRoleId, horizon },
        });
        if (!cancelled) setGapData(res.data.data);
      } catch (err) {
        if (!cancelled) {
          setGapError(getError(err, "Unable to load skill gaps."));
        }
      } finally {
        if (!cancelled) setGapLoading(false);
      }
    }

    loadGaps();
    return () => {
      cancelled = true;
    };
  }, [id, profile, targetRoleId, horizon, skillsVersion, skillsDirty]);

  // F3c: Fetch learning plan for saved skills and selected role
  useEffect(() => {
    if (!profile || !targetRoleId || skillsDirty) {
      setLearningData(null);
      return;
    }

    let cancelled = false;

    async function loadLearning() {
      setLearningLoading(true);
      setLearningError("");
      setLearningData(null);
      setExpandedCourse(null);

      try {
        const res = await api.get(`/ai/learning/${id}`, {
          params: { roleId: targetRoleId },
        });

        if (!cancelled) setLearningData(res.data.data);
      } catch (err) {
        if (!cancelled) {
          setLearningError(
            getError(err, "Unable to load learning recommendations.")
          );
        }
      } finally {
        if (!cancelled) setLearningLoading(false);
      }
    }

    loadLearning();
    return () => {
      cancelled = true;
    };
  }, [id, profile, targetRoleId, skillsVersion, skillsDirty]);

  function markDirty() {
    setSkillsDirty(true);
    setSaveMessage("");
    setSubmittedReview(null);
  }

  function updateLevel(skillId, level) {
    markDirty();
    setSkills((prev) =>
      prev.map((skill) =>
        skill.skillId === skillId
          ? { ...skill, level: Number(level) }
          : skill
      )
    );
  }

  function removeSkill(skillId) {
    markDirty();
    setSkills((prev) =>
      prev.filter((skill) => skill.skillId !== skillId)
    );
  }

  function addSkill(skillId, level = newLevel) {
    if (!skillId) return;

    if (skills.some((skill) => skill.skillId === skillId)) {
      setSaveMessage("Skill already added.");
      return;
    }

    const selected = allSkills.find((s) => s._id === skillId);
    if (!selected) return;

    markDirty();
    setSkills((prev) => [
      ...prev,
      {
        skillId: selected._id,
        name: selected.name,
        category: selected.category,
        level: Number(level),
      },
    ]);
    setNewSkillId("");
    setNewLevel(1);
  }

  async function saveSkills() {
    setSaving(true);
    setError("");
    setSaveMessage("");

    try {
      const payload = {
        skills: skills.map(({ skillId, level }) => ({
          skillId,
          level: Number(level),
        })),
      };

      const res = await api.put(`/employees/${id}/skills`, payload);
      const updated = res.data.data;

      setProfile(updated);
      setSkills(updated.skills || []);
      setSkillsDirty(false);
      setSkillsVersion((v) => v + 1);
      setSaveMessage("Skills saved successfully.");
    } catch (err) {
      setError(getError(err, "Unable to save skills."));
    } finally {
      setSaving(false);
    }
  }

  async function findSkills() {
    const text = skillText.trim();
    setMatchError("");
    setSuggestions([]);
    setMatchDone(false);

    if (!text || text.length > 2000) {
      setMatchError("Enter text of at most 2000 characters.");
      return;
    }

    setMatching(true);

    try {
      const res = await api.post("/ai/skills/match", { text });
      setSuggestions(res.data.data || []);
      setMatchDone(true);
    } catch (err) {
      setMatchError(getError(err, "Skill matching failed."));
    } finally {
      setMatching(false);
    }
  }

  // F3c: Create server-side HR learning review
  async function submitLearningPlan() {
    if (!learningData || skillsDirty || !targetRoleId) return;

    setSubmitting(true);
    setReviewError("");

    try {
      const res = await api.post("/reviews", {
        type: "learning",
        employeeId: id,
        roleId: targetRoleId,
      });

      setSubmittedReview(res.data.data);
    } catch (err) {
      setReviewError(
        getError(err, "Unable to submit learning plan.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loading />;

  if (!profile) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <ErrorBox message={error || "Employee not found."} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Profile header */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-medium text-indigo-600">
                Employee Profile
              </p>
              <h1 className="mt-2 text-3xl font-bold">
                {profile.name}
              </h1>
              <p className="mt-2 text-slate-600">
                {profile.code} | {profile.department} |{" "}
                {profile.role?.title}
              </p>
            </div>

            <Link
              to={`/employees/${id}/career`}
              className="rounded-lg bg-indigo-600 px-5 py-3 font-medium text-white"
            >
              Career & Mobility →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Skills", skills.length],
              ["Completed", profile.learning?.completed ?? 0],
              ["Enrolled", profile.learning?.enrolled ?? 0],
              ["Dropped", profile.learning?.dropped ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-100 p-4">
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* F3a: Skill inventory */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Skill Inventory</h2>
          <p className="mt-2 text-sm text-slate-500">
            Manage skills and proficiency levels from 1 to 5.
          </p>

          {error && (
            <div className="mt-4"><ErrorBox message={error} /></div>
          )}
          {saveMessage && (
            <p className="mt-4 rounded-lg bg-indigo-50 p-3 text-indigo-800">
              {saveMessage}
            </p>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  {["Skill", "Category", "Level", "Action"].map((h) => (
                    <th key={h} className="p-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skills.map((skill) => (
                  <tr key={skill.skillId} className="border-b">
                    <td className="p-3">{skill.name}</td>
                    <td className="p-3">{skill.category}</td>
                    <td className="p-3">
                      <select
                        value={skill.level}
                        onChange={(e) =>
                          updateLevel(skill.skillId, e.target.value)
                        }
                        className="rounded border p-2"
                      >
                        {LEVELS.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => removeSkill(skill.skillId)}
                        className="text-red-600"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {skills.length === 0 && (
              <p className="p-5 text-center text-slate-500">
                No skills added yet.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <h3 className="font-semibold">Add Skill</h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <select
                value={newSkillId}
                onChange={(e) => setNewSkillId(e.target.value)}
                className="min-w-48 flex-1 rounded border bg-white p-3"
              >
                <option value="">Select a skill</option>
                {allSkills
                  .filter((s) =>
                    !skills.some((added) => added.skillId === s._id)
                  )
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
              </select>

              <select
                value={newLevel}
                onChange={(e) => setNewLevel(Number(e.target.value))}
                className="rounded border bg-white p-3"
              >
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => addSkill(newSkillId)}
                disabled={!newSkillId}
                className="rounded bg-slate-800 px-5 py-3 text-white disabled:opacity-50"
              >
                Add Skill
              </button>
            </div>
          </div>

          {skillsDirty && (
            <p className="mt-4 text-sm text-amber-700">
              Unsaved changes. Save skills to update AI analysis.
            </p>
          )}

          <div className="mt-5 text-right">
            <button
              onClick={saveSkills}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Skills"}
            </button>
          </div>
        </section>

        {/* F3a: AI skill extraction */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">Find Skills from Text</h2>
          <p className="mt-2 text-sm text-slate-500">
            Paste your experience or project description.
          </p>

          <textarea
            value={skillText}
            onChange={(e) => setSkillText(e.target.value)}
            maxLength={2000}
            rows={4}
            className="mt-4 w-full rounded-lg border p-3"
            placeholder="I built a React and Node.js application with MongoDB."
          />

          <p className="text-right text-xs text-slate-500">
            {skillText.length}/2000
          </p>

          <button
            onClick={findSkills}
            disabled={matching || !skillText.trim()}
            className="mt-3 rounded-lg bg-indigo-600 px-5 py-3 text-white disabled:opacity-50"
          >
            {matching ? "Finding..." : "Find Skills"}
          </button>

          {matchError && (
            <div className="mt-4">
              <ErrorBox message={matchError} />
            </div>
          )}

          {matchDone && suggestions.length === 0 && (
            <p className="mt-4 text-slate-500">
              No matching skills found.
            </p>
          )}

          {suggestions.length > 0 && (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    {["Phrase", "Skill", "Score", "Method", "Action"].map(
                      (h) => <th key={h} className="p-3">{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {suggestions.map((item, index) => {
                    const added = skills.some(
                      (s) => s.skillId === item.skillId
                    );
                    return (
                      <tr key={`${item.skillId}-${index}`} className="border-b">
                        <td className="p-3">{item.phrase}</td>
                        <td className="p-3">{item.skillName}</td>
                        <td className="p-3">
                          {(item.score * 100).toFixed(1)}%
                        </td>
                        <td className="p-3">{item.method}</td>
                        <td className="p-3">
                          <button
                            disabled={added}
                            onClick={() => addSkill(item.skillId, 1)}
                            className="text-indigo-600 disabled:text-slate-400"
                          >
                            {added ? "Added" : "Add"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* F3b: Skill gap analysis */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            AI Skill Gap Analysis
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="role" className="mb-2 block text-sm">
                Target Role
              </label>
              <select
                id="role"
                value={targetRoleId}
                onChange={(e) => {
                  setTargetRoleId(e.target.value);
                  setSubmittedReview(null);
                }}
                className="w-full rounded-lg border p-3"
              >
                <option value="">Select role</option>
                {roles.map((role) => (
                  <option key={role._id} value={role._id}>
                    {role.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="horizon" className="mb-2 block text-sm">
                Forecast Horizon
              </label>
              <select
                id="horizon"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full rounded-lg border p-3"
              >
                <option value={6}>6 Months</option>
                <option value={12}>12 Months</option>
              </select>
            </div>
          </div>

          <div className="mt-6 space-y-7">
            {skillsDirty ? (
              <p className="text-amber-700">
                Save skills to recalculate the gap analysis.
              </p>
            ) : gapLoading ? (
              <Loading />
            ) : gapError ? (
              <ErrorBox message={gapError} />
            ) : gapData ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-indigo-50 p-5">
                    <h3 className="font-semibold">Current Readiness</h3>
                    <p className="my-3 text-3xl font-bold">
                      {Math.round(gapData.readiness.current * 100)}%
                    </p>
                    <ScoreBar value={gapData.readiness.current} />
                  </div>
                  <div className="rounded-lg bg-slate-100 p-5">
                    <h3 className="font-semibold">Future Readiness</h3>
                    <p className="my-3 text-3xl font-bold">
                      {Math.round(gapData.readiness.future * 100)}%
                    </p>
                    <ScoreBar value={gapData.readiness.future} />
                  </div>
                </div>

                <p className="text-sm text-slate-500">
                  Effective levels can include semantic partial credit
                  from related skills without changing saved records.
                </p>

                <GapTable
                  title="Current Skill Gaps"
                  gaps={gapData.currentGaps}
                />
                <GapTable
                  title="Future Skill Gaps"
                  gaps={gapData.futureGaps}
                />

                {gapData.explanation && (
                  <div>
                    <h3 className="mb-3 font-semibold">AI Explanation</h3>
                    <ExplainBox explanation={gapData.explanation} />
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500">
                Select a target role to analyze skill gaps.
              </p>
            )}
          </div>
        </section>

        {/* F3c: Personalized learning plan */}
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Personalized Learning Plan
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            AI-ranked courses to close your skill gaps
            for the selected target role.
          </p>

          <div className="mt-6 space-y-7">
            {skillsDirty ? (
              <p className="rounded-lg bg-amber-50 p-4 text-amber-800">
                Save your skills before generating a learning plan.
              </p>
            ) : learningLoading ? (
              <Loading />
            ) : learningError ? (
              <ErrorBox message={learningError} />
            ) : learningData ? (
              <>
                <div>
                  <h3 className="mb-3 text-lg font-semibold">
                    Recommended Courses
                  </h3>

                  {(learningData.recommendations || []).length === 0 ? (
                    <p className="rounded-lg bg-slate-50 p-4 text-slate-600">
                      No courses are currently recommended.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {learningData.recommendations.map((item) => (
                        <div
                          key={item.course._id}
                          className="rounded-lg border border-slate-200 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-indigo-600">
                                Rank #{item.rank}
                              </p>
                              <h4 className="mt-1 font-semibold">
                                {item.course.title}
                              </h4>
                              <p className="mt-1 text-sm text-slate-500">
                                {item.course.provider} |{" "}
                                {item.course.type} |{" "}
                                {item.course.hours} hours
                              </p>
                            </div>
                            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700">
                              {(item.score * 100).toFixed(1)}% match
                            </span>
                          </div>

                          <p className="mt-3 text-sm text-slate-600">
                            <strong>Skills:</strong>{" "}
                            {(item.skills || []).join(", ") || "Not specified"}
                          </p>

                          <button
                            type="button"
                            onClick={() =>
                              setExpandedCourse(
                                expandedCourse === item.course._id
                                  ? null
                                  : item.course._id
                              )
                            }
                            className="mt-3 text-sm font-semibold text-indigo-600 hover:underline"
                          >
                            {expandedCourse === item.course._id
                              ? "Hide Explanation"
                              : "Why this course?"}
                          </button>

                          {expandedCourse === item.course._id && (
                            <div className="mt-4">
                              {item.explanation ? (
                                <ExplainBox explanation={item.explanation} />
                              ) : (
                                <p className="text-sm text-slate-500">
                                  No explanation available.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-4 text-lg font-semibold">
                    Your Learning Roadmap
                  </h3>

                  {(learningData.path || []).length === 0 ? (
                    <p className="text-slate-500">
                      No learning steps required.
                    </p>
                  ) : (
                    <ol className="space-y-3">
                      {[...learningData.path]
                        .sort((a, b) => a.order - b.order)
                        .map((step) => (
                          <li
                            key={`${step.order}-${step.courseId}`}
                            className="flex items-center gap-4 rounded-lg bg-slate-50 p-4"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">
                              {step.order}
                            </span>
                            <span className="font-medium">
                              {step.title}
                            </span>
                          </li>
                        ))}
                    </ol>
                  )}
                </div>

                <div className="rounded-lg bg-indigo-50 p-5">
                  <p className="text-sm text-indigo-700">
                    Total Learning Duration
                  </p>
                  <p className="mt-1 text-3xl font-bold text-indigo-900">
                    {learningData.totalHours ?? 0} hours
                  </p>
                </div>

                <div>
                  <h3 className="mb-2 font-semibold">
                    Uncovered Skills
                  </h3>
                  {(learningData.uncoveredSkills || []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {learningData.uncoveredSkills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-full bg-amber-50 px-3 py-2 text-sm text-amber-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600">
                      No uncovered skills reported.
                    </p>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="font-semibold">
                    HR Approval
                  </h3>
                  <p className="mt-2 text-sm text-slate-500">
                    Submit this plan for HR review. Submission
                    does not automatically enroll you in courses.
                  </p>

                  {reviewError && (
                    <div className="mt-4">
                      <ErrorBox message={reviewError} />
                    </div>
                  )}

                  {submittedReview ? (
                    <div className="mt-4 rounded-lg bg-green-50 p-4">
                      <p className="font-semibold text-green-800">
                        Learning plan submitted successfully.
                      </p>
                      <p className="mt-1 text-sm text-green-700">
                        Review status: {submittedReview.status}
                      </p>
                      <Link
                        to="/reviews"
                        className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:underline"
                      >
                        View Reviews →
                      </Link>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={submitting || skillsDirty}
                      onClick={submitLearningPlan}
                      className="mt-4 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {submitting
                        ? "Submitting..."
                        : "Submit Plan for HR Review"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-slate-500">
                Select a target role to view the learning plan.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
