/*
 * APEX F1 service worker. Scope is deliberately narrow: it caches the Race
 * Analysis page (latest round results, historical data) so it stays readable
 * offline after the first visit. Nothing else is intercepted.
 */
const CACHE = "apex-race-results-v1";
const CACHED_PATHS = ["/analysis"];

self.addEventListener("install", (event) => {
  // The first visit's document never passes through the worker (it activates
  // after load), so precache the page here; later visits refresh the copy.
  event.waitUntil(
    caches.open(CACHE).then((c) => c.add("/analysis")).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (!CACHED_PATHS.includes(url.pathname)) return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        return cached ?? Response.error();
      }),
  );
});

/* ---- Push notifications (session reminders) ---- */

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); } catch { return; }
  const title = typeof payload.title === "string" ? payload.title : "APEX F1";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: typeof payload.body === "string" ? payload.body : "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: typeof payload.tag === "string" ? payload.tag : undefined,
      data: { url: typeof payload.url === "string" ? payload.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) { w.navigate(url); return w.focus(); }
      }
      return clients.openWindow(url);
    }),
  );
});
