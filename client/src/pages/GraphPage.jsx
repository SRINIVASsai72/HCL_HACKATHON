import { useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";

import api from "../api";
import { useAuth } from "../AuthContext";

import {
  Loading,
  ErrorBox,
  Badge,
} from "../components/ui";

// ----------------------------------------
// Node Configuration
// ----------------------------------------

const NODE_COLORS = {
  employee: "#2563eb",
  skill: "#16a34a",
  role: "#9333ea",
  project: "#ea580c",
  course: "#dc2626",
};

const NODE_TYPES = [
  { type: "employee", label: "Employee" },
  { type: "skill", label: "Skill" },
  { type: "role", label: "Job Role" },
  { type: "project", label: "Project" },
  { type: "course", label: "Course" },
];

// ----------------------------------------
// Error Helper
// ----------------------------------------

function getErrorMessage(error) {
  const status = error.response?.status;
  const code = error.response?.data?.code;

  if (code === "AI_NOT_READY" || status === 503) {
    return "Required graph data is not ready. Complete backend data setup first.";
  }

  if (status === 501) {
    return "This graph API has not been implemented yet.";
  }

  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "Access denied. Only HR can view the knowledge graph.";
  }

  if (status === 404) {
    return "The requested employee or skill was not found.";
  }

  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong."
  );
}

// ----------------------------------------
// Graph Legend
// ----------------------------------------

