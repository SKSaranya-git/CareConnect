import { useMemo, useState } from "react";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";

const HISTORY_KEY = "careconnect_ai_history_v1";

function loadHistory() {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

export default function PatientAI() {
  const [symptoms, setSymptoms] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(loadHistory);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const commonTrends = useMemo(() => {
    const countByCondition = history.reduce((acc, item) => {
      const key = item.possibleCondition || "Unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(countByCondition)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [history]);

  function formatLabel(value) {
    if (!value) return "low";
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function priorityTone(priority) {
    if (priority === "high") return "bg-red-100 text-red-700";
    if (priority === "medium") return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  }

  async function analyze(e) {
    e.preventDefault();
    if (!symptoms.trim()) {
      setError("Please describe your symptoms.");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await gateway.ai.symptomChecker({ symptoms });
      const nextResult = res.data;
      setResult(nextResult);

      const nextHistory = [
        {
          id: Date.now(),
          symptoms,
          possibleCondition: nextResult.possibleCondition,
          recommendedSpecialty: nextResult.recommendedSpecialty,
          confidence: nextResult.confidence,
          triagePriority: nextResult.triagePriority,
          createdAt: new Date().toISOString()
        },
        ...history
      ].slice(0, 8);
      setHistory(nextHistory);
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    } catch (err) {
      setError(err.response?.data?.message || "AI service unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/10 bg-gradient-to-r from-primary/5 via-white to-secondary/5 p-5">
        <h1 className="font-display text-3xl font-bold text-ink">AI Symptom Checker</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Clinical triage assistant for quick guidance. Enter clear symptoms, duration, and severity for best results.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <form className="card-panel space-y-4" onSubmit={analyze}>
            <div className="flex items-center justify-between">
              <label className="label-text !mb-0">Patient Input</label>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">HIPAA-compliant demo</span>
            </div>
            <textarea
              className="input-field min-h-[150px]"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="e.g. I have had lower back pain and mild fever since yesterday morning."
              required
            />
            {error && <Alert type="error">{error}</Alert>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? "Analyzing Symptoms..." : "Analyze Symptoms"}
            </button>
          </form>

          {result && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="card-panel border-primary/10">
                <p className="text-xs uppercase tracking-wide text-ink-muted">Possible Condition</p>
                <p className="mt-2 text-lg font-semibold text-ink">{result.possibleCondition}</p>
                <p className="mt-3 text-sm text-ink-muted">Recommended Specialty</p>
                <p className="font-medium text-ink">{result.recommendedSpecialty}</p>
              </div>
              <div className="card-panel border-primary/10">
                <p className="text-xs uppercase tracking-wide text-ink-muted">Clinical Logic</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-ink">
                    Confidence: {formatLabel(result.confidence)}
                  </span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityTone(result.triagePriority)}`}>
                    Priority: {formatLabel(result.triagePriority)}
                  </span>
                </div>
                <p className="mt-3 text-xs text-ink-muted">
                  Matched keywords: {result.matchedKeywords?.length ? result.matchedKeywords.join(", ") : "None"}
                </p>
              </div>
              <div className="card-panel md:col-span-2">
                <p className="text-xs uppercase tracking-wide text-ink-muted">Safety Notes</p>
                <p className="mt-2 text-sm text-ink">{result.note || "Always consult a licensed clinician."}</p>
                {Array.isArray(result.suggestions) && result.suggestions.length > 0 && (
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
                    {result.suggestions.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <div className="card-panel space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-ink">Recent Analysis</h2>
              {history.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary !py-2"
                  onClick={() => {
                    setHistory([]);
                    window.localStorage.removeItem(HISTORY_KEY);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-ink-muted">No previous analysis yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {history.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="font-semibold text-ink">{item.possibleCondition}</p>
                    <p className="text-sm text-ink-muted">{item.recommendedSpecialty}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {new Date(item.createdAt).toLocaleString()} · {formatLabel(item.confidence)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card-panel">
            <h3 className="font-semibold text-ink">Priority First</h3>
            <p className="mt-2 text-sm text-ink-muted">
              {result?.triagePriority === "high"
                ? "Potential high-priority symptom pattern detected. Seek urgent medical care."
                : "No high-priority warning detected from the current input."}
            </p>
          </div>
          <div className="card-panel">
            <h3 className="font-semibold text-ink">Common Trends</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {commonTrends.length === 0 ? (
                <span className="text-sm text-ink-muted">No trend data yet.</span>
              ) : (
                commonTrends.map(([condition, count]) => (
                  <span key={condition} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {condition} ({count})
                  </span>
                ))
              )}
            </div>
          </div>
          <div className="card-panel border border-red-100 bg-red-50">
            <h3 className="font-semibold text-red-700">Need Immediate Help?</h3>
            <p className="mt-2 text-sm text-red-700">
              If symptoms are severe (chest pain, breathing difficulty, confusion, or collapse), contact emergency services now.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
