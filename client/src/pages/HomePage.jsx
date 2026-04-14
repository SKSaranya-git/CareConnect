import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-white to-secondary/10">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-secondary">Telemedicine platform</p>
            <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
              Book doctors anytime, anywhere
            </h1>
            <p className="mt-4 text-lg text-ink-muted">
              Appointments, secure video consultations, prescriptions, payments, and AI-assisted symptom guidance — built for
              your Distributed Systems assignment demo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="btn-primary">
                Get started
              </Link>
              <Link to="/login" className="btn-secondary">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-display text-center text-2xl font-bold text-ink">Why CareConnect</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            { t: "Smart booking", d: "Search by specialty and book verified doctors in seconds." },
            { t: "Video care", d: "Launch Jitsi-based sessions from your dashboard." },
            { t: "AI symptom check", d: "Rule-based suggestions with recommended specialties." }
          ].map((x) => (
            <div key={x.t} className="card-panel">
              <h3 className="font-display font-semibold text-primary">{x.t}</h3>
              <p className="mt-2 text-sm text-ink-muted">{x.d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
