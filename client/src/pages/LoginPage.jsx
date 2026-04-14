import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Alert from "../components/ui/Alert";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }
    try {
      const user = await login(email.trim(), password);
      if (user.role === "PATIENT") navigate("/patient");
      else if (user.role === "DOCTOR") navigate("/doctor");
      else navigate("/admin");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Sign in failed. Is the API gateway running on port 8081?"
      );
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card-panel">
        <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-muted">Sign in to your CareConnect account</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label className="label-text" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label-text" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <Alert type="error">{error}</Alert>}
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-muted">
          No account?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
