import { useCallback, useEffect, useMemo, useState } from "react";
import { gateway } from "../../api/gateway";
import { useAuth } from "../../context/AuthContext";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";

export default function DoctorAppointments() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rxFor, setRxFor] = useState(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gateway.appointments.mine();
      setList(res.data.appointments || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(id, status) {
    setError("");
    try {
      await gateway.appointments.updateStatus(id, { status });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Update failed.");
    }
  }

  async function submitRx(e) {
    e.preventDefault();
    if (!rxFor) return;
    setError("");
    try {
      await gateway.patients.addPrescription(rxFor.patientId, {
        appointmentId: rxFor._id,
        doctorId: user.id,
        diagnosis,
        medicines: [{ name: "Paracetamol", dosage: "500mg", frequency: "Twice daily", duration: "3 days" }],
        notes
      });
      setRxFor(null);
      setDiagnosis("");
      setNotes("");
    } catch (e) {
      setError(e.response?.data?.message || "Prescription failed.");
    }
  }

  const filtered = useMemo(() => {
    if (filter === "ALL") return list;
    return list.filter((a) => a.status === filter);
  }, [list, filter]);

  const acceptedCount = list.filter((a) => a.status === "ACCEPTED").length;
  const pendingCount = list.filter((a) => a.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Clinical Schedule</h1>
          <p className="text-sm text-ink-muted">Manage consultation flow, update status, and issue prescriptions.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary !py-2" onClick={load}>
            Refresh
          </button>
          <select className="input-field min-w-[140px]" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">All status</option>
            <option value="PENDING">PENDING</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-10 w-10" />
            </div>
          ) : (
            <ul className="space-y-4">
              {filtered.map((a) => (
                <li key={a._id} className="card-panel space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">Patient: {String(a.patientId).slice(-20)}</p>
                      <p className="text-xs text-ink-muted">{new Date(a.appointmentDateTime).toLocaleString()}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Status: {a.status}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-primary !py-2" onClick={() => setStatus(a._id, "COMPLETED")} disabled={!["ACCEPTED", "PENDING"].includes(a.status)}>
                      Complete
                    </button>
                    <button
                      type="button"
                      className="btn-secondary !py-2"
                      disabled={!["ACCEPTED", "COMPLETED"].includes(a.status)}
                      onClick={() => setRxFor(a)}
                    >
                      Prescription
                    </button>
                    <button type="button" className="btn-teal !py-2" onClick={() => setStatus(a._id, "ACCEPTED")} disabled={a.status !== "PENDING"}>
                      Accept
                    </button>
                    <button type="button" className="btn-secondary !py-2" onClick={() => setStatus(a._id, "REJECTED")} disabled={a.status !== "PENDING"}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
              {filtered.length === 0 && <li className="card-panel text-sm text-ink-muted">No appointments for selected filter.</li>}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card-panel bg-gradient-to-br from-primary to-primary-dark text-white">
            <p className="text-xs uppercase text-white/80">Daily Capacity</p>
            <p className="text-4xl font-bold">{acceptedCount + pendingCount}</p>
            <p className="text-sm text-white/90">Active consultations today</p>
          </div>
          <div className="card-panel">
            <h3 className="font-semibold text-ink">Upcoming Availability</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded-lg bg-slate-50 p-2 text-ink-muted">AM: 6 slots available</div>
              <div className="rounded-lg bg-slate-50 p-2 text-ink-muted">PM: 4 slots available</div>
            </div>
          </div>
        </aside>
      </div>

      {rxFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card-panel max-w-md shadow-xl">
            <h2 className="font-display text-lg font-bold">Issue prescription</h2>
            <p className="text-sm text-ink-muted">Patient {rxFor.patientId}</p>
            <form className="mt-4 space-y-3" onSubmit={submitRx}>
              <div>
                <label className="label-text">Diagnosis</label>
                <input className="input-field" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} required />
              </div>
              <div>
                <label className="label-text">Notes</label>
                <input className="input-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  Save
                </button>
                <button type="button" className="btn-secondary flex-1" onClick={() => setRxFor(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
