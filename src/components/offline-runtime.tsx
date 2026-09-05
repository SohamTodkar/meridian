"use client";
import { useEffect } from "react";
// Retire the previous offline shell so it cannot serve stale authenticated pages.
export function OfflineRuntime() {
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker
        .getRegistrations()
        .then(registrations => {
          for (const registration of registrations) {
            if (new URL(registration.scope).origin === location.origin)
              void registration.unregister();
          }
        })
        .catch(() => {});
  }, []);
  return null;
}
