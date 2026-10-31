
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import { Loading, ErrorBox } from "../components/ui";

const LEVELS = [
  { value: 1, label: "1 - Beginner" },
  { value: 2, label: "2 - Basic" },
  { value: 3, label: "3 - Intermediate" },
  { value: 4, label: "4 - Advanced" },
  { value: 5, label: "5 - Expert" },
];

export default function ProfilePage() {
  const { id } = useParams();

  const [profile, setProfile] = useState(null);
  const [allSkills, setAllSkills] = useState([]);
  const [skills, setSkills] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [newSkillId, setNewSkillId] = useState("");
  const [newLevel, setNewLevel] = useState(1);

  const [skillText, setSkillText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchDone, setMatchDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");
      setProfile(null);

      try {
        const [profileRes, skillsRes] = await Promise.all([
          api.get(`/employees/${id}`),
          api.get("/skills"),
        ]);

        if (cancelled) return;

        const employee = profileRes.data.data;
        setProfile(employee);
        setSkills(employee.skills || []);
        setAllSkills(skillsRes.data.data || []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.status === 403
              ? "Access denied. You cannot view this profile."
              : err.response?.status === 404
                ? "Employee not found."
                : err.response?.data?.message ||
                  "Unable to load employee profile."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function updateLevel(skillId, level) {
    setSaveMessage("");
    setSkills((previous) =>
      previous.map((skill) =>
        skill.skillId === skillId
          ? { ...skill, level: Number(level) }
          : skill
      )
    );
  }

  function removeSkill(skillId) {
    setSaveMessage("");
    setSkills((previous) =>
      previous.filter((skill) => skill.skillId !== skillId)
    );
  }

  function addSkill(skillId, level = newLevel) {
    if (!skillId) return;

    setSaveMessage("");

    if (skills.some((skill) => skill.skillId === skillId)) {
      setSaveMessage("This skill is already in the inventory.");
      return;
    }

    const selected = allSkills.find(
      (skill) => skill._id === skillId
    );

    if (!selected) return;

    setSkills((previous) => [
      ...previous,
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
    setSaveMessage("");
    setError("");

    try {
      const payload = {
        skills: skills.map((skill) => ({
          skillId: skill.skillId,
          level: Number(skill.level),
        })),
      };

      const response = await api.put(
        `/employees/${id}/skills`,
        payload
      );

      const updated = response.data.data;

      setProfile(updated);
      setSkills(updated.skills || []);
      setSaveMessage("Skills saved successfully.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to save skills. Please try again."
      );
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
      setMatchError(
        "Enter some text (maximum 2000 characters)."
      );
      return;
    }

    setMatching(true);

    try {
      const response = await api.post("/ai/skills/match", {
        text,
      });

      setSuggestions(response.data.data || []);
      setMatchDone(true);
    } catch (err) {
      setMatchError(
        err.response?.status === 503
          ? "AI model is not ready. Ask the backend team to run npm run ai:build."
          : err.response?.data?.message ||
            "Skill matching failed. Please try again."
      );
    } finally {
      setMatching(false);
    }
  }

  if (loading) return <Loading />;

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <ErrorBox message={error} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">

        {/* Employee header */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-indigo-600">
                Employee Profile
              </p>

              <h1 className="mt-2 text-3xl font-bold text-slate-900">
                {profile.name}
              </h1>

              <p className="mt-2 text-slate-600">
                {profile.code} | {profile.department} |{" "}
                {profile.role?.title}
              </p>
            </div>

            <Link
              to={`/employees/${id}/career`}
              className="rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Career & Mobility →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Skills", skills.length],
              ["Completed Courses", profile.learning?.completed ?? 0],
              ["Enrolled Courses", profile.learning?.enrolled ?? 0],
              ["Dropped Courses", profile.learning?.dropped ?? 0],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg bg-slate-100 p-4"
              >
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Skill inventory */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Skill Inventory
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Update employee skill levels from 1 to 5.
          </p>

          {error && (
            <div className="mt-4">
              <ErrorBox message={error} />
            </div>
          )}

          {saveMessage && (
            <p className="mt-4 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-800">
              {saveMessage}
            </p>
          )}

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3">Skill</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Level</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {skills.map((skill) => (
                  <tr key={skill.skillId}>
                    <td className="px-4 py-3 font-medium">
                      {skill.name}
                    </td>

                    <td className="px-4 py-3">
                      {skill.category}
                    </td>

                    <td className="px-4 py-3">
                      <select
                        value={skill.level}
                        onChange={(e) =>
                          updateLevel(
                            skill.skillId,
                            e.target.value
                          )
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      >
                        {LEVELS.map((level) => (
                          <option
                            key={level.value}
                            value={level.value}
                          >
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          removeSkill(skill.skillId)
                        }
                        className="font-medium text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {skills.length === 0 && (
              <p className="py-8 text-center text-slate-500">
                No skills added yet.
              </p>
            )}
          </div>

          {/* Add skill */}
          <div className="mt-6 rounded-lg bg-slate-50 p-4">
            <h3 className="font-semibold text-slate-800">
              Add Skill
            </h3>

            <div className="mt-3 flex flex-wrap gap-3">
              <select
                value={newSkillId}
                onChange={(e) =>
                  setNewSkillId(e.target.value)
                }
                className="min-w-48 flex-1 rounded-lg border border-slate-300 bg-white p-3"
              >
                <option value="">Select a skill</option>

                {allSkills
                  .filter(
                    (skill) =>
                      !skills.some(
                        (added) =>
                          added.skillId === skill._id
                      )
                  )
                  .map((skill) => (
                    <option
                      key={skill._id}
                      value={skill._id}
                    >
                      {skill.name}
                    </option>
                  ))}
              </select>

              <select
                value={newLevel}
                onChange={(e) =>
                  setNewLevel(Number(e.target.value))
                }
                className="rounded-lg border border-slate-300 bg-white p-3"
              >
                {LEVELS.map((level) => (
                  <option
                    key={level.value}
                    value={level.value}
                  >
                    {level.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!newSkillId}
                onClick={() => addSkill(newSkillId)}
                className="rounded-lg bg-slate-800 px-5 py-3 font-medium text-white disabled:opacity-50"
              >
                Add Skill
              </button>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={saveSkills}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Skills"}
            </button>
          </div>
        </section>

        {/* AI skill matching */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">
            Find Skills from Text
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Paste a project description or skills summary.
            AI will suggest matching skills.
          </p>

          <textarea
            value={skillText}
            onChange={(e) =>
              setSkillText(e.target.value)
            }
            maxLength={2000}
            rows={5}
            placeholder="Example: I developed web applications using React, Node.js, MongoDB and REST APIs."
            className="mt-4 w-full rounded-lg border border-slate-300 p-4 outline-none focus:border-indigo-500"
          />

          <p className="mt-1 text-right text-xs text-slate-500">
            {skillText.length}/2000 characters
          </p>

          <button
            type="button"
            onClick={findSkills}
            disabled={matching || !skillText.trim()}
            className="mt-3 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {matching ? "Finding skills..." : "Find Skills"}
          </button>

          {matchError && (
            <div className="mt-4">
              <ErrorBox message={matchError} />
            </div>
          )}

          {matchDone && suggestions.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              No matching skills found.
            </p>
          )}

          {suggestions.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3">Detected Phrase</th>
                    <th className="px-4 py-3">Matching Skill</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {suggestions.map((item, index) => {
                    const alreadyAdded = skills.some(
                      (skill) =>
                        skill.skillId === item.skillId
                    );

                    return (
                      <tr
                        key={`${item.skillId}-${index}`}
                      >
                        <td className="px-4 py-3">
                          {item.phrase}
                        </td>

                        <td className="px-4 py-3 font-medium">
                          {item.skillName}
                        </td>

                        <td className="px-4 py-3">
                          {(item.score * 100).toFixed(1)}%
                        </td>

                        <td className="px-4 py-3">
                          {item.method}
                        </td>

                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={alreadyAdded}
                            onClick={() =>
                              addSkill(item.skillId, 1)
                            }
                            className="font-medium text-indigo-600 disabled:text-slate-400"
                          >
                            {alreadyAdded ? "Added" : "Add"}
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
      </div>
    </div>
  );
}
