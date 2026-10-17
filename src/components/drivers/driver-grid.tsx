"use client";

import Link from "next/link";
import { useState } from "react";
import { Star } from "lucide-react";
import type { Driver } from "@/lib/domain/types";
import { DriverAvatar } from "@/components/identity/driver-identity";
import { TeamIdentity } from "@/components/identity/team-identity";
import { CountryFlag } from "@/components/identity/country-flag";
import { usePrefs } from "@/components/preferences";
import { cn } from "@/lib/utils/cn";

export function DriverGrid({ drivers }: { drivers: Driver[] }) {
  const { isFavorite, toggleFavorite } = usePrefs();
  const [q, setQ] = useState("");
  const filtered = drivers.filter(
    (d) =>
      !q ||
      d.fullName.toLowerCase().includes(q.toLowerCase()) ||
      d.teamName.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="px-4 py-4 md:px-6">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filter drivers or teams"
        className="mb-4 h-9 w-64 border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm outline-none"
      />
      <div className="grid grid-cols-1 gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((d) => (
          <div key={d.driverNumber} className="panel group relative p-4">
            <button
              onClick={() => toggleFavorite("driver", d.driverNumber)}
              aria-label={isFavorite("driver", d.driverNumber) ? "Remove from favorites" : "Add to favorites"}
              className={cn(
                "absolute right-3 top-3 focus-visible:opacity-100",
                isFavorite("driver", d.driverNumber) ? "text-[var(--accent)]" : "text-[var(--ink-3)] opacity-0 transition-opacity group-hover:opacity-100",
              )}
            >
              <Star size={14} fill={isFavorite("driver", d.driverNumber) ? "currentColor" : "none"} />
            </button>
            <Link href={`/drivers/${d.driverNumber}`} className="block">
              <div className="flex items-center gap-3">
                <DriverAvatar src={d.headshotUrl} acronym={d.acronym} teamColour={d.teamColour} size={56} />
                <div>
                  <div className="font-mono text-2xl font-bold tnum leading-none">
                    {d.driverNumber}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-[var(--ink-3)]">
                    {d.acronym} <CountryFlag alpha3={d.countryCode} size={12} />
                  </div>
                </div>
              </div>
              <div className="mt-3 text-base font-semibold leading-tight">
                {d.firstName} <span className="uppercase">{d.lastName}</span>
              </div>
              <div className="mt-0.5">
                <TeamIdentity name={d.teamName} colour={d.teamColour} size="standard" />
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
