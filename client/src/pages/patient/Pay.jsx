import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { gateway } from "../../api/gateway";
import { useAuth } from "../../context/AuthContext";
import Alert from "../../components/ui/Alert";

export default function PatientPay() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const appointmentIdFromQuery = params.get("appointmentId") || "";
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(appointmentIdFromQuery);
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [paymentsByAppointment, setPaymentsByAppointment] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await gateway.appointments.mine();
        const appts = (res.data.appointments || []).sort(
          (a, b) => new Date(b.appointmentDateTime).getTime() - new Date(a.appointmentDateTime).getTime()
        );
        if (ignore) return;
        setAppointments(appts);

        const entries = await Promise.all(
          appts.map(async (apt) => {
            try {
              const pr = await gateway.payments.byAppointment(apt._id);
              return [apt._id, pr.data.payment];
            } catch (_err) {
              return [apt._id, null];
            }
          })
        );
        if (ignore) return;
        const paymentMap = Object.fromEntries(entries);
        setPaymentsByAppointment(paymentMap);

        const targetId = appointmentIdFromQuery || appts[0]?._id || "";
        setSelectedAppointmentId(targetId);
        setPayment(targetId ? paymentMap[targetId] || null : null);
      } catch (e) {
        if (!ignore) setError(e.response?.data?.message || "Failed to load billing data.");
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
    () => appointments.find((x) => x._id === selectedAppointmentId) || null,
    [appointments, selectedAppointmentId]
  );

  const transactions = useMemo(
    () =>
      appointments.map((apt) => {
        const p = paymentsByAppointment[apt._id];
        return {
          appointment: apt,
          payment: p,
          amount: Number(p?.amount || 2500),
          status: p?.status || apt.paymentStatus || "UNPAID"
        };
      }),
    [appointments, paymentsByAppointment]
  );

  const totalBalanceDue = useMemo(
    () =>
      transactions
        .filter((t) => t.status !== "PAID" && ["ACCEPTED", "COMPLETED"].includes(t.appointment.status))
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const lastPaymentDate = useMemo(() => {
    const paid = Object.values(paymentsByAppointment)
      .filter((p) => p?.status === "PAID")
      .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
    return paid[0]?.updatedAt || paid[0]?.createdAt || "";
  }, [paymentsByAppointment]);

  const upcomingBillingDate = useMemo(() => {
    const now = Date.now();
    const upcoming = appointments
      .filter((a) => new Date(a.appointmentDateTime).getTime() >= now && a.paymentStatus !== "PAID")
      .sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime());
    return upcoming[0]?.appointmentDateTime || "";
  }, [appointments]);

  function formatMoney(value) {
    return `LKR ${Number(value || 0).toLocaleString()}`;
  }

  async function checkout() {
    setError("");
    setMsg("");
    if (!selectedAppointment) {
      setError("Invalid appointment.");
      return;
    }
    try {
      const res = await gateway.payments.checkout({
        appointmentId: selectedAppointmentId,
        patientId: user.id,
        doctorId: selectedAppointment.doctorId,
        amount: Number(amount) || 2500
      });
      setPayment(res.data.payment);
      setPaymentsByAppointment((prev) => ({ ...prev, [selectedAppointmentId]: res.data.payment }));
      setMsg("Checkout created (mock). Use “Mark paid” to complete flow.");
    } catch (e) {
      setError(e.response?.data?.message || "Checkout failed.");
    }
  }

  async function markPaid() {
    if (!payment?._id || !selectedAppointmentId) return;
    try {
      await gateway.payments.updateStatus(payment._id, { status: "PAID" });
      setMsg("Payment marked PAID.");
      const r = await gateway.payments.byAppointment(selectedAppointmentId);
      setPayment(r.data.payment);
      setPaymentsByAppointment((prev) => ({ ...prev, [selectedAppointmentId]: r.data.payment }));
    } catch (e) {
      setError(e.response?.data?.message || "Update failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Payments & Billing</h1>
        <p className="mt-1 text-ink-muted">
          Manage your medical expenses, view transaction history, and track payment progress securely.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card-panel">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Total Balance Due</p>
          <p className="mt-1 text-4xl font-bold text-ink">{formatMoney(totalBalanceDue)}</p>
          <button
            type="button"
            className="btn-primary mt-4 !py-2"
            onClick={() => {
              const unpaid = transactions.find((t) => t.status !== "PAID");
              if (unpaid) {
                setSelectedAppointmentId(unpaid.appointment._id);
                setPayment(unpaid.payment || null);
              }
            }}
          >
            Pay now
          </button>
        </div>
        <div className="card-panel bg-primary/5">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Last Payment Date</p>
          <p className="mt-1 text-3xl font-bold text-ink">
            {lastPaymentDate ? new Date(lastPaymentDate).toLocaleDateString() : "No payment yet"}
          </p>
          <p className="mt-3 text-xs text-ink-muted">Processed via sandbox gateway</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Upcoming Billing</p>
          <p className="mt-1 text-3xl font-bold text-ink">
            {upcomingBillingDate ? new Date(upcomingBillingDate).toLocaleDateString() : "No upcoming bill"}
          </p>
          <p className="mt-3 text-sm font-semibold text-primary">{transactions.filter((t) => t.status !== "PAID").length} unpaid item(s)</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card-panel space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-ink">Transaction History</h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Live records</span>
            </div>
            {loading ? (
              <p className="text-sm text-ink-muted">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-ink-muted">No appointments billed yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-ink-muted">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Service / Reason</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.appointment._id} className="border-t border-slate-100">
                        <td className="px-4 py-3">{new Date(t.appointment.appointmentDateTime).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{t.appointment.reason || "General Consultation"}</p>
                          <p className="text-xs text-ink-muted">Doctor ID: {t.appointment.doctorId}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              t.status === "PAID"
                                ? "bg-emerald-100 text-emerald-700"
                                : t.status === "PENDING"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatMoney(t.amount)}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="btn-secondary !py-1.5"
                            onClick={() => {
                              setSelectedAppointmentId(t.appointment._id);
                              setPayment(t.payment || null);
                            }}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card-panel space-y-3">
            <h3 className="font-semibold text-ink">Checkout Actions</h3>
            {!selectedAppointmentId ? (
              <p className="text-sm text-ink-muted">Select a transaction row to manage payment.</p>
            ) : (
              <>
                <p className="text-sm text-ink-muted">Appointment: {selectedAppointmentId}</p>
                <div>
                  <label className="label-text">Amount (LKR)</label>
                  <input
                    className="input-field"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="2500"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={checkout}
                    disabled={!["ACCEPTED", "COMPLETED"].includes(selectedAppointment?.status || "")}
                  >
                    Start mock checkout
                  </button>
                  {payment?.status === "PENDING" && (
                    <button type="button" className="btn-teal w-full" onClick={markPaid}>
                      Mark paid (sandbox)
                    </button>
                  )}
                </div>
                {!["ACCEPTED", "COMPLETED"].includes(selectedAppointment?.status || "") && (
                  <p className="text-xs text-ink-muted">
                    Payment can be started only when appointment status is ACCEPTED or COMPLETED.
                  </p>
                )}
                {payment && (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                    <p>
                      Status: <span className="font-semibold">{payment.status}</span>
                    </p>
                    <p className="break-all">Ref: {payment.paymentRef}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card-panel bg-gradient-to-br from-primary to-primary-dark text-white">
            <p className="text-sm uppercase tracking-wide text-white/80">Primary card</p>
            <p className="mt-4 text-2xl font-bold tracking-widest">**** **** **** 4242</p>
            <div className="mt-4 flex items-center justify-between text-sm text-white/90">
              <span>{(user?.fullName || "Card Holder").toUpperCase()}</span>
              <span>12/26</span>
            </div>
          </div>
          <div className="card-panel">
            <h3 className="font-semibold text-ink">Payment Methods</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded-lg border border-slate-200 p-3">Mastercard ending in 8801</div>
              <button type="button" className="btn-secondary w-full">
                + Add New Payment Method
              </button>
            </div>
          </div>
          <div className="card-panel border border-emerald-100 bg-emerald-50">
            <h4 className="font-semibold text-emerald-800">Secure Billing Assurance</h4>
            <p className="mt-2 text-sm text-emerald-700">
              All transactions are mock-sandboxed and encrypted for this coursework demo.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
