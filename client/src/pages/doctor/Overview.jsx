import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { gateway } from "../../api/gateway";
import Spinner from "../../components/ui/Spinner";

const quickActions = [
  { to: "/doctor/appointments", title: "Appointments", desc: "Review and action patient requests." },
  { to: "/doctor/video", title: "Join Video", desc: "Open virtual consultation rooms." },
  { to: "/doctor/availability", title: "Availability", desc: "Update your working hours." },
  { to: "/doctor/records", title: "Patient Records", desc: "View report uploads and history." },
  { to: "/doctor/profile", title: "Profile", desc: "Maintain public profile and fees." }
];

export default function DoctorOverview() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    gateway.appointments
      .mine()
      .then((res) => {
        if (active) setAppointments(res.data.appointments || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = appointments.filter((a) => new Date(a.appointmentDateTime).toDateString() === today).length;
    const pending = appointments.filter((a) => a.status === "PENDING").length;
    const newMessages = appointments.filter((a) => a.status === "ACCEPTED").length;
    return { todayCount, pending, newMessages };
  }, [appointments]);

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => ["PENDING", "ACCEPTED"].includes(a.status))
        .sort((a, b) => new Date(a.appointmentDateTime).getTime() - new Date(b.appointmentDateTime).getTime())
        .slice(0, 3),
    [appointments]
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink">Clinical Command Center, Dr. {user?.fullName?.split(" ")[0] || "Doctor"}.</h1>
          <p className="text-sm text-ink-muted">Your consultation schedule and patient activity are synced in real time.</p>
        </div>
        <Link to="/doctor/video" className="btn-primary !py-2">
          Start Video Session
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-panel">
          <p className="text-xs uppercase text-ink-muted">Today</p>
          <p className="text-3xl font-bold text-primary">{String(summary.todayCount).padStart(2, "0")}</p>
          <p className="text-xs text-ink-muted">Total appointments</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase text-ink-muted">Urgent</p>
          <p className="text-3xl font-bold text-amber-600">{String(summary.pending).padStart(2, "0")}</p>
          <p className="text-xs text-ink-muted">Pending requests</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase text-ink-muted">New</p>
          <p className="text-3xl font-bold text-secondary">{String(summary.newMessages).padStart(2, "0")}</p>
          <p className="text-xs text-ink-muted">Accepted consults</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {quickActions.map((item) => (
              <Link key={item.to} to={item.to} className="card-panel transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                <h2 className="font-semibold text-ink">{item.title}</h2>
                <p className="mt-1 text-sm text-ink-muted">{item.desc}</p>
              </Link>
            ))}
          </div>

          <div className="card-panel">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Upcoming Consultations</h2>
              <Link to="/doctor/appointments" className="text-xs font-semibold text-primary">
                View Schedule
              </Link>
            </div>
            <div className="space-y-3">
              {upcoming.map((a) => (
                <div key={a._id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <div>
                    <p className="font-medium text-ink">Patient #{String(a.patientId).slice(-8)}</p>
                    <p className="text-xs text-ink-muted">{new Date(a.appointmentDateTime).toLocaleString()}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{a.status}</span>
                </div>
              ))}
              {upcoming.length === 0 && <p className="text-sm text-ink-muted">No active consultations right now.</p>}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card-panel">
            <h3 className="font-semibold text-ink">Patient Activity</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li className="rounded-lg bg-slate-50 p-2">Latest booking updates appear here.</li>
              <li className="rounded-lg bg-slate-50 p-2">System sync status: <span className="font-semibold text-emerald-600">LIVE</span>.</li>
              <li className="rounded-lg bg-slate-50 p-2">Video queue is ready for today&apos;s sessions.</li>
            </ul>
          </div>
          <div className="card-panel bg-gradient-to-br from-primary to-primary-dark text-white">
            <h3 className="font-semibold">Daily Capacity</h3>
            <p className="mt-2 text-sm text-white/90">
              You currently have {summary.todayCount} appointments today. Keep availability updated for better matching.
            </p>
            <Link to="/doctor/availability" className="mt-3 inline-block rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary">
              Manage Slots
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
