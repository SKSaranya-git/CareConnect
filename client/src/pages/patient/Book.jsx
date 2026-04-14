import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";

export default function PatientBook() {
  const [searchParams] = useSearchParams();
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const slots = ["09:00", "10:30", "13:15", "14:45", "16:00", "17:30"];

  useEffect(() => {
    let active = true;
    gateway.doctors
      .list({})
      .then((r) => {
        if (active) {
          const docs = r.data.doctors || [];
          setDoctors(docs);
          const preselectedDoctorId = searchParams.get("doctorId");
          if (preselectedDoctorId && docs.some((d) => d.userId === preselectedDoctorId)) {
            setDoctorId(preselectedDoctorId);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [searchParams]);

  const selectedDoctor = doctors.find((d) => d.userId === doctorId) || null;

  const bookingDateTime = useMemo(() => {
    if (!appointmentDate || !appointmentTime) return "";
    const dt = new Date(`${appointmentDate}T${appointmentTime}:00`);
    if (Number.isNaN(dt.getTime())) return "";
    return dt;
  }, [appointmentDate, appointmentTime]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (!doctorId || !bookingDateTime) {
      setError("Doctor and date/time are required.");
      return;
    }
    if (bookingDateTime.getTime() < Date.now()) {
      setError("Please choose a future date and time.");
      return;
    }
    try {
      const iso = bookingDateTime.toISOString();
      await gateway.appointments.create({ doctorId, appointmentDateTime: iso, reason });
      setMsg("Appointment booked. Check notifications and appointments list.");
      setReason("");
    } catch (err) {
      setError(err.response?.data?.message || "Booking failed.");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Schedule Your Visit</h1>
        <p className="text-ink-muted">Find a time that works for your wellness journey.</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <form className="card-panel space-y-5 lg:col-span-2" onSubmit={submit}>
          <div>
            <label className="label-text">Select specialist</label>
            <select className="input-field" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} required>
              <option value="">Choose doctor</option>
              {doctors.map((d) => (
                <option key={d._id} value={d.userId}>
                  {(d.fullName || "Doctor") + " - " + (d.specialty || "General")}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label-text">Select date</label>
              <input
                type="date"
                className="input-field"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
            <div>
              <label className="label-text">Available slots</label>
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      appointmentTime === slot
                        ? "border-primary bg-primary text-white"
                        : "border-slate-200 bg-slate-50 text-ink hover:bg-slate-100"
                    }`}
                    onClick={() => setAppointmentTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label-text">Reason for visit</label>
            <textarea
              className="input-field min-h-[110px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe your symptoms or purpose of this appointment..."
            />
          </div>

          {error && <Alert type="error">{error}</Alert>}
          {msg && <Alert type="success">{msg}</Alert>}

          <button type="submit" className="btn-primary w-full" disabled={!doctorId || !appointmentDate || !appointmentTime}>
            Confirm booking
          </button>
        </form>

        <aside className="space-y-4">
          <div className="card-panel bg-primary/10">
            <h3 className="font-semibold text-ink">Booking Summary</h3>
            <div className="mt-3 space-y-2 text-sm">
              <p>
                <span className="text-ink-muted">Specialist:</span>{" "}
                <span className="font-semibold text-ink">{selectedDoctor?.fullName || "Not selected"}</span>
              </p>
              <p>
                <span className="text-ink-muted">Time:</span>{" "}
                <span className="font-semibold text-ink">
                  {bookingDateTime ? bookingDateTime.toLocaleString() : "Choose date and slot"}
                </span>
              </p>
            </div>
          </div>
          <div className="card-panel">
            <h3 className="font-semibold text-ink">Booking tips</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted">
              <li className="rounded-lg border border-slate-100 bg-slate-50 p-3">Bring your physical insurance card.</li>
              <li className="rounded-lg border border-slate-100 bg-slate-50 p-3">Arrive 10 minutes early for check-in.</li>
              <li className="rounded-lg border border-slate-100 bg-slate-50 p-3">Keep your recent medical history updated.</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
