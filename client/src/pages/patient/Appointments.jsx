import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";

export default function PatientAppointments() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rescheduleFor, setRescheduleFor] = useState(null);
  const [rescheduleDateTime, setRescheduleDateTime] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gateway.appointments.mine();
      setList(res.data.appointments || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load appointments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id) {
    try {
      await gateway.appointments.updateStatus(id, { status: "CANCELLED" });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Cancel failed.");
    }
  }

  function openReschedule(appointment) {
    setRescheduleFor(appointment);
    const dt = new Date(appointment.appointmentDateTime);
    const normalized = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setRescheduleDateTime(normalized);
  }

  async function submitReschedule(e) {
    e.preventDefault();
    if (!rescheduleFor || !rescheduleDateTime) return;
    setError("");
    try {
      const iso = new Date(rescheduleDateTime).toISOString();
      await gateway.appointments.reschedule(rescheduleFor._id, { appointmentDateTime: iso });
      setRescheduleFor(null);
      setRescheduleDateTime("");
      await load();
    } catch (e2) {
      setError(e2.response?.data?.message || "Reschedule failed.");
    }
  }

  const now = Date.now();
  const upcoming = list.filter((a) => new Date(a.appointmentDateTime).getTime() >= now);
  const nextSession = upcoming
    .slice()
    .sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime())[0];

  function statusTone(status) {
    if (status === "ACCEPTED") return "bg-emerald-100 text-emerald-700";
    if (status === "COMPLETED") return "bg-primary/10 text-primary";
    if (status === "PENDING") return "bg-amber-100 text-amber-700";
    return "bg-slate-100 text-slate-700";
  }

  function paymentTone(paymentStatus) {
    if (paymentStatus === "PAID") return "bg-emerald-100 text-emerald-700";
    if (paymentStatus === "FAILED") return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-700";
  }

  function dayBlock(iso) {
    const d = new Date(iso);
    return {
      month: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
      day: String(d.getDate()).padStart(2, "0"),
      year: d.getFullYear()
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">My Appointments</h1>
          <p className="text-ink-muted">Manage your upcoming clinical sessions and medical consultations.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/patient/book" className="btn-primary !py-2">
            + New appointment
          </Link>
          <button type="button" className="btn-secondary !py-2" onClick={load}>
            Refresh
          </button>
        </div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-10 w-10" />
        </div>
      ) : list.length === 0 ? (
        <div className="card-panel">
          <p className="text-ink-muted">No appointments yet.</p>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {list.map((a) => {
              const when = new Date(a.appointmentDateTime);
              const block = dayBlock(a.appointmentDateTime);
              return (
                <article key={a._id} className="card-panel flex gap-4 border-l-4 border-l-primary">
                  <div className="w-20 shrink-0 rounded-xl bg-primary/5 p-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{block.month}</p>
                    <p className="text-3xl font-bold text-ink">{block.day}</p>
                    <p className="text-xs text-ink-muted">{block.year}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(a.status)}`}>{a.status}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${paymentTone(a.paymentStatus)}`}>{a.paymentStatus}</span>
                    </div>
                    <p className="mt-2 text-xl font-semibold text-ink">{a.reason || "General Consultation"}</p>
                    <p className="text-sm text-ink-muted">{when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    <p className="text-xs text-ink-muted">Doctor ID: #{a.doctorId}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {["ACCEPTED", "COMPLETED"].includes(a.status) && (
                      <>
                        <Link to={`/patient/video?appointmentId=${a._id}`} className="btn-teal !py-2">
                          Video
                        </Link>
                        <Link to={`/patient/pay?appointmentId=${a._id}`} className="btn-primary !py-2">
                          Pay
                        </Link>
                      </>
                    )}
                    {a.status === "PENDING" && (
                      <button type="button" className="btn-secondary !py-2" onClick={() => cancel(a._id)}>
                        Cancel
                      </button>
                    )}
                    {["PENDING", "ACCEPTED"].includes(a.status) && (
                      <button type="button" className="btn-secondary !py-2" onClick={() => openReschedule(a)}>
                        Reschedule
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          <aside className="space-y-4">
            <div className="card-panel bg-primary/5">
              <h3 className="font-semibold text-ink">Schedule Overview</h3>
              <div className="mt-3 space-y-2">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs uppercase text-ink-muted">Total upcoming</p>
                  <p className="text-lg font-bold text-ink">{upcoming.length}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs uppercase text-ink-muted">Next session</p>
                  <p className="text-sm font-semibold text-ink">
                    {nextSession ? new Date(nextSession.appointmentDateTime).toLocaleDateString() : "No upcoming"}
                  </p>
                </div>
              </div>
            </div>
            <div className="card-panel bg-gradient-to-br from-primary to-primary-dark text-white">
              <h3 className="font-semibold">Virtual Care Ready</h3>
              <p className="mt-2 text-sm text-white/90">Ensure your video setup is tested 15 minutes before your session starts.</p>
            </div>
          </aside>
        </div>
      )}

      {rescheduleFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div className="card-panel w-full max-w-md shadow-xl">
            <h2 className="font-display text-lg font-bold text-ink">Reschedule Appointment</h2>
            <p className="text-sm text-ink-muted">Pick a new date and time for this booking.</p>
            <form className="mt-4 space-y-3" onSubmit={submitReschedule}>
              <div>
                <label className="label-text">New date & time</label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={rescheduleDateTime}
                  onChange={(e) => setRescheduleDateTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">
                  Save Changes
                </button>
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  onClick={() => {
                    setRescheduleFor(null);
                    setRescheduleDateTime("");
                  }}
                >
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
