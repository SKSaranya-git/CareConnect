export default function Spinner({ className = "h-8 w-8" }) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-primary border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
