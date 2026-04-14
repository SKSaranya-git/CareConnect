import { useCallback, useEffect, useState } from "react";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";

export default function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await gateway.admin.pendingDoctors();
      setDoctors(res.data.doctors || res.data || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load pending doctors.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function verify(userId, isVerified) {
    setMsg("");
    setError("");
    try {
      await gateway.admin.verifyDoctor(userId, isVerified);
      setMsg(isVerified ? "Doctor activated." : "Doctor set back to pending.");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Update failed.");
    }
  }

  const list = Array.isArray(doctors) ? doctors : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-ink">Pending doctors</h1>
        <button type="button" className="btn-secondary !py-2" onClick={load}>
          Refresh
        </button>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-10 w-10" />
        </div>
      ) : (
        <ul className="space-y-4">
          {list.length === 0 && <li className="text-ink-muted">No pending doctor profiles.</li>}
          {list.map((d) => (
            <li key={d._id || d.userId} className="card-panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-ink">{d.fullName}</p>
                <p className="text-sm text-ink-muted">{d.specialty}</p>
                <p className="text-xs text-ink-muted">User ID: {d.userId}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-primary !py-2" onClick={() => verify(d.userId, true)}>
                  Approve
                </button>
                <button type="button" className="btn-secondary !py-2" onClick={() => verify(d.userId, false)}>
                  Revoke
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
