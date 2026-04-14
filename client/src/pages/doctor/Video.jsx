import { useCallback, useEffect, useState } from "react";
import { gateway } from "../../api/gateway";
import { useAuth } from "../../context/AuthContext";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";

export default function DoctorVideo() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [error, setError] = useState("");
  const [urls, setUrls] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gateway.appointments.mine();
      setList((res.data.appointments || []).filter((a) => ["ACCEPTED", "COMPLETED"].includes(a.status)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {});
  }, [load]);

  async function start(a) {
    setError("");
    try {
      const res = await gateway.telemedicine.createSession({
        appointmentId: a._id,
        patientId: a.patientId,
        doctorId: user.id
      });
      setUrls((u) => ({ ...u, [a._id]: res.data.session?.joinUrl }));
    } catch (e) {
      setError(e.response?.data?.message || "Session error.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Video Command Room</h1>
          <p className="text-sm text-ink-muted">Launch and manage virtual consultations with one click.</p>
        </div>
        <button type="button" className="btn-secondary !py-2" onClick={() => load()}>
          Refresh
        </button>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-10 w-10" />
            </div>
          ) : (
            <ul className="space-y-3">
              {list.map((a) => (
                <li key={a._id} className="card-panel flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-ink">{new Date(a.appointmentDateTime).toLocaleString()}</p>
                    <p className="text-sm text-ink-muted">Patient: {a.patientId}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-teal !py-2" onClick={() => start(a)}>
                      Create session
                    </button>
                    {urls[a._id] && (
                      <a href={urls[a._id]} target="_blank" rel="noreferrer" className="btn-primary !py-2">
                        Join room
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!loading && list.length === 0 && <p className="card-panel text-sm text-ink-muted">No active appointments for video.</p>}
        </section>

        <aside className="space-y-4">
          <div className="card-panel bg-gradient-to-br from-primary to-primary-dark text-white">
            <h3 className="font-semibold">Video Reliability</h3>
            <p className="mt-2 text-sm text-white/90">Connection status: Stable. Camera and mic checks are recommended 5 minutes before session.</p>
          </div>
          <div className="card-panel">
            <h3 className="font-semibold text-ink">Session Tips</h3>
            <ul className="mt-2 space-y-2 text-sm text-ink-muted">
              <li className="rounded-lg bg-slate-50 p-2">Confirm patient identity before diagnosis.</li>
              <li className="rounded-lg bg-slate-50 p-2">Document summary right after consult.</li>
              <li className="rounded-lg bg-slate-50 p-2">Issue digital prescription for completed sessions.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
