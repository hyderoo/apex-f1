"use client";

import { useState } from "react";
import { usePrefs } from "@/components/preferences";
import { useToast } from "@/components/ui/toast";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const TIMEZONES = [
  "Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura", "Asia/Singapore",
  "Europe/London", "Europe/Amsterdam", "Europe/Monaco", "America/New_York",
  "America/Los_Angeles", "Australia/Sydney", "Asia/Tokyo", "UTC",
];

export default function SettingsPage() {
  const { prefs, update, signedIn } = usePrefs();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [accountMsg, setAccountMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const sb = getSupabaseBrowser();

  return (
    <div>
      <div className="border-b border-[var(--line)] px-4 py-5 md:px-6">
        <div className="micro-label">Personal</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Settings</h1>
      </div>
      <div className="max-w-xl space-y-px px-4 py-4 md:px-6">
        <section className="panel p-4">
          <div className="micro-label mb-2">Display</div>
          <label className="block text-sm">
            <span className="text-[var(--ink-2)]">Timezone</span>
            <select
              value={prefs.timezone}
              onChange={(e) => {
                update({ timezone: e.target.value });
                toast("Timezone saved");
              }}
              className="mt-1 h-9 w-full border border-[var(--line)] bg-[var(--surface-2)] px-2 text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
              ))}
            </select>
          </label>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className="text-[var(--ink-2)]">Theme</span>
            <button
              onClick={() => update({ theme: prefs.theme === "dark" ? "light" : "dark" })}
              className="border border-[var(--line-2)] px-3 py-1 text-xs hover:bg-[var(--surface-3)]"
            >
              {prefs.theme === "dark" ? "Switch to light" : "Switch to dark"}
            </button>
          </div>
        </section>

        <section className="panel p-4">
          <div className="micro-label mb-2">Account</div>
          {!sb ? (
            <p className="text-sm text-[var(--ink-3)]">
              Accounts are disabled because Supabase is not configured for this
              deployment. Preferences and favorites are stored locally in your
              browser. See the README to enable Supabase Auth.
            </p>
          ) : signedIn ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-[var(--ink-2)]">Signed in. Favorites and preferences sync to your account.</p>
              <button
                onClick={async () => { await sb.auth.signOut(); toast("Signed out", "success"); }}
                className="border border-[var(--line-2)] px-3 py-1 text-xs hover:bg-[var(--surface-3)]"
              >
                Sign out
              </button>
            </div>
          ) : (
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setAccountMsg(null);
                try {
                  if (mode === "signin") {
                    const { error } = await sb.auth.signInWithPassword({ email, password });
                    if (error) {
                      setAccountMsg({
                        kind: "err",
                        text: error.message === "Email not confirmed"
                          ? "This account exists but its email is not confirmed yet. Open the confirmation link Supabase sent (check spam), then sign in."
                          : error.message,
                      });
                    }
                    // success flips the panel via the auth state listener
                  } else {
                    const { data, error } = await sb.auth.signUp({ email, password });
                    if (error) {
                      setAccountMsg({ kind: "err", text: error.message });
                    } else if (data.session) {
                      setAccountMsg({ kind: "ok", text: "Account created and signed in." });
                    } else {
                      setAccountMsg({
                        kind: "ok",
                        text: `Account created for ${email}. Supabase emailed a confirmation link — open it to activate the account, then sign in. Until then, signing in will say "Email not confirmed". Check spam if it does not arrive within a few minutes.`,
                      });
                    }
                  }
                } finally {
                  setBusy(false);
                }
              }}
            >
              {accountMsg && (
                <p
                  role="status"
                  className={`border px-3 py-2 text-xs leading-snug ${
                    accountMsg.kind === "err"
                      ? "border-[var(--accent)]/50 text-[var(--accent)]"
                      : "border-[var(--ok)]/50 text-[var(--ok)]"
                  }`}
                >
                  {accountMsg.text}
                </p>
              )}
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-9 w-full border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm"
              />
              <input
                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                className="h-9 w-full border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm"
              />
              <div className="flex items-center gap-2">
                <button type="submit" disabled={busy} className="bg-[var(--accent)] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                  {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="text-xs text-[var(--ink-3)] hover:text-[var(--ink)]"
                >
                  {mode === "signin" ? "Need an account?" : "Have an account?"}
                </button>
              </div>
            </form>
          )}
        </section>

        <section className="panel p-4">
          <div className="micro-label mb-2">Data sources</div>
          <p className="text-xs leading-relaxed text-[var(--ink-3)]">
            Timing, telemetry, weather and race control: OpenF1 (openf1.org).
            Schedule, results and standings: Jolpica F1 API. Every panel shows a
            provenance badge: LIVE, DELAYED, HISTORICAL, DEMO DATA or
            UNAVAILABLE. Provider status and live probes are on the{" "}
            <a href="/health" className="text-[var(--accent)] underline">Data Health</a> page
            (raw JSON at <a href="/api/health" className="text-[var(--accent)] underline">/api/health</a>).
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--ink-3)]">
            Driver portraits and circuit imagery are hotlinked from URLs supplied
            by the OpenF1 API (never re-hosted). Driver nationality flag images
            are served by flagcdn.com — credit:{" "}
            <a href="https://flagpedia.net" target="_blank" rel="noreferrer" className="text-[var(--accent)] underline">Flagpedia</a>.
            Team identities are typographic marks by design; no licensed logo source is used.
          </p>
        </section>
      </div>
    </div>
  );
}
