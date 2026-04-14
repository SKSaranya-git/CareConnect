import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { gateway } from "../../api/gateway";
import { useAuth } from "../../context/AuthContext";
import Alert from "../../components/ui/Alert";
import { Link } from "react-router-dom";

export default function PatientVideo() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const appointmentIdFromQuery = params.get("appointmentId") || "";
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(appointmentIdFromQuery);
  const [appointments, setAppointments] = useState([]);
  const [joinUrl, setJoinUrl] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await gateway.appointments.mine();
        const eligible = (res.data.appointments || [])
          .filter((a) => ["ACCEPTED", "COMPLETED"].includes(a.status))
          .sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime());
        if (ignore) return;
        setAppointments(eligible);
        const selectedId = appointmentIdFromQuery || eligible[0]?._id || "";
        setSelectedAppointmentId(selectedId);
      } catch (e) {
        if (!ignore) setError(e.response?.data?.message || "Failed to load appointments.");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [appointmentIdFromQuery]);

  const selectedAppointment = useMemo(
    () => appointments.find((a) => a._id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  );

  const nextUp = useMemo(() => {
    const now = Date.now();
    const upcoming = appointments
      .filter((a) => new Date(a.appointmentDateTime).getTime() >= now)
      .sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime());
    return upcoming[0] || selectedAppointment || null;
  }, [appointments, selectedAppointment]);

  async function hydrateSession(appointmentId) {
    try {
      const existing = await gateway.telemedicine.getByAppointment(appointmentId);
      setJoinUrl(existing.data.session?.joinUrl || "");
      setSessionStatus(existing.data.session?.status || "");
    } catch (_err) {
      setJoinUrl("");
      setSessionStatus("");
    }
  }

  useEffect(() => {
    if (!selectedAppointmentId) return;
    hydrateSession(selectedAppointmentId);
  }, [selectedAppointmentId]);

  async function startSession() {
    setError("");
    setMsg("");
    if (!selectedAppointment || !selectedAppointmentId) {
      setError("Select an eligible appointment to start or join a session.");
      return;
    }
    try {
      const res = await gateway.telemedicine.createSession({
        appointmentId: selectedAppointmentId,
        patientId: user.id,
        doctorId: selectedAppointment.doctorId
      });
      setJoinUrl(res.data.session?.joinUrl || "");
      setSessionStatus(res.data.session?.status || "LIVE");
      setMsg("Session is ready. You can join now.");
    } catch (e) {
      setError(e.response?.data?.message || "Could not create session.");
    }
  }

  async function endSession() {
    if (!selectedAppointmentId) return;
    try {
      const res = await gateway.telemedicine.endSession(selectedAppointmentId);
      setSessionStatus(res.data.session?.status || "COMPLETED");
      setMsg("Session marked as completed.");
    } catch (e) {
      setError(e.response?.data?.message || "Could not end session.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Video consultation</h1>
        <p className="text-ink-muted">
          Connect with your specialist in a secure, high-definition environment from the comfort of your home.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <section className="card-panel space-y-6 bg-primary/5 lg:col-span-2">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] flex-1">
              <label className="label-text">Scheduled appointment</label>
              <select
                className="input-field"
                value={selectedAppointmentId}
                onChange={(e) => setSelectedAppointmentId(e.target.value)}
                disabled={loading || appointments.length === 0}
              >
                {appointments.length === 0 && <option value="">No eligible appointments</option>}
                {appointments.map((a) => (
                  <option key={a._id} value={a._id}>
                    {new Date(a.appointmentDateTime).toLocaleString()} - Dr {a.doctorId.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <Link to="/patient/appointments" className="btn-secondary !py-2">
              Go to appointments
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center">
            {!selectedAppointmentId ? (
              <>
                <p className="text-2xl font-semibold text-ink">No appointment selected</p>
                <p className="mt-2 text-ink-muted">To start a video visit, choose a scheduled accepted/completed appointment.</p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-ink">
                  {sessionStatus === "LIVE" ? "Session is live" : sessionStatus === "COMPLETED" ? "Session completed" : "Session not started"}
                </p>
                <p className="mt-2 text-sm text-ink-muted">Appointment ID: {selectedAppointmentId}</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn-teal !py-2" onClick={startSession}>
                    {joinUrl ? "Re-open session" : "Create session"}
                  </button>
                  {joinUrl && (
                    <a href={joinUrl} target="_blank" rel="noreferrer" className="btn-primary !py-2">
                      Join consultation
                    </a>
                  )}
                  {sessionStatus === "LIVE" && (
                    <button type="button" className="btn-secondary !py-2" onClick={endSession}>
                      End session
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-slate-200 px-4 py-2 text-sm text-ink-muted">
            <span>Mic</span>
            <span>•</span>
            <span>Camera</span>
            <span>•</span>
            <span>Screen</span>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card-panel bg-primary/10">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Next up</p>
            {nextUp ? (
              <>
                <p className="mt-2 text-xs text-ink-muted">Scheduled for {new Date(nextUp.appointmentDateTime).toLocaleString()}</p>
                <p className="mt-1 text-xl font-semibold text-ink">Dr {nextUp.doctorId.slice(0, 8)}</p>
                <p className="text-sm text-ink-muted">Consultation</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-ink-muted">No upcoming consultation.</p>
            )}
          </div>
          <div className="card-panel">
            <h3 className="font-semibold text-ink">System readiness</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-ink-muted">Connection</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">OPTIMAL</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink-muted">Audio Input</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">READY</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink-muted">Camera</span>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">READY</span>
              </li>
            </ul>
          </div>
          <div className="card-panel border-l-4 border-l-primary">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">Consultation tip</h3>
            <p className="mt-2 text-sm text-ink-muted">
              Ensure you are in a quiet room and keep your recent reports/prescriptions ready before joining.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
