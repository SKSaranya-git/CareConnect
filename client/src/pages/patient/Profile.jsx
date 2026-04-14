import { useEffect, useMemo, useRef, useState } from "react";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";
import { useAuth } from "../../context/AuthContext";

export default function PatientProfile() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    avatarUrl: "",
    profession: "",
    phone: "",
    address: "",
    gender: "FEMALE",
    bloodGroup: "",
    dateOfBirth: "",
    medicalHistory: ""
  });
  const [savedForm, setSavedForm] = useState(null);
  const [profileCreatedAt, setProfileCreatedAt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  function toFormData(profile) {
    if (!profile) {
      return {
        avatarUrl: "",
        profession: "",
        phone: "",
        address: "",
        gender: "FEMALE",
        bloodGroup: "",
        dateOfBirth: "",
        medicalHistory: ""
      };
    }
    return {
      avatarUrl: profile.avatarUrl || "",
      profession: profile.profession || "",
      phone: profile.phone || "",
      address: profile.address || "",
      gender: profile.gender || "FEMALE",
      bloodGroup: profile.bloodGroup || "",
      dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth).slice(0, 10) : "",
      medicalHistory: Array.isArray(profile.medicalHistory) ? profile.medicalHistory.join(", ") : ""
    };
  }

  useEffect(() => {
    gateway.patients
      .getMe()
      .then((res) => {
        const next = toFormData(res.data.profile);
        setForm(next);
        setSavedForm(next);
        setProfileCreatedAt(res.data.profile?.createdAt || "");
      })
      .catch(() => {
        const empty = toFormData(null);
        setForm(empty);
        setSavedForm(empty);
        setProfileCreatedAt("");
      });
  }, []);

  const age = useMemo(() => {
    if (!form.dateOfBirth) return "—";
    const dob = new Date(form.dateOfBirth);
    if (Number.isNaN(dob.getTime())) return "—";
    const now = new Date();
    let years = now.getFullYear() - dob.getFullYear();
    const hasBirthdayPassed =
      now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
    if (!hasBirthdayPassed) years -= 1;
    return years >= 0 ? String(years) : "—";
  }, [form.dateOfBirth]);

  const memberSince = useMemo(() => {
    if (!profileCreatedAt) return "";
    const date = new Date(profileCreatedAt);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(undefined, { month: "long", year: "numeric" });
  }, [profileCreatedAt]);

  function genderLabel(gender) {
    if (gender === "MALE") return "Male";
    if (gender === "FEMALE") return "Female";
    if (gender === "OTHER") return "Other";
    return "—";
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Not provided";
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Not provided";
    return date.toLocaleDateString();
  }

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
      .then((avatarUrl) => {
        setForm((prev) => ({ ...prev, avatarUrl }));
      })
      .catch(() => {
        setError("Failed to process image. Try another file.");
      });
  }

  function beginEdit() {
    setMsg("");
    setError("");
    setIsEditing(true);
  }

  function cancelEdit() {
    setMsg("");
    setError("");
    setForm(savedForm || toFormData(null));
    setIsEditing(false);
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      const payload = {
        ...form,
        medicalHistory: form.medicalHistory
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      };
      await gateway.patients.putMe(payload);
      setMsg("Profile saved.");
      setSavedForm(form);
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Save failed.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Patient Profile Center</h1>
          <p className="text-ink-muted">Keep your personal and medical details accurate for safer consultations.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary !py-2" onClick={() => window.print()}>
            Print summary
          </button>
          {!isEditing ? (
            <button type="button" className="btn-primary !py-2" onClick={beginEdit}>
              Edit profile
            </button>
          ) : (
            <button type="button" className="btn-secondary !py-2" onClick={cancelEdit}>
              Discard changes
            </button>
          )}
        </div>
      </div>
      <form className="grid gap-6 xl:grid-cols-3" onSubmit={save}>
        <aside className="space-y-4">
          <div className="card-panel text-center">
            <div className="relative mx-auto h-24 w-24">
              {form.avatarUrl ? (
                <img src={form.avatarUrl} alt="Profile" className="h-24 w-24 rounded-full object-cover" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
                  {(user?.fullName || "P").charAt(0).toUpperCase()}
                </div>
              )}
              <button
                type="button"
                className="absolute -bottom-1 right-0 rounded-full bg-primary px-2 py-1 text-xs font-semibold text-white"
                onClick={() => {
                  if (!isEditing) setIsEditing(true);
                  triggerPhotoPicker();
                }}
              >
                +
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPhotoSelected} />
            </div>
            <p className="mt-3 text-xl font-semibold text-ink">{user?.fullName || "Patient"}</p>
            <p className="text-sm text-ink-muted">
              {memberSince ? `Patient since ${memberSince}` : "Patient"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="card-panel py-4 text-center">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Blood group</p>
              <p className="mt-1 text-xl font-bold text-primary">{form.bloodGroup || "—"}</p>
            </div>
            <div className="card-panel py-4 text-center">
              <p className="text-xs uppercase tracking-wide text-ink-muted">Age</p>
              <p className="mt-1 text-xl font-bold text-primary">{age}</p>
            </div>
          </div>
          <div className="card-panel space-y-3">
            <h3 className="font-semibold text-ink">Security Status</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Email Verified</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">2FA Security</span>
              <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">OFF</span>
            </div>
          </div>
        </aside>

        <section className="card-panel space-y-4 xl:col-span-2">
          <div>
            <h2 className="font-semibold text-ink">Personal details</h2>
            <p className="text-sm text-ink-muted">Official information used for medical billing and records.</p>
          </div>
          {isEditing ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label-text">Profession</label>
                  <input
                    className="input-field"
                    value={form.profession}
                    onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))}
                    placeholder="e.g. Software Engineer"
                  />
                </div>
                <div>
                  <label className="label-text">Phone</label>
                  <input className="input-field" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label-text">Date of birth</label>
                  <input
                    type="date"
                    className="input-field"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label-text">Gender</label>
                  <select className="input-field" value={form.gender} onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}>
                    <option value="FEMALE">Female</option>
                    <option value="MALE">Male</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-text">Address</label>
                <input className="input-field" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label className="label-text">Blood group</label>
                <input className="input-field" value={form.bloodGroup} onChange={(e) => setForm((f) => ({ ...f, bloodGroup: e.target.value }))} />
              </div>
              <div>
                <label className="label-text">Medical history (comma separated)</label>
                <input
                  className="input-field"
                  value={form.medicalHistory}
                  onChange={(e) => setForm((f) => ({ ...f, medicalHistory: e.target.value }))}
                />
              </div>
            </>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="text-xs uppercase text-ink-muted">Profession</p>
                <p className="font-medium text-ink">{form.profession || "Not provided"}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="text-xs uppercase text-ink-muted">Phone number</p>
                <p className="font-medium text-ink">{form.phone || "Not provided"}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="text-xs uppercase text-ink-muted">Date of birth</p>
                <p className="font-medium text-ink">{formatDate(form.dateOfBirth)}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="text-xs uppercase text-ink-muted">Gender</p>
                <p className="font-medium text-ink">{genderLabel(form.gender)}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3 md:col-span-2">
                <p className="text-xs uppercase text-ink-muted">Home address</p>
                <p className="font-medium text-ink">{form.address || "Not provided"}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="text-xs uppercase text-ink-muted">Blood group</p>
                <p className="font-medium text-ink">{form.bloodGroup || "Not provided"}</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3">
                <p className="text-xs uppercase text-ink-muted">Medical history</p>
                <p className="font-medium text-ink">{form.medicalHistory || "Not provided"}</p>
              </div>
            </div>
          )}
          <div className="grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-ink-muted">Email</p>
              <p className="font-medium text-ink">{user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-ink-muted">Role</p>
              <p className="font-medium text-ink">{user?.role || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-ink-muted">Gender</p>
              <p className="font-medium text-ink">{genderLabel(form.gender)}</p>
            </div>
          </div>
          {isEditing && (
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary !py-2" onClick={cancelEdit}>
                Discard changes
              </button>
              <button type="submit" className="btn-primary !py-2">
                Save profile details
              </button>
            </div>
          )}
          {error && <Alert type="error">{error}</Alert>}
          {msg && <Alert type="success">{msg}</Alert>}
        </section>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card-panel">
          <p className="text-sm font-semibold text-ink">Insurance</p>
          <p className="mt-1 text-sm text-ink-muted">Active - Platinum Plus</p>
          <p className="mt-2 text-xs font-semibold text-primary">View policy</p>
        </div>
        <div className="card-panel">
          <p className="text-sm font-semibold text-ink">Allergies</p>
          <p className="mt-1 text-sm text-ink-muted">
            {form.medicalHistory ? form.medicalHistory : "Add known allergies in medical history"}
          </p>
        </div>
      </div>
    </div>
  );
}
