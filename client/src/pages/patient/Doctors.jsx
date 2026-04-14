import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";

export default function PatientDoctors() {
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState("");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState("ALL");
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await gateway.doctors.list(specialty ? { specialty } : {});
      setDoctors(res.data.doctors || []);
    } catch (e) {
      setError(e.response?.data?.message || "Could not load doctors.");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredDoctors = useMemo(() => {
    const q = query.trim().toLowerCase();
    return doctors.filter((d) => {
      const matchesQuery =
        !q ||
        (d.fullName || "").toLowerCase().includes(q) ||
        (d.specialty || "").toLowerCase().includes(q) ||
        (d.hospital || "").toLowerCase().includes(q);
      const matchesTag =
        activeTag === "ALL" ||
        (activeTag === "TOP_RATED" && Number(d.experienceYears || 0) >= 8) ||
        (activeTag === "NEAR_ME" && Boolean(d.location)) ||
        (activeTag === "VIDEO" && Number(d.consultationFee || 0) > 0);
      return matchesQuery && matchesTag;
    });
  }, [doctors, query, activeTag]);

  const tags = [
    { id: "ALL", label: "Available Today" },
    { id: "TOP_RATED", label: "Top Rated" },
    { id: "NEAR_ME", label: "Near Me" },
    { id: "VIDEO", label: "Video Consult" }
  ];

  function ratingFor(doctor) {
    const value = 4.1 + Math.min(Number(doctor.experienceYears || 0), 15) * 0.05;
    return Math.min(4.9, value).toFixed(1);
  }

  function doctorInitials(name) {
    const parts = String(name || "Doctor")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "DR";
  }

  return (
    <div className="space-y-6">
      <div>
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Find Doctors</h1>
          <p className="text-sm text-ink-muted">Access top specialists and book confidently.</p>
        </div>
      </div>

      <div className="card-panel space-y-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            className="input-field flex-1"
            placeholder="Search by name, specialty, or hospital..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              className="input-field w-full md:w-48"
              placeholder="Specialty filter"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
            <button type="button" className="btn-primary whitespace-nowrap" onClick={load}>
              Search Archive
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeTag === tag.id ? "bg-primary text-white" : "bg-slate-100 text-ink hover:bg-slate-200"
              }`}
              onClick={() => setActiveTag(tag.id)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-10 w-10" />
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card-panel text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">?</div>
            <p className="font-semibold text-ink">Need more results?</p>
            <p className="mt-1 text-sm text-ink-muted">Try adjusting your filters or search terms.</p>
            <button type="button" className="btn-secondary mt-4" onClick={() => {
              setQuery("");
              setSpecialty("");
              setActiveTag("ALL");
              load();
            }}>
              Clear all filters
            </button>
          </div>
          <div className="card-panel bg-gradient-to-r from-blue-50 to-cyan-50">
            <p className="text-xl font-semibold text-ink">Can&apos;t find what you&apos;re looking for?</p>
            <p className="mt-2 text-sm text-ink-muted">Our concierge team helps match you with the right specialist.</p>
            <button type="button" className="btn-primary mt-4">
              Contact concierge
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredDoctors.map((d) => (
              <div key={d._id} className="card-panel flex h-full flex-col">
                <div className="flex items-start gap-3">
                  {d.avatarUrl ? (
                    <img src={d.avatarUrl} alt={d.fullName || "Doctor"} className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                      {doctorInitials(d.fullName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-base font-semibold text-ink">{d.fullName || "Doctor"}</h2>
                    <p className="truncate text-sm font-medium text-secondary">{d.specialty || "General Medicine"}</p>
                    <p className="truncate text-xs text-ink-muted">{d.hospital || "Independent Practice"}</p>
                  </div>
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">★ {ratingFor(d)}</span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-ink-muted">Exp</p>
                    <p className="font-semibold text-ink">{d.experienceYears || 0} yrs</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-ink-muted">Fee</p>
                    <p className="font-semibold text-ink">LKR {d.consultationFee ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <p className="text-ink-muted">Location</p>
                    <p className="truncate font-semibold text-ink">{d.location || "N/A"}</p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 text-xs text-ink-muted">{d.bio || "Patient-focused care with personalized treatment plans."}</p>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button type="button" className="btn-primary" onClick={() => navigate(`/patient/book?doctorId=${d.userId}`)}>
                    Book Visit
                  </button>
                  <button type="button" className="btn-secondary">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="card-panel bg-gradient-to-r from-indigo-50 to-blue-50">
              <p className="text-2xl font-semibold text-ink">Can&apos;t find what you&apos;re looking for?</p>
              <p className="mt-2 text-sm text-ink-muted">Our concierge team can help you choose the best specialist for your needs.</p>
              <button type="button" className="btn-primary mt-4">
                Contact Concierge
              </button>
            </div>
            <div className="card-panel bg-gradient-to-r from-cyan-50 to-sky-50">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Hospital Work</p>
              <p className="mt-1 text-xl font-semibold text-ink">Premium care network</p>
              <p className="mt-2 text-sm text-ink-muted">Verified specialists, digital records, and fast virtual consultation support.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
