
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { ErrorBox } from "../components/ui";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;

    if (user.role === "hr") {
      navigate("/employees", { replace: true });
    } else if (user.role === "employee" && user.employeeId) {
      navigate(`/employees/${user.employeeId}`, {
        replace: true,
      });
    }
  }, [user, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      await login(cleanEmail, password);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-2xl font-bold text-white">
            S
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            SkillSight
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Skill Gap & Workforce Evolution Predictor
          </p>
        </div>

        <h2 className="mb-5 text-xl font-semibold text-slate-800">
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="login-email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="login-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {error && <ErrorBox message={error} />}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <h3 className="text-sm font-semibold text-indigo-900">
            Demo accounts (synthetic data)
          </h3>

          <p className="mt-2 text-sm text-slate-700">
            <strong>HR:</strong> hr@skillsight.com
          </p>

          <p className="mt-1 text-sm text-slate-700">
            <strong>Employee:</strong> emp001@skillsight.com
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Use the password configured by the backend team
            for demo accounts.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          SkillSight | HCLTech Hackathon
        </p>
      </div>
    </div>
  );
}
