import { useCallback, useEffect, useRef, useState } from "react";
import { gateway } from "../../api/gateway";
import Alert from "../../components/ui/Alert";
import Spinner from "../../components/ui/Spinner";

export default function AdminNotifications() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [userId, setUserId] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [smsTo, setSmsTo] = useState("");
  const [subject, setSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [smsMessage, setSmsMessage] = useState("");
  const emailToInputRef = useRef(null);
  const smsToInputRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await gateway.notifications.all();
      setLogs(res.data.notifications || []);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendEmail(e) {
    e.preventDefault();
    setMsg("");
    setError("");
    const to = String(emailToInputRef.current?.value ?? emailTo).trim();
    const bodyMessage = emailMessage.trim();
    if (!bodyMessage) {
      setError("Message is required.");
      return;
    }
    try {
      const res = await gateway.notifications.email({
        userId: userId.trim() || undefined,
        to: to || undefined,
        subject: subject.trim() || undefined,
        message: bodyMessage
      });
      setMsg(res.data.delivery?.ok ? "Email delivered via provider." : `Email queued. ${res.data.delivery?.reason || ""}`.trim());
      setEmailMessage("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Request failed.");
    }
  }

  async function sendSms(e) {
    e.preventDefault();
    setMsg("");
    setError("");
    const to = String(smsToInputRef.current?.value ?? smsTo).trim();
    const bodyMessage = smsMessage.trim();
    if (!bodyMessage) {
      setError("Message is required.");
      return;
    }
    try {
      const res = await gateway.notifications.sms({
        userId: userId.trim() || undefined,
        to: to || undefined,
        message: bodyMessage
      });
      setMsg(res.data.delivery?.ok ? "SMS delivered via provider." : `SMS queued. ${res.data.delivery?.reason || ""}`.trim());
      setSmsMessage("");
      await load();
    } catch (err) {
      setError(err.response?.data?.message || "Request failed.");
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold text-ink">Notifications</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="card-panel space-y-4" onSubmit={sendEmail}>
          <h2 className="font-semibold text-ink">Test email delivery</h2>
          <p className="text-sm text-ink-muted">If provider credentials are configured, this sends real email. Otherwise it queues a log.</p>
          <div>
            <label className="label-text">Target user ID (optional)</label>
            <input className="input-field" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Defaults to you" />
          </div>
          <div>
            <label className="label-text">Recipient email (required when Resend is enabled)</label>
            <input
              ref={emailToInputRef}
              className="input-field"
              type="email"
              name="adminNotifyEmailTo"
              autoComplete="email"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="label-text">Subject</label>
            <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="CareConnect Notification" />
          </div>
          <div>
            <label className="label-text">Message</label>
            <textarea className="input-field min-h-[100px]" value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary">
            Send email
          </button>
        </form>
        <form className="card-panel space-y-4" onSubmit={sendSms}>
          <h2 className="font-semibold text-ink">Test SMS delivery</h2>
          <p className="text-sm text-ink-muted">If Twilio credentials are configured, this sends real SMS. Otherwise it queues a log.</p>
          <div>
            <label className="label-text">Recipient phone (required when Twilio is enabled)</label>
            <input
              ref={smsToInputRef}
              className="input-field"
              name="adminNotifySmsTo"
              autoComplete="tel"
              value={smsTo}
              onChange={(e) => setSmsTo(e.target.value)}
              placeholder="+9477XXXXXXX"
            />
          </div>
          <div>
            <label className="label-text">Message</label>
            <textarea className="input-field min-h-[100px]" value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} required />
          </div>
          <button type="submit" className="btn-teal">
            Send SMS
          </button>
        </form>
      </div>
      {error && <Alert type="error">{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-ink">Recent logs</h2>
          <button type="button" className="btn-secondary !py-2" onClick={load}>
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <ul className="max-h-[400px] space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-sm">
            {logs.map((n) => (
              <li key={n._id} className="rounded-lg border border-slate-100 px-3 py-2">
                <span className="font-medium text-primary">{n.channel}</span>
                <span className="text-ink-muted"> · {n.userId}</span>
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{n.status}</span>
                <p className="text-ink">{n.message}</p>
                <p className="text-xs text-ink-muted">{new Date(n.createdAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
