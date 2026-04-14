import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Alert from "../components/ui/Alert";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "PATIENT"
  });
  const [error, setError] = useState("");

  function update(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    try {
      const user = await register(form);
      if (user.role === "PATIENT") navigate("/patient");
      else navigate("/doctor");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed.");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="card-panel">
        <h1 className="font-display text-2xl font-bold text-ink">Create account</h1>
        <p className="mt-1 text-sm text-ink-muted">Patients and doctors can register here</p>
        <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
          <div>
            <label className="label-text">Full name</label>
            <input className="input-field" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required />
          </div>
          <div>
            <label className="label-text">Email</label>
            <input className="input-field" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div>
            <label className="label-text">Password</label>
            <input
              className="input-field"
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label-text">Role</label>
            <select className="input-field" value={form.role} onChange={(e) => update("role", e.target.value)}>
              <option value="PATIENT">Patient</option>
              <option value="DOCTOR">Doctor</option>
            </select>
          </div>
          {error && <Alert type="error">{error}</Alert>}
          <button type="submit" className="btn-primary w-full">
            Create account
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-ink-muted">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
