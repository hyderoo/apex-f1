"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProgressionResponse {
  rounds: number[];
  series: { driverId: string; code: string; points: number[] }[];
}

export function PointsProgression() {
  const { data, isPending, isError } = useQuery<ProgressionResponse>({
    queryKey: ["points-progression"],
    queryFn: async () => {
      const res = await fetch("/api/analysis/points-progression");
      if (!res.ok) throw new Error("progression failed");
      return res.json();
    },
    staleTime: 600_000,
  });
  if (isPending) return <Skeleton className="h-72 w-full" />;
  if (isError || !data || data.series.length === 0) {
    return <div className="p-6 text-xs text-[var(--ink-3)]">Progression data unavailable.</div>;
  }
  const chartData = data.rounds.map((r, i) => {
    const row: Record<string, number | string> = { round: `R${r}` };
    for (const s of data.series) row[s.code] = s.points[i];
    return row;
  });
  const colors = ["#ff2442", "#34d399", "#60a5fa", "#fbbf24", "#a78bfa", "#f97316", "#22d3ee", "#f472b6"];
  return (
    <div className="h-72 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <XAxis dataKey="round" tick={{ fontSize: 10, fill: "var(--ink-3)" }} stroke="var(--line)" />
          <YAxis tick={{ fontSize: 10, fill: "var(--ink-3)" }} stroke="var(--line)" width={40} />
          <Tooltip
            contentStyle={{
              background: "var(--surface-2)", border: "1px solid var(--line-2)",
              fontSize: 12, color: "var(--ink)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {data.series.map((s, i) => (
            <Line
              key={s.driverId}
              type="monotone"
              dataKey={s.code}
              stroke={colors[i % colors.length]}
              strokeWidth={1.75}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
