"use client";

import { useEffect, useState } from "react";

/**
 * Registers the offline service worker and announces readiness to assistive
 * technology. The initial state is identical on server and client (no
 * navigator branching in render), so hydration never mismatches; capability
 * is detected inside the effect.
 */
export function OfflineRuntime() {
  const [status, setStatus] = useState("Offline support is checking this device.");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      const timer = window.setTimeout(() => {
        setStatus("Offline support is unavailable in this browser. Meridian data remains local on this device.");
      }, 0);
      return () => window.clearTimeout(timer);
    }
    void navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then(() => setStatus("Offline support is ready. Meridian can reopen its local workspace when a connection is unavailable."))
      .catch(() => setStatus("Offline support could not be enabled. Meridian data remains local on this device."));
  }, []);

  return <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{status}</p>;
}
