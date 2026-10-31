import { useEffect, useState } from "react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import api from "../api";
import { useAuth } from "../AuthContext";

import {
  Loading,
  ErrorBox,
  Badge,
  ScoreBar,
} from "../components/ui";

// --------------------------------------------
// Formatting Helpers
// --------------------------------------------

function validNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  const number = validNumber(value);

  if (number === null) return "—";

  return number.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });
}

// Use for API values already expressed as percentages.
function formatPercent(value) {
  const number = validNumber(value);

  return number === null
    ? "—"
    : `${formatNumber(number)}%`;
}

// Use for 0–1 readiness scores.
function formatScore(value) {
  const number = validNumber(value);

  return number === null
    ? "—"
    : `${(number * 100).toFixed(1)}%`;
}

// Accept fractional completion rates or percentages.
function formatCompletion(value) {
  const number = validNumber(value);

  if (number === null) return "—";

  const percentage =
    number >= 0 && number <= 1
      ? number * 100
      : number;

  return `${formatNumber(percentage)}%`;
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getErrorMessage(error) {
  const status = error.response?.status;
  const code = error.response?.data?.code;

  if (code === "AI_NOT_READY" || status === 503) {
    return "AI analytics are not ready. Complete the backend data setup and run npm run ai:build.";
  }

  if (status === 501) {
    return "The workforce report API has not been implemented yet.";
  }

  if (status === 404) {
    return "The workforce report endpoint is unavailable. Ask P3 to verify GET /reports/workforce.";
  }

  if (status === 401) {
    return "Your session has expired. Please log in again.";
  }

  if (status === 403) {
    return "Access denied. Only HR can access workforce reports.";
  }

  return (
    error.response?.data?.message ||
    error.message ||
    "Unable to load the workforce report."
  );
}

// --------------------------------------------
// Summary Card
// --------------------------------------------

function SummaryCard({ title, value, description }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm print:shadow-none">
      <p className="text-sm font-medium text-gray-600">
        {title}
      </p>

      <h3 className="mt-3 text-3xl font-bold text-blue-700">
        {value}
      </h3>

      {description && (
        <p className="mt-2 text-xs text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}

// --------------------------------------------
// Section Wrapper
// --------------------------------------------

function ReportSection({ title, description, children }) {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-sm text-gray-500">
            {description}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

// --------------------------------------------
// Reusable Data Table
// --------------------------------------------

function DataTable({ columns, rows, emptyMessage }) {
  const items = Array.isArray(rows) ? rows : [];

  if (items.length === 0) {
    return (
      <p className="rounded-lg bg-gray-50 p-5 text-sm text-gray-500">
        {emptyMessage || "No data available."}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[400px] text-left text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className="p-3 font-semibold text-gray-700"
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {items.map((item, index) => (
            <tr
              key={item._id || item.skillId || item.name || index}
              className="border-t hover:bg-gray-50"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="p-3 text-gray-700"
                >
                  {column.render
                    ? column.render(item)
                    : item[column.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --------------------------------------------
// Readiness Component
// --------------------------------------------

function ReadinessCard({ title, value }) {
  const number = validNumber(value);

  return (
    <div className="rounded-xl border bg-gray-50 p-5">
      <p className="font-medium text-gray-700">
        {title}
      </p>

      <h3 className="mt-3 text-2xl font-bold text-blue-700">
        {formatScore(value)}
      </h3>

      <div className="mt-4">
        {number !== null ? (
          <ScoreBar value={number} />
        ) : (
          <span className="text-sm text-gray-500">
            No readiness score available.
          </span>
        )}
      </div>
    </div>
  );
}

// --------------------------------------------
// Department Readiness Chart
// --------------------------------------------

function DepartmentChart({ departments }) {
  const items = Array.isArray(departments)
    ? departments
    : [];

  const chartData = items.map((department) => {
    const readiness = validNumber(department.readiness);

    return {
      name: department.name,
      readiness:
        readiness === null
          ? null
          : readiness * 100,
    };
  });

  if (chartData.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No department readiness data available.
      </p>
    );
  }

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 20,
            right: 20,
            left: 0,
            bottom: 45,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis
            dataKey="name"
            interval={0}
            angle={-20}
            textAnchor="end"
            height={75}
            tick={{ fontSize: 11 }}
          />

          <YAxis
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />

          <Tooltip
            formatter={(value) =>
              value == null
                ? "—"
                : [`${Number(value).toFixed(1)}%`, "Readiness"]
            }
          />

          <Bar
            dataKey="readiness"
            name="Department Readiness"
            fill="#2563eb"
            radius={[5, 5, 0, 0]}
            maxBarSize={75}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// --------------------------------------------
// Main Report Page
// --------------------------------------------

export default function ReportPage() {
  const { isHR } = useAuth();

  const [report, setReport] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  // ------------------------------------------
  // RP1: GET /reports/workforce
  // ------------------------------------------

  useEffect(() => {
    if (!isHR) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadReport() {
      setLoading(true);
      setError("");
      setReport(null);

      try {
        const response = await api.get(
          "/reports/workforce"
        );

        if (!active) return;

        const data = response.data.data;

        if (
          !data ||
          typeof data !== "object" ||
          Array.isArray(data)
        ) {
          throw new Error(
            "Invalid workforce report response."
          );
        }

        setReport(data);
      } catch (err) {
        if (active) {
          setReport(null);
          setError(getErrorMessage(err));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => {
      active = false;
    };
  }, [isHR, refreshKey]);

  // ------------------------------------------
  // Refresh Report
  // ------------------------------------------

  function refreshReport() {
    setRefreshKey((previous) => previous + 1);
  }

  // ------------------------------------------
  // Print / Save PDF
  // ------------------------------------------

  function printReport() {
    window.print();
  }

  // ------------------------------------------
  // HR Access Control
  // ------------------------------------------

  if (!isHR) {
    return (
      <main className="mx-auto max-w-6xl p-6">
        <ErrorBox
          message="Access denied. Workforce reports are available only to HR."
        />
      </main>
    );
  }

  // ------------------------------------------
  // Loading and Errors
  // ------------------------------------------

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <Loading />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <ErrorBox message={error} />

        <button
          type="button"
          onClick={refreshReport}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white print:hidden"
        >
          Try Again
        </button>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <p>No workforce report available.</p>
      </main>
    );
  }

  // ------------------------------------------
  // Extract Report Data
  // ------------------------------------------

  const workforce = report.workforce || {};

  const readiness = report.readiness || {};

  const risk = report.risk || {};

  const reviews = report.reviews || {};

  const learning = report.learning || {};

  const forecastQuality = report.forecastQuality || {};

  const trends = report.trends || {};

  const departments = Array.isArray(report.departments)
    ? report.departments
    : [];

  const topGaps = Array.isArray(report.topGaps)
    ? report.topGaps
    : [];

  const emerging = Array.isArray(trends.emerging)
    ? trends.emerging
    : [];

  const declining = Array.isArray(trends.declining)
    ? trends.declining
    : [];

  const topRisks = Array.isArray(risk.top)
    ? risk.top
    : [];

  // ------------------------------------------
  // Render Report
  // ------------------------------------------

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6 print:max-w-none print:space-y-5 print:p-0">

      {/* ==================================== */}
      {/* HEADER */}
      {/* ==================================== */}

      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-6">

        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Workforce Analytics Report
          </h1>

          <p className="mt-2 text-gray-600">
            Organization-wide workforce insights,
            skill readiness, risks, and future demand.
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Generated: {formatDate(report.generatedAt)}
          </p>

          <div className="mt-3">
            <Badge
              text={
                report.dataSource === "synthetic"
                  ? "Synthetic data"
                  : `Source: ${report.dataSource || "Unknown"}`
              }
              color="yellow"
            />
          </div>
        </div>

        {/* ACTION BUTTONS */}

        <div className="flex flex-wrap gap-3 print:hidden">

          <button
            type="button"
            onClick={refreshReport}
            className="rounded-lg border border-gray-300 bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh Report
          </button>

          <button
            type="button"
            onClick={printReport}
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            Print / Save PDF
          </button>

        </div>
      </header>

      {/* ==================================== */}
      {/* WORKFORCE OVERVIEW */}
      {/* ==================================== */}

      <section>
        <h2 className="mb-5 text-2xl font-bold">
          1. Workforce Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          <SummaryCard
            title="Total Employees"
            value={formatNumber(workforce.employees)}
            description="Employees in the workforce dataset"
          />

          <SummaryCard
            title="Departments"
            value={formatNumber(workforce.departments)}
            description="Number of organizational departments"
          />

          <SummaryCard
            title="Average Skills per Employee"
            value={formatNumber(
              workforce.avgSkillsPerEmployee
            )}
            description="Average recorded skills per employee"
          />

        </div>
      </section>

      {/* ==================================== */}
      {/* WORKFORCE READINESS */}
      {/* ==================================== */}

      <ReportSection
        title="2. Workforce Readiness"
        description="Current skill readiness compared with future workforce requirements."
      >

        <div className="grid gap-5 sm:grid-cols-2">

          <ReadinessCard
            title="Current Workforce Readiness"
            value={readiness.current}
          />

          <ReadinessCard
            title="Future Workforce Readiness"
            value={readiness.future}
          />

        </div>

      </ReportSection>

      {/* ==================================== */}
      {/* TOP SKILL GAPS */}
      {/* ==================================== */}

      <ReportSection
        title="3. Organization Skill Gaps"
        description="Skills with the highest number of employees requiring improvement."
      >

        <DataTable
          rows={topGaps}
          emptyMessage="No organization skill gap data available."
          columns={[
            {
              key: "skillName",
              label: "Skill",
            },
            {
              key: "employees",
              label: "Employees with Gap",
              render: (item) =>
                formatNumber(item.employees),
            },
          ]}
        />

      </ReportSection>

      {/* ==================================== */}
      {/* MARKET TRENDS */}
      {/* ==================================== */}

      <ReportSection
        title="4. Market Skill Trends"
        description="Emerging and declining technologies identified by market-demand analysis."
      >

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Emerging */}

          <div>
            <div className="mb-4">
              <Badge
                text="Emerging Skills"
                color="green"
              />
            </div>

            <DataTable
              rows={emerging}
              emptyMessage="No emerging skills available."
              columns={[
                {
                  key: "skillName",
                  label: "Skill",
                },
                {
                  key: "growthPct",
                  label: "Growth",
                  render: (item) =>
                    formatPercent(item.growthPct),
                },
              ]}
            />
          </div>

          {/* Declining */}

          <div>
            <div className="mb-4">
              <Badge
                text="Declining Skills"
                color="red"
              />
            </div>

            <DataTable
              rows={declining}
              emptyMessage="No declining skills available."
              columns={[
                {
                  key: "skillName",
                  label: "Skill",
                },
                {
                  key: "growthPct",
                  label: "Growth",
                  render: (item) =>
                    formatPercent(item.growthPct),
                },
              ]}
            />
          </div>

        </div>

      </ReportSection>

      {/* ==================================== */}
      {/* WORKFORCE RISK */}
      {/* ==================================== */}

      <ReportSection
        title="5. Workforce Risk Analysis"
        description="Skill shortage risks based on forecast demand and available workforce supply."
      >

        <div className="mb-6 grid gap-4 sm:grid-cols-3">

          <SummaryCard
            title="High Risk"
            value={formatNumber(risk.high)}
          />

          <SummaryCard
            title="Medium Risk"
            value={formatNumber(risk.medium)}
          />

          <SummaryCard
            title="Low Risk"
            value={formatNumber(risk.low)}
          />

        </div>

        <h3 className="mb-4 text-lg font-semibold">
          Highest Risk Skills
        </h3>

        <DataTable
          rows={topRisks}
          emptyMessage="No high-risk skill details available."
          columns={[
            {
              key: "skillName",
              label: "Skill",
            },
            {
              key: "riskScore",
              label: "Risk Score",
              render: (item) => {
                const score = validNumber(item.riskScore);

                return score === null ? (
                  "—"
                ) : (
                  <ScoreBar value={score} />
                );
              },
            },
          ]}
        />

      </ReportSection>

      {/* ==================================== */}
      {/* DEPARTMENT ANALYTICS */}
      {/* ==================================== */}

      <ReportSection
        title="6. Department Readiness"
        description="Comparison of workforce skill readiness across departments."
      >

        <DepartmentChart
          departments={departments}
        />

        <div className="mt-7">

          <h3 className="mb-4 text-lg font-semibold">
            Department Details
          </h3>

          <DataTable
            rows={departments}
            emptyMessage="No department analytics available."
            columns={[
              {
                key: "name",
                label: "Department",
              },
              {
                key: "employees",
                label: "Employees",
                render: (item) =>
                  formatNumber(item.employees),
              },
              {
                key: "readiness",
                label: "Readiness",
                render: (item) => {
                  const score = validNumber(item.readiness);

                  return score === null ? (
                    "—"
                  ) : (
                    <ScoreBar value={score} />
                  );
                },
              },
            ]}
          />

        </div>

      </ReportSection>

      {/* ==================================== */}
      {/* LEARNING ANALYTICS */}
      {/* ==================================== */}

      <ReportSection
        title="7. Learning & Development"
        description="Employee learning activity and training completion."
      >

        <div className="grid gap-4 sm:grid-cols-2">

          <SummaryCard
            title="Learning Records"
            value={formatNumber(learning.records)}
            description="Recorded learning activities"
          />

          <SummaryCard
            title="Completion Rate"
            value={formatCompletion(
              learning.completionRate
            )}
            description="Reported training completion rate"
          />

        </div>

      </ReportSection>

      {/* ==================================== */}
      {/* HR REVIEW ANALYTICS */}
      {/* ==================================== */}

      <ReportSection
        title="8. HR Review Status"
        description="Overview of workforce recommendations and review decisions."
      >

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <SummaryCard
            title="Pending Reviews"
            value={formatNumber(reviews.pending)}
          />

          <SummaryCard
            title="Approved Reviews"
            value={formatNumber(reviews.approved)}
          />

          <SummaryCard
            title="Rejected Reviews"
            value={formatNumber(reviews.rejected)}
          />

          <SummaryCard
            title="Modified Reviews"
            value={formatNumber(reviews.modified)}
          />

        </div>

      </ReportSection>

      {/* ==================================== */}
      {/* FORECAST QUALITY */}
      {/* ==================================== */}

      <ReportSection
        title="9. Forecast Model Quality"
        description="Forecast error metrics compared against the naive baseline."
      >

        <div className="grid gap-4 sm:grid-cols-3">

          <SummaryCard
            title="Average Model MAPE"
            value={formatPercent(
              forecastQuality.avgMape
            )}
            description="Mean Absolute Percentage Error"
          />

          <SummaryCard
            title="Average Naive MAPE"
            value={formatPercent(
              forecastQuality.avgNaiveMape
            )}
            description="Baseline forecasting error"
          />

          <SummaryCard
            title="Forecasts Beating Naive"
            value={formatPercent(
              forecastQuality.pctBeatNaive
            )}
            description="Percentage outperforming baseline"
          />

        </div>

        <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">

          <p className="text-sm text-blue-800">
            <strong>Forecast interpretation:</strong>{" "}
            A lower MAPE indicates a smaller forecasting
            error. Comparing model MAPE with naive MAPE
            helps evaluate whether the forecasting method
            provides an improvement over the baseline.
          </p>

        </div>

      </ReportSection>

      {/* ==================================== */}
      {/* REPORT FOOTER */}
      {/* ==================================== */}

      <footer className="border-t pt-5 text-sm text-gray-500">

        <p className="font-semibold">
          SkillSight — Workforce Analytics Report
        </p>

        <p className="mt-2">
          Generated: {formatDate(report.generatedAt)}
        </p>

        <p className="mt-2">
          Data source: {report.dataSource || "Unknown"}
        </p>

        <p className="mt-2">
          This report contains synthetic workforce data
          for demonstration purposes.
        </p>

      </footer>

    </main>
  );
}