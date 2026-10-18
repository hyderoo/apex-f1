"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { usePrefs } from "@/components/preferences";
import { useToast } from "@/components/ui/toast";
import { LEAD_MINUTES_OPTIONS, SESSION_KINDS, type SessionKind } from "@/lib/f1/push-dispatch";

const KIND_LABELS: Record<SessionKind, string> = {
  race: "Race", sprint: "Sprint", qualifying: "Qualifying", practice: "Practice",
};
const PREFS_KEY = "apex-f1:push-prefs";

interface LocalPushPrefs { sessionKinds: SessionKind[]; leadMinutes: number; onlyFavCircuits: boolean }

function loadLocal(): LocalPushPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { sessionKinds: ["race"], leadMinutes: 30, onlyFavCircuits: false, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { sessionKinds: ["race"], leadMinutes: 30, onlyFavCircuits: false };
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * Session notifications via Web Push. Honest states throughout: unsupported
 * browser, deployment without VAPID keys, browser-blocked permission and a
 * working subscribe/unsubscribe flow. Delivery itself is best-effort (the
 * dispatcher runs every 15 minutes from GitHub Actions; schedule delays and
 * provider outages can delay or drop a notification).
 */
export function NotificationsSection() {
  const { prefs } = usePrefs();
  const toast = useToast();
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [local, setLocal] = useState<LocalPushPrefs>({ sessionKinds: ["race"], leadMinutes: 30, onlyFavCircuits: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      // Deferred into a microtask so the effect body stays free of sync setState.
      await Promise.resolve();
      if (cancelled) return;
      setSupported(ok);
      if (!ok) return;
      setPermission(Notification.permission);
      setLocal(loadLocal());
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setSubscription(sub);
      } catch {
        if (!cancelled) setSubscription(null);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveToServer = useCallback(async (sub: PushSubscription, l: LocalPushPrefs) => {
    const key = sub.getKey("p256dh");
    const auth = sub.getKey("auth");
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: {
          p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : "",
          auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : "",
        },
        timezone: prefs.timezone,
        sessionKinds: l.sessionKinds,
        leadMinutes: l.leadMinutes,
        circuitKeys: l.onlyFavCircuits ? prefs.favoriteCircuits : [],
      }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? `HTTP ${res.status}`);
    localStorage.setItem(PREFS_KEY, JSON.stringify(l));
  }, [prefs.timezone, prefs.favoriteCircuits]);

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });
      await saveToServer(sub, local);
      setSubscription(sub);
      toast("Session notifications on", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not enable notifications", "error");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!subscription) return;
    setBusy(true);
    try {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      }).catch(() => {});
      await subscription.unsubscribe().catch(() => {});
      setSubscription(null);
      toast("Session notifications off", "success");
    } finally {
      setBusy(false);
    }
  };

  const savePrefs = async (next: LocalPushPrefs) => {
    setLocal(next);
    if (!subscription) { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); return; }
    setBusy(true);
    try {
      await saveToServer(subscription, next);
      toast("Notification preferences saved", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not save", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel p-4">
      <div className="micro-label mb-2 flex items-center gap-1.5">
        <BellRing size={12} /> Session notifications
      </div>
      {supported === null ? null : !supported ? (
        <p className="text-sm text-[var(--ink-3)]">
          This browser does not support push notifications. On iOS, install
          APEX F1 to your Home Screen first — Safari only delivers push to
          installed web apps.
        </p>
      ) : !vapidKey ? (
        <p className="text-sm text-[var(--ink-3)]">
          Notifications are disabled because push is not configured for this
          deployment (NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set). See the README
          to enable session notifications.
        </p>
      ) : permission === "denied" ? (
        <p className="text-sm text-[var(--ink-3)]">
          Notifications are blocked for this site in your browser settings.
          Allow them there, then reload this page.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-[var(--ink-3)]">
            Get a push notification before sessions start. Delivery is
            best-effort: the dispatcher runs every 15 minutes, so a
            notification can arrive a few minutes late or be dropped if the
            schedule is delayed.
          </p>
          {!subscription ? (
            <button
              onClick={enable} disabled={busy}
              className="bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Working…" : "Enable notifications"}
            </button>
          ) : (
            <>
              <div className="flex flex-wrap gap-3 text-sm">
                {SESSION_KINDS.map((k) => (
                  <label key={k} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={local.sessionKinds.includes(k)}
                      onChange={(e) => {
                        const kinds = e.target.checked
                          ? [...local.sessionKinds, k]
                          : local.sessionKinds.filter((x) => x !== k);
                        if (kinds.length > 0) savePrefs({ ...local, sessionKinds: kinds });
                      }}
                    />
                    {KIND_LABELS[k]}
                  </label>
                ))}
              </div>
              <label className="block text-sm">
                <span className="text-[var(--ink-2)]">Notify me</span>
                <select
                  value={local.leadMinutes}
                  onChange={(e) => savePrefs({ ...local, leadMinutes: Number(e.target.value) })}
                  className="ml-2 h-8 border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
                >
                  {LEAD_MINUTES_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m} min before</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={local.onlyFavCircuits}
                  disabled={prefs.favoriteCircuits.length === 0}
                  onChange={(e) => savePrefs({ ...local, onlyFavCircuits: e.target.checked })}
                />
                <span className={prefs.favoriteCircuits.length === 0 ? "text-[var(--ink-3)]" : ""}>
                  Only at my favourite circuits
                  {prefs.favoriteCircuits.length === 0 && " (star a circuit first)"}
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const res = await fetch("/api/push/test", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ endpoint: subscription.endpoint }),
                      });
                      const body = await res.json().catch(() => ({}));
                      if (res.ok) toast("Test notification sent — it should arrive within seconds", "success");
                      else toast(body?.error ?? `Test failed (HTTP ${res.status})`, "error");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy}
                  className="border border-[var(--accent)] px-3 py-1 text-xs text-[var(--accent)] hover:bg-[var(--surface-3)] disabled:opacity-50"
                >
                  Send a test notification
                </button>
                <button
                  onClick={disable} disabled={busy}
                  className="border border-[var(--line-2)] px-3 py-1 text-xs hover:bg-[var(--surface-3)] disabled:opacity-50"
                >
                  Turn off notifications
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
