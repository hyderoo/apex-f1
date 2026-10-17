"use client";

import { useEffect, useState } from "react";

/** Shown only while the browser reports it is offline. */
export function OfflineNote() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="border border-[var(--warn)]/50 bg-[var(--surface-2)] px-4 py-2 text-xs text-[var(--warn)]">
      Offline — showing the cached copy of this page from your last visit.
    </div>
  );
}
