"use client";

export function LoadingSpinner({ label }: { label?: string }) {
  return (
    <span className="research-status" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" style={{ marginRight: 8 }} />
      {label ?? "Working…"}
    </span>
  );
}
