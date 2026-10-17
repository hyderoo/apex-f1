"use client";

import Link from "next/link";
import { TeamIdentity } from "@/components/identity/team-identity";
import { usePrefs } from "@/components/preferences";
import { Star } from "lucide-react";

export default function FavoritesPage() {
  const { prefs, toggleFavorite } = usePrefs();
  const hasAny =
    prefs.favoriteDrivers.length + prefs.favoriteTeams.length + prefs.favoriteCircuits.length > 0;
  return (
    <div>
      <div className="border-b border-[var(--line)] px-4 py-5 md:px-6">
        <div className="micro-label">Personal</div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Favorites</h1>
        <p className="mt-1 text-sm text-[var(--ink-2)]">
          Saved locally in your browser. Sign in on the settings page to sync them to your account.
        </p>
      </div>
      <div className="px-4 py-4 md:px-6">
        {!hasAny && (
          <div className="panel panel-ticks p-8 text-center text-sm text-[var(--ink-3)]">
            No favorites yet — tap the star on any driver, team or circuit.
          </div>
        )}
        {prefs.favoriteDrivers.length > 0 && (
          <section className="mb-6">
            <div className="micro-label mb-2">Drivers</div>
            <div className="flex flex-wrap gap-2">
              {prefs.favoriteDrivers.map((n) => (
                <span key={n} className="panel flex items-center gap-2 px-3 py-1.5 text-sm">
                  <Link href={`/drivers/${n}`} className="hover:text-[var(--accent)]">Driver #{n}</Link>
                  <button onClick={() => toggleFavorite("driver", n)} aria-label="Remove" className="text-[var(--ink-3)] hover:text-[var(--accent)]">
                    <Star size={12} fill="currentColor" />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}
        {prefs.favoriteTeams.length > 0 && (
          <section className="mb-6">
            <div className="micro-label mb-2">Teams</div>
            <div className="flex flex-wrap gap-2">
              {prefs.favoriteTeams.map((t) => (
                <span key={t} className="panel flex items-center gap-2 px-3 py-1.5 text-sm">
                  <Link href={`/teams/${encodeURIComponent(t)}`} className="hover:text-[var(--accent)]"><TeamIdentity name={t} size="standard" /></Link>
                  <button onClick={() => toggleFavorite("team", t)} aria-label="Remove" className="text-[var(--ink-3)] hover:text-[var(--accent)]">
                    <Star size={12} fill="currentColor" />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
