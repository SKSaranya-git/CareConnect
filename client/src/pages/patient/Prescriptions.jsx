import { useCallback, useEffect, useMemo, useState } from "react";
import { gateway } from "../../api/gateway";
import Spinner from "../../components/ui/Spinner";
import Alert from "../../components/ui/Alert";

export default function PatientPrescriptions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function parseDurationDays(durationText) {
    if (!durationText) return null;
    const match = String(durationText).toLowerCase().match(/(\d+)\s*day/);
    if (!match) return null;
    return Number(match[1]);
  }

  function statusTone(status) {
    if (status === "EXPIRING SOON") return "bg-amber-100 text-amber-700";
    if (status === "COMPLETED") return "bg-slate-100 text-slate-700";
    return "bg-emerald-100 text-emerald-700";
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await gateway.patients.listPrescriptions();
      setItems(res.data.prescriptions || []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load prescriptions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activeMeds = useMemo(() => {
    const now = Date.now();
    const flattened = [];

    items.forEach((p) => {
      (p.medicines || []).forEach((m) => {
        const durationDays = parseDurationDays(m.duration);
        const issuedAt = p.createdAt ? new Date(p.createdAt).getTime() : now;
        const expiryAt = durationDays ? issuedAt + durationDays * 24 * 60 * 60 * 1000 : null;
        const remainingMs = expiryAt ? expiryAt - now : null;
        const remainingDays = remainingMs != null ? Math.ceil(remainingMs / (24 * 60 * 60 * 1000)) : null;
        const status =
          remainingDays == null ? "ACTIVE" : remainingDays <= 0 ? "COMPLETED" : remainingDays <= 2 ? "EXPIRING SOON" : "ACTIVE";

        flattened.push({
          id: `${p._id}-${m._id || m.name}`,
          name: m.name || "Medication",
          dosage: m.dosage || "—",
          frequency: m.frequency || "—",
          duration: m.duration || "—",
          status,
          remainingDays,
          issuedAt: p.createdAt,
          diagnosis: p.diagnosis || "Prescription",
          notes: p.notes || "",
          appointmentId: p.appointmentId || ""
        });
      });
    });

    return flattened
      .filter((m) => m.status !== "COMPLETED")
      .sort((a, b) => {
        const rank = { "EXPIRING SOON": 0, ACTIVE: 1 };
        return rank[a.status] - rank[b.status];
      });
  }, [items]);

  const historyRows = useMemo(
    () =>
      [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((p) => ({
        id: p._id,
        medication: p.medicines?.map((m) => m.name).filter(Boolean).join(", ") || "Medication",
        dosage: p.medicines?.map((m) => m.dosage).filter(Boolean).join(" / ") || "—",
        period: p.medicines?.map((m) => m.duration).filter(Boolean).join(" / ") || "—",
        status: p.medicines?.some((m) => {
          const d = parseDurationDays(m.duration);
          if (!d) return false;
          return Date.now() > new Date(p.createdAt).getTime() + d * 24 * 60 * 60 * 1000;
        })
          ? "COMPLETED"
          : "ACTIVE",
        diagnosis: p.diagnosis || "General",
        createdAt: p.createdAt
      })),
    [items]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Prescriptions</h1>
          <p className="text-ink-muted">Track active medications and your full prescription history.</p>
        </div>
        <button type="button" className="btn-secondary !py-2" onClick={load}>
          Refresh
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {items.length === 0 ? (
        <div className="card-panel">
          <p className="text-ink-muted">No prescriptions yet. After your doctor completes a visit, prescriptions appear here.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-primary">Active Medications</h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{activeMeds.length} total active</span>
          </div>
          {activeMeds.length === 0 ? (
            <div className="card-panel">
              <p className="text-ink-muted">No active medications currently.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeMeds.map((m) => (
                <article
                  key={m.id}
                  className={`card-panel border-l-4 ${
                    m.status === "EXPIRING SOON" ? "border-l-amber-500 bg-amber-50/50" : "border-l-primary"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-2xl font-semibold text-ink">{m.name}</p>
                      <p className="text-sm text-ink-muted">{m.dosage}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(m.status)}`}>{m.status}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs uppercase text-ink-muted">Frequency</p>
                      <p className="font-medium text-ink">{m.frequency}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-ink-muted">Duration</p>
                      <p className="font-medium text-ink">{m.duration}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-ink-muted">Remaining</p>
                      <p className="font-medium text-ink">
                        {m.remainingDays == null ? "—" : m.remainingDays <= 0 ? "Complete" : `${m.remainingDays} day(s)`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-ink-muted">
                    <p>Diagnosis: {m.diagnosis}</p>
                    {m.notes && <p className="mt-1">Notes: {m.notes}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="card-panel space-y-4">
            <h2 className="text-xl font-semibold text-ink">Prescription History</h2>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-ink-muted">
                  <tr>
                    <th className="px-4 py-3">Medication</th>
                    <th className="px-4 py-3">Dosage</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{row.medication}</p>
                        <p className="text-xs text-ink-muted">{row.diagnosis}</p>
                      </td>
                      <td className="px-4 py-3">{row.dosage}</td>
                      <td className="px-4 py-3">{row.period}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone(row.status)}`}>{row.status}</span>
                      </td>
                      <td className="px-4 py-3">{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
