import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive ? "bg-primary text-white shadow-sm" : "text-ink-muted hover:bg-slate-100 hover:text-ink"
  }`;

export default function DashboardLayout({ navItems, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="sticky top-0 h-screen w-56 shrink-0 border-r border-slate-200 bg-white sm:w-64">
        <div className="flex h-full flex-col overflow-y-auto p-4">
          <div className="mb-8 px-2">
            <div className="flex items-center gap-2">
              <img src="/careconnect-mark.png" alt="CareConnect logo" className="h-[4.75rem] w-[4.75rem] shrink-0 object-contain" />
              <div className="leading-tight">
                <p className="font-display text-lg font-bold text-primary">CareConnect</p>
                <p className="text-xs text-ink-muted">{title}</p>
              </div>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass} end={item.end}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <p className="truncate font-display font-semibold text-ink">{title}</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">
              {user?.fullName}
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {user?.role}
              </span>
            </span>
            <button type="button" className="btn-secondary !py-2" onClick={() => { logout(); navigate("/login"); }}>
              Log out
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
