import { useEffect, useState } from "react";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";

const defaultSlots = [
  { day: "Monday", startTime: "09:00", endTime: "12:00", isAvailable: true },
  { day: "Wednesday", startTime: "14:00", endTime: "17:00", isAvailable: true }
];

export default function DoctorAvailability() {
  const [availability, setAvailability] = useState(defaultSlots);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    gateway.doctors
      .getMe()
      .then((res) => {
        if (res.data.profile?.availability?.length) {
          setAvailability(res.data.profile.availability);
        }
      })
      .catch(() => {});
  }, []);

  function updateRow(i, key, val) {
    setAvailability((rows) => rows.map((r, j) => (j === i ? { ...r, [key]: val } : r)));
  }

  function addSlot() {
    setAvailability((rows) => [...rows, { day: "Friday", startTime: "09:00", endTime: "12:00", isAvailable: true }]);
  }

  function removeSlot(i) {
    setAvailability((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function save() {
    setError("");
    setMsg("");
    try {
      await gateway.doctors.putAvailability({ availability });
      setMsg("Availability saved.");
    } catch (e) {
      setError(e.response?.data?.message || "Save failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Availability Settings</h1>
          <p className="text-sm text-ink-muted">Define your weekly clinical consultation windows.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary !py-2" onClick={addSlot}>
            + Add Slot
          </button>
          <button type="button" className="btn-primary !py-2" onClick={save}>
            Save Availability
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {availability.map((row, i) => (
          <article key={i} className="card-panel space-y-3">
            <div className="flex items-center justify-between">
              <input className="input-field !h-10 font-semibold" value={row.day} onChange={(e) => updateRow(i, "day", e.target.value)} />
              <button type="button" className="text-xs font-semibold text-red-500" onClick={() => removeSlot(i)}>
                Remove
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="input-field" value={row.startTime} onChange={(e) => updateRow(i, "startTime", e.target.value)} />
              <input className="input-field" value={row.endTime} onChange={(e) => updateRow(i, "endTime", e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={row.isAvailable} onChange={(e) => updateRow(i, "isAvailable", e.target.checked)} />
              Working day
            </label>
          </article>
        ))}
      </div>

      <div className="card-panel bg-gradient-to-r from-primary to-primary-dark text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-white/80">Optimization Suggestion</p>
            <p className="text-sm text-white/90">Adding one extra Friday morning slot can reduce wait times by up to 23%.</p>
          </div>
          <button type="button" className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary" onClick={addSlot}>
            Apply Slot
          </button>
        </div>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}
    </div>
  );
}
