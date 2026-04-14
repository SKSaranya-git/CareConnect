import { Link, Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="font-display text-xl font-bold text-primary">
            CareConnect
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link to="/" className="text-ink-muted hover:text-primary">
              Home
            </Link>
            <Link to="/login" className="text-ink-muted hover:text-primary">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary !py-2 !px-4">
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-ink-muted">
        <p>CareConnect — Smart Healthcare & Telemedicine (DS Assignment Demo)</p>
      </footer>
    </div>
  );
}
