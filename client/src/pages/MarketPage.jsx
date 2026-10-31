import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Area,
  Line,
} from "recharts";

import api from "../api";
import { useAuth } from "../AuthContext";
import {
  Loading,
  ErrorBox,
  Badge,
  ExplainBox,
} from "../components/ui";

const CATEGORIES = [
  "language",
  "frontend",
  "backend",
  "data",
  "ai_ml",
  "cloud_devops",
  "testing",
  "embedded",
];

function formatNumber(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("en-IN", { maximumFractionDigits: 2 })
    : "—";
}

function formatPercent(value) {
  return formatNumber(value) === "—"
    ? "—"
    : `${formatNumber(value)}%`;
}

function getError(error) {
  const status = error.response?.status;
  const code = error.response?.data?.code;

  if (status === 503 || code === "AI_NOT_READY") {
    return "AI data is not ready. The backend team must run npm run ai:build.";
  }

  if (status === 501) {
    return "This API has not been implemented yet.";
  }

  if (status === 401) {
    return "Session expired. Please log in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  return error.response?.data?.message || error.message;
}

function TrendBadge({ trend }) {
  const colors = {
    emerging: "blue",
    growing: "green",
    stable: "gray",
    declining: "red",
  };

  return <Badge text={trend || "unknown"} color={colors[trend] || "gray"} />;
}

function prepareChartData(detail) {
  if (!detail) return [];

  const history = (detail.history || []).map((item) => ({
    month: item.month,
    historical: item.value,
    predicted: null,
    bandBase: null,
    bandHeight: null,
    low: null,
    high: null,
  }));

  const predictions = (detail.predictions || []).map((item) => ({
    month: item.month,
    historical: null,
    predicted: item.value,
    bandBase: item.low,
    bandHeight: Math.max(0, item.high - item.low),
    low: item.low,
    high: item.high,
  }));

  if (history.length && predictions.length) {
    history[history.length - 1].predicted =
      history[history.length - 1].historical;
  }

  return [...history, ...predictions];
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="rounded-lg border bg-white p-3 shadow">
      <p className="font-semibold">{label}</p>
      {item.historical != null && (
        <p>Historical: {formatNumber(item.historical)}</p>
      )}
      {item.predicted != null && (
        <p>Forecast: {formatNumber(item.predicted)}</p>
      )}
      {item.low != null && item.high != null && (
        <p>
          Range: {formatNumber(item.low)} – {formatNumber(item.high)}
        </p>
      )}
    </div>
  );
}

