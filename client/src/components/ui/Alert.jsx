export default function Alert({ type = "info", children, onClose }) {
  const styles = {
    info: "bg-primary/10 text-primary border-primary/20",
    success: "bg-accent/10 text-emerald-800 border-accent/30",
    error: "bg-red-50 text-red-800 border-red-200",
    warn: "bg-amber-50 text-amber-900 border-amber-200"
  };
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${styles[type] || styles.info}`}
      role="alert"
    >
      <div className="flex-1">{children}</div>
      {onClose && (
        <button type="button" className="shrink-0 font-medium opacity-70 hover:opacity-100" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
}
