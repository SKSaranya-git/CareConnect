import { useEffect, useRef, useState } from "react";
import { gateway } from "../../api/gateway";
import { useAuth } from "../../context/AuthContext";
import Alert from "../../components/ui/Alert";

export default function DoctorProfile() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    fullName: "",
    specialty: "",
    licenseNumber: "",
    experienceYears: 0,
    consultationFee: 0,
    hospital: "",
    location: "",
    bio: "",
    avatarUrl: ""
  });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.fullName) {
      setForm((f) => ({ ...f, fullName: user.fullName }));
    }
    gateway.doctors
      .getMe()
      .then((res) => {
        const p = res.data.profile;
        setForm((f) => ({
          ...f,
          fullName: p.fullName || f.fullName,
          specialty: p.specialty || "",
          licenseNumber: p.licenseNumber || "",
          experienceYears: p.experienceYears ?? 0,
          consultationFee: p.consultationFee ?? 0,
          hospital: p.hospital || "",
          location: p.location || "",
          bio: p.bio || "",
          avatarUrl: p.avatarUrl || ""
        }));
      })
      .catch(() => {
        /* No profile yet — form still editable; first PUT creates it */
      });
  }, [user]);

  function triggerPhotoPicker() {
    fileInputRef.current?.click();
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function compressAvatar(file) {
    const rawDataUrl = await fileToDataUrl(file);
    const image = await loadImage(rawDataUrl);
    const maxSize = 512;
    const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
    const width = Math.max(1, Math.round(image.width * ratio));
    const height = Math.max(1, Math.round(image.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return rawDataUrl;
    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.82);
  }

  function onPhotoSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large. Please choose one under 5MB.");
      return;
    }
    compressAvatar(file)
      .then((avatarUrl) => setForm((prev) => ({ ...prev, avatarUrl })))
      .catch(() => setError("Failed to process image. Try another file."));
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await gateway.doctors.putMe(form);
      setMsg("Profile saved. New doctors stay PENDING until an admin activates your account.");
    } catch (err) {
      setError(err.response?.data?.message || "Save failed.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Professional Profile</h1>
        <p className="text-sm text-ink-muted">Maintain trusted profile details so patients can choose you with confidence.</p>
      </div>

      <form className="grid gap-6 xl:grid-cols-3" onSubmit={save}>
        <div className="card-panel xl:col-span-1">
          <div className="flex flex-col items-center text-center">
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="Doctor profile" className="h-28 w-28 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 text-2xl font-bold text-slate-500">
                {(form.fullName || "DR").slice(0, 2).toUpperCase()}
              </div>
            )}
            <button type="button" className="btn-secondary mt-4" onClick={triggerPhotoPicker}>
              Upload profile picture
            </button>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={onPhotoSelected} />

            <div className="mt-5 w-full space-y-2 rounded-xl bg-slate-50 p-4 text-left">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Preview</p>
              <p className="font-semibold text-ink">{form.fullName || "Your display name"}</p>
              <p className="text-sm text-secondary">{form.specialty || "Specialty"}</p>
              <p className="text-xs text-ink-muted">{form.hospital || "Hospital / clinic"}</p>
            </div>
          </div>
        </div>

        <div className="card-panel space-y-4 xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label-text">Display name</label>
              <input className="input-field" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
            </div>
            <div>
              <label className="label-text">Specialty</label>
              <input className="input-field" value={form.specialty} onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))} required />
            </div>
            <div>
              <label className="label-text">License number</label>
              <input className="input-field" value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} required />
            </div>
            <div>
              <label className="label-text">Hospital / clinic</label>
              <input className="input-field" value={form.hospital} onChange={(e) => setForm((f) => ({ ...f, hospital: e.target.value }))} />
            </div>
            <div>
              <label className="label-text">Experience (years)</label>
              <input
                type="number"
                className="input-field"
                value={form.experienceYears}
                onChange={(e) => setForm((f) => ({ ...f, experienceYears: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="label-text">Consultation fee (LKR)</label>
              <input
                type="number"
                className="input-field"
                value={form.consultationFee}
                onChange={(e) => setForm((f) => ({ ...f, consultationFee: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <label className="label-text">Location</label>
            <input className="input-field" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div>
            <label className="label-text">Short bio</label>
            <textarea
              className="input-field min-h-[110px]"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Write 1-2 lines about your care approach and focus areas."
            />
          </div>

          {error && <Alert type="error">{error}</Alert>}
          {msg && <Alert type="success">{msg}</Alert>}
          <button type="submit" className="btn-primary w-full">
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
}
