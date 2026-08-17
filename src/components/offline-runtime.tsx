"use client";

import { useEffect, useState } from "react";

export function OfflineRuntime() {
  const [status, setStatus] = useState(() =>
    typeof navigator !== "undefined" && !("serviceWorker" in navigator)
      ? "Offline support is unavailable in this browser. Meridian data remains local on this device."
      : "Offline support is checking this device."
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then(() => setStatus("Offline support is ready. Meridian can reopen its local workspace when a connection is unavailable."))
      .catch(() => setStatus("Offline support could not be enabled. Meridian data remains local on this device."));
  }, []);

  return <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{status}</p>;
}
