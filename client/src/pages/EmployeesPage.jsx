
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { Loading, ErrorBox } from "../components/ui";

const DEPARTMENTS = [
  "Engineering",
  "Data & AI",
  "Cloud",
  "Quality",
  "Embedded",
];

export default function EmployeesPage() {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchEmployees() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/employees", {
          params: {
            search,
            department,
          },
        });

        if (!cancelled) {
          setEmployees(response.data.data);
        }
      } catch (err) {
        if (!cancelled) {
          setEmployees([]);
          setError(
            err.response?.status === 403
              ? "Access denied. Only HR can view employees."
              : err.response?.data?.message ||
                  "Unable to load employees. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchEmployees();

    return () => {
      cancelled = true;
    };
  }, [search, department]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Employee Directory
          </h1>

          <p className="mt-2 text-slate-500">
            Search employees, explore their skills, and
            review workforce profiles.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="employee-search"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Search Employees
              </label>

              <input
                id="employee-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or employee code..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div>
              <label
                htmlFor="department-filter"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Department
              </label>

              <select
                id="department-filter"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">All Departments</option>

                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Employees
            </h2>

            {!loading && !error && (
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                {employees.length} employees
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-8">
              <Loading />
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorBox message={error} />
            </div>
          ) : employees.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-lg font-medium text-slate-700">
                No employees found
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Try changing the search or department filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Employee Code
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Name
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Department
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Role
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Skills
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {employees.map((employee) => (
                    <tr
                      key={employee._id}
                      className="hover:bg-indigo-50"
                    >
                      <td className="px-5 py-4 font-medium text-indigo-700">
                        {employee.code}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-900">
                        {employee.name}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {employee.department}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {employee.role?.title || "Not assigned"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                          {employee.skillCount}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/employees/${employee._id}`)
                          }
                          className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          View Profile →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
