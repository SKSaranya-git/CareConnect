import { Link } from "react-router-dom";

export default function AdminOverview() {
  const actions = [
    { to: "/admin/users", t: "Users", d: "Browse all registered accounts." },
    { to: "/admin/doctors", t: "Approve doctors", d: "Review and verify pending doctors." },
    { to: "/admin/payments", t: "Payments", d: "Monitor transaction performance." },
    { to: "/admin/notifications", t: "Notifications", d: "Send and audit delivery logs." },
    { to: "/admin/profile", t: "Profile", d: "View admin account and access scope." }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Platform Control Center</h1>
        <p className="text-sm text-ink-muted">Oversee operations, compliance, and financial health in one place.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-panel">
          <p className="text-xs uppercase text-ink-muted">System status</p>
          <p className="mt-1 text-xl font-bold text-emerald-600">Operational</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase text-ink-muted">Security</p>
          <p className="mt-1 text-xl font-bold text-primary">JWT + Role Guard</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase text-ink-muted">Infra</p>
          <p className="mt-1 text-xl font-bold text-ink">Docker + Kubernetes</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {actions.map((x) => (
            <Link key={x.to} to={x.to} className="card-panel transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <h2 className="font-semibold text-primary">{x.t}</h2>
              <p className="mt-2 text-sm text-ink-muted">{x.d}</p>
            </Link>
          ))}
        </section>
        <aside className="space-y-4">
          <div className="card-panel bg-gradient-to-br from-primary to-primary-dark text-white">
            <h3 className="font-semibold">Ops Snapshot</h3>
            <p className="mt-2 text-sm text-white/90">Review payment anomalies, pending doctor verifications, and notification delivery trends daily.</p>
          </div>
          <div className="card-panel">
            <h3 className="font-semibold text-ink">Admin Checklist</h3>
            <ul className="mt-2 space-y-2 text-sm text-ink-muted">
              <li className="rounded-lg bg-slate-50 p-2">Approve all pending doctors.</li>
              <li className="rounded-lg bg-slate-50 p-2">Validate payment failure logs.</li>
              <li className="rounded-lg bg-slate-50 p-2">Confirm notification provider health.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
