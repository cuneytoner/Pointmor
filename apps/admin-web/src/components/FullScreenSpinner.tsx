import "../plus-shell.css";

export function FullScreenSpinner({ label }: { label: string }) {
  return (
    <div className="admin-loading-root" role="status" aria-live="polite">
      <div className="admin-loading__spinner" aria-hidden />
      <p className="admin-loading__text">{label}</p>
    </div>
  );
}