function GraphLegend() {
  return (
    <div className="flex flex-wrap gap-5">
      {NODE_TYPES.map((item) => (
        <div
          key={item.type}
          className="flex items-center gap-2"
        >
          <span
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: NODE_COLORS[item.type],
            }}
          />

          <span className="text-sm text-gray-600">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ----------------------------------------
// Graph Summary Card
// ----------------------------------------

function SummaryCard({ title, value }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-600">
        {title}
      </p>

      <h3 className="mt-3 text-3xl font-bold text-blue-700">
        {value ?? "—"}
      </h3>
    </div>
  );
}

// ----------------------------------------
// Graph Visualization
// ----------------------------------------

function KnowledgeGraph({ data, onSkillClick }) {
  const [container, setContainer] = useState(null);
  const [width, setWidth] = useState(900);

  // Automatically adjust graph width
  useEffect(() => {
    if (!container) return;

    function updateWidth() {
      const availableWidth =
        container.getBoundingClientRect().width;

      setWidth(Math.max(280, Math.floor(availableWidth)));
    }

    updateWidth();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(container);

      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);

    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, [container]);

  function handleNodeClick(node) {
    if (
      node.type !== "skill" ||
      typeof node.id !== "string" ||
      !node.id.startsWith("skill:")
    ) {
      return;
    }

    // Graph ID format: skill:<mongoId>
    const skillId = node.id.slice("skill:".length);

    if (skillId) {
      onSkillClick(skillId);
    }
  }

  function getNodeColor(node) {
    return NODE_COLORS[node.type] || "#64748b";
  }

  function getNodeLabel(node) {
    return `${node.label || node.id} (${node.type})`;
  }

  function getLinkLabel(link) {
    // Relationship labels come directly from the API.
    return link.label || "";
  }

  const nodes = Array.isArray(data?.nodes)
    ? data.nodes
    : [];

  const links = Array.isArray(data?.links)
    ? data.links
    : [];

  if (nodes.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 p-10 text-center">
        <h3 className="font-semibold text-gray-800">
          No Graph Data Available
        </h3>

        <p className="mt-2 text-sm text-gray-500">
          There are no relationships to display for
          this selection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4">
        <GraphLegend />
      </div>

      <div
        ref={setContainer}
        className="w-full overflow-hidden rounded-xl border bg-white"
      >
        <ForceGraph2D
          graphData={data}
          width={width}
          height={550}

          // Node appearance
          nodeColor={getNodeColor}
          nodeLabel={getNodeLabel}
          nodeRelSize={7}

          // Link appearance
          linkColor={() => "#94a3b8"}
          linkWidth={1.5}
          linkLabel={getLinkLabel}

          // Directed relationships
          linkDirectionalArrowLength={4}
          linkDirectionalArrowRelPos={1}

          // Physics
          cooldownTicks={100}
          warmupTicks={20}

          // Interaction
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          onNodeClick={handleNodeClick}

          backgroundColor="#ffffff"
        />
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>How to interact:</strong> Drag nodes to
          explore relationships. Scroll to zoom and drag the
          background to move around. Hover over nodes or
          connections to view their labels. Click a green
          skill node to explore that skill's connections.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <span>
          Displayed Nodes: <strong>{nodes.length}</strong>
        </span>

        <span>
          Displayed Connections: <strong>{links.length}</strong>
        </span>
      </div>
    </div>
  );
}

// ----------------------------------------
// Graph Statistics
// ----------------------------------------

function GraphStatistics({ stats, onSkillClick }) {
  const topSkills = Array.isArray(stats?.topSkills)
    ? stats.topSkills.slice(0, 10)
    : [];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">
          Graph Statistics
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Organization-wide knowledge graph statistics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          title="Total Graph Nodes"
          value={stats?.nodes}
        />

        <SummaryCard
          title="Total Relationships"
          value={stats?.links}
        />
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">
          Top 10 Most Connected Skills
        </h3>

        {topSkills.length === 0 ? (
          <p className="text-sm text-gray-500">
            No skill connection statistics available.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Rank</th>
                  <th className="p-3">Skill</th>
                  <th className="p-3">Connections</th>
                </tr>
              </thead>

              <tbody>
                {topSkills.map((skill, index) => (
                  <tr
                    key={skill.skillId || index}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-3 font-medium">
                      {index + 1}
                    </td>

                    <td className="p-3">
                      <button
                        type="button"
                        disabled={!skill.skillId}
                        onClick={() =>
                          onSkillClick(skill.skillId)
                        }
                        className="font-medium text-blue-700 hover:underline disabled:text-gray-500"
                      >
                        {skill.name}
                      </button>
                    </td>

                    <td className="p-3">
                      {skill.connections ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

// ----------------------------------------
// Main Graph Page
// ----------------------------------------

export default function GraphPage() {
  const { isHR } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [skills, setSkills] = useState([]);

  const [selectedEmployeeId, setSelectedEmployeeId] =
    useState("");

  const [selectedSkillId, setSelectedSkillId] =
    useState("");

  const [graphMode, setGraphMode] =
    useState("employee");

  const [graphData, setGraphData] = useState(null);
  const [stats, setStats] = useState(null);

  const [catalogLoading, setCatalogLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  const [employeeError, setEmployeeError] = useState("");
  const [skillError, setSkillError] = useState("");
  const [graphError, setGraphError] = useState("");
  const [statsError, setStatsError] = useState("");

  // ----------------------------------------
  // E1: GET /employees
  // E4: GET /skills
  // ----------------------------------------

  useEffect(() => {
    if (!isHR) {
      setCatalogLoading(false);
      return;
    }

    let active = true;

    async function loadCatalogs() {
      setCatalogLoading(true);
      setEmployeeError("");
      setSkillError("");

      const results = await Promise.allSettled([
        api.get("/employees"),
        api.get("/skills"),
      ]);

      if (!active) return;

      const employeeResult = results[0];
      const skillResult = results[1];

      if (employeeResult.status === "fulfilled") {
        const data = employeeResult.value.data.data;

        const employeeList = Array.isArray(data)
          ? data
          : [];

        setEmployees(employeeList);

        setSelectedEmployeeId((previous) =>
          employeeList.some((item) => item._id === previous)
            ? previous
            : employeeList[0]?._id || ""
        );
      } else {
        setEmployees([]);
        setEmployeeError(
          getErrorMessage(employeeResult.reason)
        );
      }

      if (skillResult.status === "fulfilled") {
        const data = skillResult.value.data.data;

        const skillList = Array.isArray(data)
          ? data
          : [];

        setSkills(skillList);

        setSelectedSkillId((previous) =>
          previous || skillList[0]?._id || ""
        );
      } else {
        setSkills([]);
        setSkillError(
          getErrorMessage(skillResult.reason)
        );
      }

      setCatalogLoading(false);
    }

    loadCatalogs();

    return () => {
      active = false;
    };
  }, [isHR]);

  // ----------------------------------------
  // G3: GET /graph/stats
  // ----------------------------------------

  useEffect(() => {
    if (!isHR) {
      setStatsLoading(false);
      return;
    }

    let active = true;

    async function loadStats() {
      setStatsLoading(true);
      setStatsError("");

      try {
        const response = await api.get("/graph/stats");

        if (active) {
          setStats(response.data.data);
        }
      } catch (error) {
        if (active) {
          setStats(null);
          setStatsError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setStatsLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      active = false;
    };
  }, [isHR]);

  // ----------------------------------------
  // G1: GET /graph/employee/:id
  // G2: GET /graph/skill/:id
  // ----------------------------------------

  useEffect(() => {
    if (!isHR) {
      setGraphLoading(false);
      return;
    }

    const selectedId =
      graphMode === "employee"
        ? selectedEmployeeId
        : selectedSkillId;

    if (!selectedId) {
      setGraphData(null);
      setGraphError("");
      setGraphLoading(false);
      return;
    }

    let active = true;

    async function loadGraph() {
      setGraphLoading(true);
      setGraphError("");
      setGraphData(null);

      try {
        const endpoint =
          graphMode === "employee"
            ? `/graph/employee/${selectedId}`
            : `/graph/skill/${selectedId}`;

        const response = await api.get(endpoint);

        if (!active) return;

        const data = response.data.data;

        if (
          !data ||
          !Array.isArray(data.nodes) ||
          !Array.isArray(data.links)
        ) {
          throw new Error(
            "Unexpected graph response format from the server."
          );
        }

        // Create local copies because ForceGraph2D may
        // modify link source/target objects internally.
        const safeData = {
          nodes: data.nodes.map((node) => ({
            ...node,
          })),

          links: data.links.map((link) => ({
            ...link,
          })),
        };

        setGraphData(safeData);
      } catch (error) {
        if (active) {
          setGraphData(null);
          setGraphError(getErrorMessage(error));
        }
      } finally {
        if (active) {
          setGraphLoading(false);
        }
      }
    }

    loadGraph();

    return () => {
      active = false;
    };
  }, [
    isHR,
    graphMode,
    selectedEmployeeId,
    selectedSkillId,
  ]);

  // ----------------------------------------
  // Navigation
  // ----------------------------------------

  function handleEmployeeChange(event) {
    setSelectedEmployeeId(event.target.value);
    setGraphMode("employee");
  }

  function handleSkillChange(event) {
    setSelectedSkillId(event.target.value);
    setGraphMode("skill");
  }

  function handleSkillClick(skillId) {
    if (!skillId) return;

    setSelectedSkillId(skillId);
    setGraphMode("skill");
  }

  // ----------------------------------------
  // HR Access
  // ----------------------------------------

  if (!isHR) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <ErrorBox
          message="Access denied. The Skills Knowledge Graph is available only to HR."
        />
      </main>
    );
  }

  // ----------------------------------------
  // Render
  // ----------------------------------------

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">

      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Skills Knowledge Graph
          </h1>

          <p className="mt-2 text-gray-600">
            Explore how employees, skills, roles,
            projects, and learning resources are connected.
          </p>
        </div>

        <Badge text="Synthetic data" color="yellow" />
      </header>

      {/* GRAPH FILTERS */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="mb-5">
          <h2 className="text-xl font-semibold">
            Explore Relationships
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Select an employee or skill to visualize
            its knowledge network.
          </p>
        </div>

        {catalogLoading ? (
          <Loading />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">

            {/* Employee Selector */}
            <div>
              <label
                htmlFor="employeeSelect"
                className="mb-2 block font-medium"
              >
                Select Employee
              </label>

              <select
                id="employeeSelect"
                value={
                  graphMode === "employee"
                    ? selectedEmployeeId
                    : ""
                }
                onChange={handleEmployeeChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              >
                <option value="">
                  Select an employee
                </option>

                {employees.map((employee) => (
                  <option
                    key={employee._id}
                    value={employee._id}
                  >
                    {employee.name} ({employee.code})
                  </option>
                ))}
              </select>

              {employeeError && (
                <div className="mt-3">
                  <ErrorBox message={employeeError} />
                </div>
              )}
            </div>

            {/* Skill Selector */}
            <div>
              <label
                htmlFor="skillSelect"
                className="mb-2 block font-medium"
              >
                Select Skill
              </label>

              <select
                id="skillSelect"
                value={
                  graphMode === "skill"
                    ? selectedSkillId
                    : ""
                }
                onChange={handleSkillChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
              >
                <option value="">
                  Select a skill
                </option>

                {skills.map((skill) => (
                  <option
                    key={skill._id}
                    value={skill._id}
                  >
                    {skill.name}
                  </option>
                ))}
              </select>

              {skillError && (
                <div className="mt-3">
                  <ErrorBox message={skillError} />
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ACTIVE GRAPH */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              Interactive Knowledge Graph
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              {graphMode === "employee"
                ? "Showing employee relationships"
                : "Showing skill relationships"}
            </p>
          </div>

          <Badge
            text={
              graphMode === "employee"
                ? "Employee Graph"
                : "Skill Graph"
            }
            color="blue"
          />
        </div>

        {graphLoading ? (
          <Loading />
        ) : graphError ? (
          <ErrorBox message={graphError} />
        ) : !graphData ? (
          <div className="rounded-lg bg-gray-50 p-10 text-center">
            <p className="text-gray-500">
              Select an employee or skill to explore
              its connections.
            </p>
          </div>
        ) : (
          <KnowledgeGraph
            data={graphData}
            onSkillClick={handleSkillClick}
          />
        )}
      </section>

      {/* GRAPH STATISTICS */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">
        {statsLoading ? (
          <Loading />
        ) : statsError ? (
          <ErrorBox message={statsError} />
        ) : !stats ? (
          <p className="text-gray-500">
            Graph statistics are not available.
          </p>
        ) : (
          <GraphStatistics
            stats={stats}
            onSkillClick={handleSkillClick}
          />
        )}
      </section>

    </main>
  );
}