export default function MarketPage() {
  const { isHR } = useAuth();

  const [category, setCategory] = useState("");
  const [trends, setTrends] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [detail, setDetail] = useState(null);
  const [evaluation, setEvaluation] = useState(null);

  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingForecasts, setLoadingForecasts] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingEvaluation, setLoadingEvaluation] = useState(true);
  const [running, setRunning] = useState(false);

  const [trendError, setTrendError] = useState("");
  const [forecastError, setForecastError] = useState("");
  const [detailError, setDetailError] = useState("");
  const [evaluationError, setEvaluationError] = useState("");
  const [runError, setRunError] = useState("");

  const [runSummary, setRunSummary] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sortDescending, setSortDescending] = useState(true);

  // M1: Market trends
  useEffect(() => {
    let active = true;

    async function loadTrends() {
      setLoadingTrends(true);
      setTrendError("");

      try {
        const response = await api.get("/market/trends", {
          params: category ? { category } : {},
        });

        if (active) setTrends(response.data.data || []);
      } catch (error) {
        if (active) {
          setTrends([]);
          setTrendError(getError(error));
        }
      } finally {
        if (active) setLoadingTrends(false);
      }
    }

    loadTrends();
    return () => { active = false; };
  }, [category, refreshKey]);

  // M2: All forecasts
  useEffect(() => {
    let active = true;

    async function loadForecasts() {
      setLoadingForecasts(true);
      setForecastError("");

      try {
        const response = await api.get("/market/forecasts");
        if (!active) return;

        const results = response.data.data || [];
        setForecasts(results);

        setSelectedSkillId((previous) =>
          results.some((item) => item.skillId === previous)
            ? previous
            : results[0]?.skillId || ""
        );
      } catch (error) {
        if (active) {
          setForecasts([]);
          setSelectedSkillId("");
          setForecastError(getError(error));
        }
      } finally {
        if (active) setLoadingForecasts(false);
      }
    }

    loadForecasts();
    return () => { active = false; };
  }, [refreshKey]);

  // M3: Selected forecast
  useEffect(() => {
    if (!selectedSkillId) {
      setDetail(null);
      setDetailError("");
      setLoadingDetail(false);
      return;
    }

    let active = true;

    async function loadDetail() {
      setLoadingDetail(true);
      setDetailError("");
      setDetail(null);

      try {
        const response = await api.get(
          `/market/forecasts/${selectedSkillId}`
        );

        if (active) setDetail(response.data.data);
      } catch (error) {
        if (active) {
          setDetail(null);
          setDetailError(getError(error));
        }
      } finally {
        if (active) setLoadingDetail(false);
      }
    }

    loadDetail();
    return () => { active = false; };
  }, [selectedSkillId, refreshKey]);

  // M5: Evaluation
  useEffect(() => {
    let active = true;

    async function loadEvaluation() {
      setLoadingEvaluation(true);
      setEvaluationError("");

      try {
        const response = await api.get("/market/evaluation");

        if (active) setEvaluation(response.data.data);
      } catch (error) {
        if (active) {
          setEvaluation(null);
          setEvaluationError(getError(error));
        }
      } finally {
        if (active) setLoadingEvaluation(false);
      }
    }

    loadEvaluation();
    return () => { active = false; };
  }, [refreshKey]);

  // M4: HR forecast computation
  async function runForecasts() {
    if (!isHR || running) return;

    setRunning(true);
    setRunError("");
    setRunSummary(null);

    try {
      const response = await api.post("/market/forecasts/run");
      setRunSummary(response.data.data);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setRunError(getError(error));
    } finally {
      setRunning(false);
    }
  }

  const sortedForecasts = [...forecasts].sort((a, b) =>
    sortDescending
      ? b.growthPct - a.growthPct
      : a.growthPct - b.growthPct
  );

  const chartData = prepareChartData(detail);

  return (
    <main className="mx-auto max-w-7xl space-y-8 p-6">

      {/* HEADER */}
      <header>
        <h1 className="text-3xl font-bold text-gray-900">
          Market Trends & Forecasting
        </h1>

        <p className="mt-2 text-gray-600">
          Analyze emerging skills, workforce demand, and future trends.
        </p>

        <div className="mt-3">
          <Badge text="Synthetic data" color="yellow" />
        </div>
      </header>

      {/* MARKET TRENDS */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Market Skill Trends</h2>

          <div className="flex items-center gap-3">
            <Badge text="Synthetic data" color="yellow" />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border px-3 py-2"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loadingTrends ? (
          <Loading />
        ) : trendError ? (
          <ErrorBox message={trendError} />
        ) : trends.length === 0 ? (
          <p className="text-gray-500">No market trends available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Skill</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Demand</th>
                  <th className="p-3">Growth</th>
                  <th className="p-3">Trend</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>

              <tbody>
                {trends.map((item) => (
                  <tr key={item.skillId} className="border-t">
                    <td className="p-3 font-medium">{item.skillName}</td>
                    <td className="p-3">{item.category}</td>
                    <td className="p-3">{formatNumber(item.latest)}</td>
                    <td className="p-3">{formatPercent(item.growthPct)}</td>
                    <td className="p-3">
                      <TrendBadge trend={item.trend} />
                    </td>
                    <td className="p-3">{item.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FORECAST LIST */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            Skill Demand Forecasts
          </h2>

          <div className="flex flex-wrap items-center gap-3">
            <Badge text="Synthetic data" color="yellow" />

            <button
              onClick={() => setSortDescending(!sortDescending)}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Growth: {sortDescending ? "High to Low" : "Low to High"}
            </button>

            {isHR && (
              <button
                onClick={runForecasts}
                disabled={running}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
              >
                {running ? "Running..." : "Run Forecasts"}
              </button>
            )}
          </div>
        </div>

        {runError && <ErrorBox message={runError} />}

        {runSummary && (
          <div className="mb-4 rounded-lg bg-green-50 p-4">
            <p className="font-semibold text-green-800">
              Forecast computation completed
            </p>
            <p>Forecast count: {formatNumber(runSummary.count)}</p>
            <p>Average MAPE: {formatPercent(runSummary.avgMape)}</p>
            <p>Naive MAPE: {formatPercent(runSummary.avgNaiveMape)}</p>
            <p>Beat baseline: {formatPercent(runSummary.pctBeatNaive)}</p>
          </div>
        )}

        {loadingForecasts ? (
          <Loading />
        ) : forecastError ? (
          <ErrorBox message={forecastError} />
        ) : sortedForecasts.length === 0 ? (
          <p className="text-gray-500">No forecasts available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3">Skill</th>
                  <th className="p-3">Last Value</th>
                  <th className="p-3">Next Year</th>
                  <th className="p-3">Growth</th>
                  <th className="p-3">Trend</th>
                  <th className="p-3">MAPE</th>
                </tr>
              </thead>

              <tbody>
                {sortedForecasts.map((item) => (
                  <tr
                    key={item.skillId}
                    className={
                      selectedSkillId === item.skillId
                        ? "border-t bg-blue-50"
                        : "border-t hover:bg-gray-50"
                    }
                  >
                    <td className="p-3">
                      <button
                        onClick={() => setSelectedSkillId(item.skillId)}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {item.skillName}
                      </button>
                    </td>
                    <td className="p-3">{formatNumber(item.lastValue)}</td>
                    <td className="p-3">{formatNumber(item.nextYearValue)}</td>
                    <td className="p-3">{formatPercent(item.growthPct)}</td>
                    <td className="p-3">
                      <TrendBadge trend={item.trend} />
                    </td>
                    <td className="p-3">{formatPercent(item.mape)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* FORECAST CHART */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Historical Demand & Future Forecast
          </h2>
          <Badge text="Synthetic data" color="yellow" />
        </div>

        {loadingDetail ? (
          <Loading />
        ) : detailError ? (
          <ErrorBox message={detailError} />
        ) : !detail ? (
          <p className="text-gray-500">
            Select a skill to view its forecast.
          </p>
        ) : (
          <>
            <h3 className="mb-4 text-lg font-semibold">
              {detail.skillName}
            </h3>

            {chartData.length === 0 ? (
              <p>No chart data available.</p>
            ) : (
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11 }}
                      minTickGap={25}
                    />

                    <YAxis domain={[0, "auto"]} />

                    <Tooltip content={<ForecastTooltip />} />

                    <Legend />

                    {/* Correct stacked low-high forecast band */}
                    <Area
                      dataKey="bandBase"
                      stackId="band"
                      stroke="none"
                      fill="transparent"
                      fillOpacity={0}
                      legendType="none"
                      tooltipType="none"
                    />

                    <Area
                      dataKey="bandHeight"
                      stackId="band"
                      name="Approximate Forecast Range"
                      stroke="none"
                      fill="#93c5fd"
                      fillOpacity={0.35}
                    />

                    <Line
                      dataKey="historical"
                      name="Historical Demand"
                      stroke="#2563eb"
                      strokeWidth={3}
                      dot={false}
                    />

                    <Line
                      dataKey="predicted"
                      name="Forecast Demand"
                      stroke="#f97316"
                      strokeWidth={3}
                      strokeDasharray="6 4"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            <p className="mt-3 text-sm text-gray-500">
              Solid line represents historical demand. Dashed line
              represents predicted demand. Shaded area shows the
              approximate forecast low–high range.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <div className="rounded-lg bg-gray-50 p-4">
                <p>Growth</p>
                <h3 className="text-xl font-bold">
                  {formatPercent(detail.growthPct)}
                </h3>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p>Model MAPE</p>
                <h3 className="text-xl font-bold">
                  {formatPercent(detail.metrics?.mape)}
                </h3>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p>Naive MAPE</p>
                <h3 className="text-xl font-bold">
                  {formatPercent(detail.metrics?.naiveMape)}
                </h3>
              </div>

              <div className="rounded-lg bg-gray-50 p-4">
                <p>Beats Naive Baseline</p>
                <h3 className="text-xl font-bold">
                  {detail.metrics?.beatsNaive === true
                    ? "Yes"
                    : detail.metrics?.beatsNaive === false
                      ? "No"
                      : "—"}
                </h3>
              </div>
            </div>

            {detail.explanation && (
              <div className="mt-6">
                <ExplainBox explanation={detail.explanation} />
              </div>
            )}

            <p className="mt-4 text-sm text-gray-500">
              Forecast method: {detail.method} |
              Source: {detail.source}
            </p>
          </>
        )}
      </section>

      {/* EVALUATION */}
      <section className="rounded-xl border bg-white p-5 shadow-sm">

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            Model Evaluation
          </h2>
          <Badge text="Synthetic data" color="yellow" />
        </div>

        {loadingEvaluation ? (
          <Loading />
        ) : evaluationError ? (
          <ErrorBox message={evaluationError} />
        ) : evaluation === null ? (
          <p className="rounded-lg bg-yellow-50 p-4">
            Evaluation has not been generated yet.
            Run <strong>npm run eval</strong> inside the server folder.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {[
              ["Forecast Evaluation", evaluation.forecast],
              ["Skill Matching", evaluation.skillMatch],
              ["Recommendations", evaluation.recommendations],
            ].map(([title, data]) => (
              <div key={title} className="rounded-lg border p-4">
                <h3 className="mb-3 font-semibold">{title}</h3>
                {data == null ? (
                  <p className="text-sm text-gray-500">
                    No metrics available.
                  </p>
                ) : (
                  <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">
                    {JSON.stringify(data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}