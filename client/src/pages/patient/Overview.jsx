import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { gateway } from "../../api/gateway";
import { useAuth } from "../../context/AuthContext";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";

const quickActions = [
  { to: "/patient/doctors", title: "Find a doctor", desc: "Access specialists near your location.", tone: "bg-blue-50 text-blue-600" },
  { to: "/patient/book", title: "Book appointment", desc: "Schedule your next check-up.", tone: "bg-slate-100 text-slate-600" },
  { to: "/patient/video", title: "Join video", desc: "Enter your virtual waiting room.", tone: "bg-sky-50 text-sky-600" },
  { to: "/patient/pay", title: "Payments", desc: "Manage billing and insurance.", tone: "bg-indigo-50 text-indigo-600" },
  { to: "/patient/ai", title: "AI symptom check", desc: "Instant preliminary analysis.", tone: "bg-cyan-50 text-cyan-600" },
  { to: "/patient/profile", title: "Profile", desc: "Update personal medical history.", tone: "bg-violet-50 text-violet-600" }
];

export default function PatientOverview() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartMode, setChartMode] = useState("quarterly");

  useEffect(() => {
    let active = true;
    gateway.appointments
      .mine()
      .then((res) => {
        if (active) setAppointments(res.data.appointments || []);
      })
      .catch((e) => {
        if (active) setError(e.response?.data?.message || "Could not load overview.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const upcoming = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((a) => a.status !== "CANCELLED" && new Date(a.appointmentDateTime).getTime() >= now)
      .sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime());
  }, [appointments]);

  const nextUp = upcoming[0] || null;
  const pending = appointments.filter((a) => a.status === "PENDING").length;
  const paid = appointments.filter((a) => a.paymentStatus === "PAID").length;

  const chartValues = chartMode === "monthly" ? [24, 30, 42, 36, 44, 40] : [30, 44, 34, 56, 64, 52];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Patient Care Dashboard</h1>
          <p className="text-sm text-ink-muted">Reliable access to doctors, video care, payments, and your health records in one portal.</p>
        </div>
        <Link to="/patient/book" className="btn-primary !py-2">
          Book Appointment
        </Link>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-10 w-10" />
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          <section className="space-y-4 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {quickActions.map((action) => (
                <Link key={action.to} to={action.to} className="card-panel transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold ${action.tone}`}>+</span>
                  <h2 className="mt-3 font-semibold text-ink">{action.title}</h2>
                  <p className="mt-1 text-xs text-ink-muted">{action.desc}</p>
                </Link>
              ))}
            </div>

            <div className="card-panel">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-semibold text-ink">Medical History Overview</h2>
                  <p className="text-sm text-ink-muted">Visualizing your recent diagnostic activity.</p>
                </div>
                <div className="rounded-full bg-slate-100 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 ${chartMode === "monthly" ? "bg-white text-ink shadow-sm" : "text-ink-muted"}`}
                    onClick={() => setChartMode("monthly")}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    className={`rounded-full px-3 py-1 ${chartMode === "quarterly" ? "bg-primary text-white shadow-sm" : "text-ink-muted"}`}
                    onClick={() => setChartMode("quarterly")}
                  >
                    Quarterly
                  </button>
                </div>
              </div>
              <div className="mt-6 grid h-40 grid-cols-6 items-end gap-3">
                {chartValues.map((h, i) => (
                  <div key={i} className="relative h-full rounded-xl bg-blue-50">
                    <div className="absolute bottom-0 w-full rounded-xl bg-primary/25" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="card-panel bg-gradient-to-br from-primary to-primary-dark text-white">
              <p className="text-xs uppercase tracking-wide text-white/80">Upcoming</p>
              <p className="mt-1 text-lg font-semibold">{nextUp ? "Next Appointment" : "No Appointment Yet"}</p>
              <p className="text-sm text-white/90">
                {nextUp
                  ? new Date(nextUp.appointmentDateTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "Book your next check-up to stay on track."}
              </p>
              <div className="mt-4 flex gap-2">
                <Link to="/patient/appointments" className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25">
                  View all
                </Link>
                <Link to={nextUp ? `/patient/video?appointmentId=${nextUp._id}` : "/patient/video"} className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary">
                  Video call
                </Link>
              </div>
            </div>

            <div className="card-panel">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-ink">Health Summary</h3>
                <span className="text-xs font-semibold text-primary">Details</span>
              </div>
              <div className="mt-3 space-y-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-ink-muted">Upcoming visits</p>
                  <p className="text-lg font-bold text-ink">{upcoming.length}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-ink-muted">Pending appointments</p>
                  <p className="text-lg font-bold text-ink">{pending}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-ink-muted">Payments completed</p>
                  <p className="text-lg font-bold text-ink">{paid}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
