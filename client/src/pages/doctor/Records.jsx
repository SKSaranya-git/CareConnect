import { useState } from "react";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";

export default function DoctorRecords() {
  const [patientId, setPatientId] = useState("");
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  async function load(e) {
    e.preventDefault();
    setError("");
    setReports([]);
    try {
      const res = await gateway.patients.patientReports(patientId.trim());
      setReports(res.data.reports || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load reports.");
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-ink">Patient records</h1>
      <form className="card-panel flex flex-wrap gap-2" onSubmit={load}>
        <input
          className="input-field min-w-[200px] flex-1"
          placeholder="Patient user ID"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary">
          Load reports
        </button>
      </form>
      {error && <Alert type="error">{error}</Alert>}
      <ul className="space-y-2">
        {reports.length === 0 && !error && patientId && <li className="text-ink-muted">No reports.</li>}
        {reports.map((r) => (
          <li key={r._id} className="card-panel !py-3">
            <p className="font-medium">{r.title}</p>
            <a href={r.fileUrl} className="text-sm text-primary hover:underline" target="_blank" rel="noreferrer">
              Open
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
