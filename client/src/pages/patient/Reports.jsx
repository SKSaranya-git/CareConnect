import { useCallback, useEffect, useState } from "react";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";

export default function PatientReports() {
  const [reports, setReports] = useState([]);
  const [title, setTitle] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState("list");

  function reportIcon(url) {
    const lower = String(url || "").toLowerCase();
    if (lower.includes(".pdf")) return "PDF";
    if (lower.includes(".png") || lower.includes(".jpg") || lower.includes(".jpeg")) return "IMG";
    return "FILE";
  }

  function reportMeta(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace("www.", "");
    } catch (_err) {
      return "External source";
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await gateway.patients.listReports();
      setReports(res.data.reports || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load reports.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await gateway.patients.uploadReport({ title, fileUrl, notes });
      setMsg("Report uploaded.");
      setTitle("");
      setFileUrl("");
      setNotes("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Reports Archive</h1>
        <p className="text-ink-muted">Manage, upload and securely store your clinical documentation.</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      <div className="grid items-start gap-6 xl:grid-cols-3">
        <section className="space-y-4 xl:col-span-1">
          <form className="card-panel space-y-4" onSubmit={upload}>
            <h2 className="text-xl font-semibold text-ink">Upload New Report</h2>
            <div>
              <label className="label-text">Report title</label>
              <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Annual Blood Panel" required />
            </div>
            <div>
              <label className="label-text">File URL</label>
              <input
                className="input-field"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://example.com/report.pdf"
                required
              />
            </div>
            <div>
              <label className="label-text">Additional notes</label>
              <textarea
                className="input-field min-h-[90px]"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter diagnostic details or provider notes..."
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Upload Report
            </button>
          </form>

          <div className="card-panel border border-orange-200 bg-orange-50">
            <h3 className="font-semibold text-orange-700">HIPAA Compliant Storage</h3>
            <p className="mt-1 text-sm text-orange-700">Your report metadata is securely stored in your clinical profile.</p>
          </div>
        </section>

        <section className="space-y-4 xl:col-span-2">
          <div className="card-panel space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-ink">Recent Files</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`btn-secondary !py-2 ${viewMode === "grid" ? "!border-primary !text-primary" : ""}`}
                  onClick={() => setViewMode("grid")}
                >
                  Grid
                </button>
                <button
                  type="button"
                  className={`btn-secondary !py-2 ${viewMode === "list" ? "!border-primary !text-primary" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  List
                </button>
              </div>
            </div>

            {reports.length === 0 ? (
              <p className="text-ink-muted">No reports yet. Upload your first clinical file.</p>
            ) : viewMode === "list" ? (
              <ul className="space-y-3">
                {reports.map((r) => (
                  <li key={r._id} className="flex items-center justify-between gap-3 rounded-xl bg-primary/10 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-primary">{reportIcon(r.fileUrl)}</div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink">{r.title}</p>
                        <p className="text-xs text-ink-muted">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"} · {reportMeta(r.fileUrl)}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <a href={r.fileUrl} className="btn-secondary !px-3 !py-1.5" target="_blank" rel="noreferrer">
                        View
                      </a>
                      <a href={r.fileUrl} className="btn-secondary !px-3 !py-1.5" target="_blank" rel="noreferrer" download>
                        Download
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {reports.map((r) => (
                  <article key={r._id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-primary">{reportIcon(r.fileUrl)}</span>
                      <span className="text-xs text-ink-muted">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}</span>
                    </div>
                    <p className="mt-3 font-semibold text-ink">{r.title}</p>
                    <p className="mt-1 text-xs text-ink-muted">{reportMeta(r.fileUrl)}</p>
                    {r.notes && <p className="mt-2 text-sm text-ink-muted">{r.notes}</p>}
                    <div className="mt-3 flex gap-2">
                      <a href={r.fileUrl} className="btn-secondary !py-1.5" target="_blank" rel="noreferrer">
                        View
                      </a>
                      <a href={r.fileUrl} className="btn-secondary !py-1.5" target="_blank" rel="noreferrer" download>
                        Download
                      </a>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
