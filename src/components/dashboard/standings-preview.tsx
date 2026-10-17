"use client";

import { useQuery } from "@tanstack/react-query";
import type { DriverStanding } from "@/lib/domain/types";
import { Skeleton } from "@/components/ui/skeleton";

export function StandingsPreview() {
  const { data, isPending } = useQuery<{ drivers: DriverStanding[] }>({
    queryKey: ["standings"],
    queryFn: async () => {
      const res = await fetch("/api/standings");
      if (!res.ok) throw new Error("standings failed");
      return res.json();
    },
    staleTime: 300_000,
  });
  if (isPending) return <Skeleton className="h-48 w-full" />;
  const rows = (data?.drivers ?? []).slice(0, 5);
  if (rows.length === 0) return <div className="p-4 text-xs text-[var(--ink-3)]">Standings unavailable.</div>;
  return (
    <table className="w-full">
      <tbody>
        {rows.map((d) => (
          <tr key={d.driverId} className="timing-row">
            <td className="w-8 px-3 py-1.5 text-center font-mono text-xs text-[var(--ink-3)]">{d.position}</td>
            <td className="px-2 py-1.5 text-sm">
              {d.givenName} <span className="font-semibold">{d.familyName}</span>
            </td>
            <td className="px-3 py-1.5 text-right font-mono text-sm tnum">{d.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
