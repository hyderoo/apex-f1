"use client";

import { useQuery } from "@tanstack/react-query";
import { Droplets, Thermometer, Wind, CloudRain, Gauge } from "lucide-react";
import type { DataStatus, WeatherObservation } from "@/lib/domain/types";
import { Skeleton } from "@/components/ui/skeleton";
import { relativeAge } from "@/lib/utils/time";
import { DataStatusBadge } from "@/components/ui/badge";

interface WeatherResponse {
  latest: WeatherObservation | null;
  provenance: { status: DataStatus; provider: string; retrievedAt: string };
}

export function WeatherPanel({ sessionKey }: { sessionKey?: number }) {
  const { data, isPending } = useQuery<WeatherResponse>({
    queryKey: ["weather", sessionKey ?? "auto"],
    queryFn: async () => {
      const res = await fetch(`/api/weather${sessionKey ? `?session=${sessionKey}` : ""}`);
      if (!res.ok) throw new Error("weather failed");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  if (isPending) return <Skeleton className="h-40 w-full" />;
  const w = data?.latest;
  if (!w) {
    return <div className="p-4 text-xs text-[var(--ink-3)]">No weather observations recorded for this session.</div>;
  }

  const items = [
    { icon: Thermometer, label: "Air", value: w.airTemperature != null ? `${w.airTemperature.toFixed(1)}°C` : "—" },
    { icon: Thermometer, label: "Track", value: w.trackTemperature != null ? `${w.trackTemperature.toFixed(1)}°C` : "—" },
    { icon: Droplets, label: "Humidity", value: w.humidity != null ? `${Math.round(w.humidity)}%` : "—" },
    { icon: Gauge, label: "Pressure", value: w.pressure != null ? `${Math.round(w.pressure)} mb` : "—" },
    { icon: Wind, label: "Wind", value: w.windSpeed != null ? `${w.windSpeed.toFixed(1)} m/s` : "—" },
    { icon: CloudRain, label: "Rain", value: w.rainfall != null ? (w.rainfall > 0 ? "Yes" : "No") : "—" },
  ];

  return (
    <div className="p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="micro-label">Measured weather</span>
        {data && <DataStatusBadge status={data.provenance.status} />}
      </div>
      <div className="grid grid-cols-3 gap-px bg-[var(--line)]">
        {items.map((it) => (
          <div key={it.label} className="bg-[var(--surface-2)] p-2.5">
            <div className="flex items-center gap-1 text-[var(--ink-3)]">
              <it.icon size={11} />
              <span className="text-[9px] uppercase tracking-[0.15em]">{it.label}</span>
            </div>
            <div className="mt-1 font-mono text-sm tnum">{it.value}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-[var(--ink-3)]">
        Measured {relativeAge(w.date)} · not a forecast
      </p>
    </div>
  );
}
