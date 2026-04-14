import { useAuth } from "../../context/AuthContext";

export default function AdminProfile() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Admin Profile</h1>
        <p className="text-sm text-ink-muted">Platform ownership details and operational access summary.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-panel">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Full Name</p>
          <p className="mt-1 text-lg font-semibold text-ink">{user?.fullName || "Administrator"}</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Email</p>
          <p className="mt-1 text-lg font-semibold text-ink">{user?.email || "—"}</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Role</p>
          <p className="mt-1 text-lg font-semibold text-primary">{user?.role || "ADMIN"}</p>
        </div>
        <div className="card-panel">
          <p className="text-xs uppercase tracking-wide text-ink-muted">Scope</p>
          <p className="mt-1 text-sm text-ink-muted">User governance, doctor verification, payment operations, notification controls.</p>
        </div>
      </div>
    </div>
  );
}
