import { useCallback, useEffect, useMemo, useState } from "react";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";

function tone(status) {
  if (status === "PAID") return "bg-emerald-100 text-emerald-700";
  if (status === "FAILED") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function money(value) {
  return `LKR ${Number(value || 0).toLocaleString()}`;
}

export default function AdminPayments() {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [totals, setTotals] = useState({ total: 0, paid: 0, pending: 0, failed: 0 });
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = statusFilter === "ALL" ? {} : { status: statusFilter };
      const res = await gateway.payments.list(params);
      setPayments(res.data.payments || []);
      setTotals(res.data.totals || { total: 0, paid: 0, pending: 0, failed: 0 });
    } catch (e) {
      setError(e.response?.data?.message || "Could not load payments.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const paidCount = useMemo(() => payments.filter((p) => p.status === "PAID").length, [payments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Payment Operations</h1>
          <p className="text-sm text-ink-muted">Track and audit all transaction activity across the platform.</p>
        </div>
        <div className="flex gap-2">
          <select className="input-field min-w-[130px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All status</option>
            <option value="PAID">PAID</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
          </select>
          <button type="button" className="btn-secondary !py-2" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card-panel">
          <p className="text-xs uppercase text-ink-muted">Total Value</p>
          <p className="mt-1 text-xl font-bold text-ink">{money(totals.total)}</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase text-ink-muted">Paid Value</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">{money(totals.paid)}</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase text-ink-muted">Pending Value</p>
          <p className="mt-1 text-xl font-bold text-amber-700">{money(totals.pending)}</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase text-ink-muted">Paid Transactions</p>
          <p className="mt-1 text-xl font-bold text-ink">{paidCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-10 w-10" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-ink-muted">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Appointment</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-semibold text-ink">{p.paymentRef || "—"}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{p.appointmentId}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{p.patientId}</td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{p.doctorId}</td>
                  <td className="px-4 py-3 font-medium text-ink">{money(p.amount)}</td>
                  <td className="px-4 py-3 text-ink-muted">{p.provider || "PAYHERE"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tone(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{new Date(p.updatedAt || p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-ink-muted" colSpan={8}>
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
