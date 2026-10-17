"use client";

import * as echarts from "echarts";
import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { usePrefs } from "@/components/preferences";
import { useToast } from "@/components/ui/toast";

export interface ChannelPoint {
  t: number;
  distance: number | null;
  speed: number | null;
  throttle: number | null;
  brake: number | null;
  rpm: number | null;
  gear: number | null;
  drs: number | null;
}

const CHANNELS = [
  { id: "speed", label: "Speed (km/h)", field: "speed" },
  { id: "throttle", label: "Throttle (%)", field: "throttle" },
  { id: "brake", label: "Brake (on/off)", field: "brake" },
  { id: "gear", label: "Gear", field: "gear" },
  { id: "rpm", label: "RPM", field: "rpm" },
  { id: "drs", label: "DRS", field: "drs" },
] as const;

export function TelemetryChart({
  a,
  b,
  aLabel,
  bLabel,
  aColor,
  bColor,
  delta,
}: {
  a: ChannelPoint[];
  b?: ChannelPoint[];
  aLabel: string;
  bLabel?: string;
  aColor: string;
  bColor?: string;
  delta?: { distance: number; delta: number }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const { prefs } = usePrefs();
  const toast = useToast();
  const channels = CHANNELS.filter((c) => prefs.telemetryChannels.includes(c.id));

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    const isDark = document.documentElement.classList.contains("dark");
    const ink3 = isDark ? "#666d7a" : "#79808d";
    const line = isDark ? "#23262e" : "#d9d6cf";

    const xOf = (p: ChannelPoint) => p.distance ?? null;
    const grids = channels.map((_, i) => i);
    const totalGrids = grids.length + (delta && delta.length > 0 ? 1 : 0);
    const gridHeight = 100 / totalGrids;

    const option = {
      animation: false,
      grid: ([
        ...channels.map((_, i) => ({
          left: 60, right: 20,
          top: `${2 + i * gridHeight}%`,
          height: `${gridHeight - 6}%`,
        })),
        ...(delta && delta.length > 0
          ? [{ left: 60, right: 20, top: `${2 + channels.length * gridHeight}%`, height: `${gridHeight - 6}%` }]
          : []),
      ]) as object[],
      xAxis: ([
        ...channels.map((c, i) => ({
          type: "value" as const,
          gridIndex: i,
          min: 0,
          axisLabel: { show: i === channels.length - 1 && !(delta && delta.length), color: ink3, fontSize: 9 },
          axisLine: { lineStyle: { color: line } },
          splitLine: { show: false },
        })),
        ...(delta && delta.length > 0
          ? [{
              type: "value" as const, gridIndex: channels.length, min: 0,
              axisLabel: { color: ink3, fontSize: 9 },
              axisLine: { lineStyle: { color: line } }, splitLine: { show: false },
            }]
          : []),
      ]) as object[],
      yAxis: ([
        ...channels.map((c, i) => ({
          type: "value" as const,
          gridIndex: i,
          axisLabel: { color: ink3, fontSize: 9 },
          splitLine: { lineStyle: { color: line } },
          name: c.label,
          nameTextStyle: { color: ink3, fontSize: 9, align: "left" as const },
          ...(c.id === "drs" ? { min: 0, max: 14, interval: 14 } : {}),
          ...(c.id === "brake" ? { min: 0, max: 100 } : {}),
          ...(c.id === "gear" ? { min: 0, max: 8, interval: 2 } : {}),
        })),
        ...(delta && delta.length > 0
          ? [{
              type: "value" as const, gridIndex: channels.length,
              axisLabel: { color: ink3, fontSize: 9 },
              splitLine: { lineStyle: { color: line } },
              name: "Delta time (s)", nameTextStyle: { color: ink3, fontSize: 9, align: "left" as const },
            }]
          : []),
      ]) as object[],
      series: (channels.flatMap((c, gi) => {
        const mk = (pts: ChannelPoint[], name: string, color: string) => ({
          type: "line" as const,
          name,
          xAxisIndex: gi,
          yAxisIndex: gi,
          showSymbol: false,
          step: (c.id === "gear" || c.id === "drs" || c.id === "brake" ? "end" : false) as "end" | false,
          lineStyle: { width: 1.2, color },
          data: pts
            .filter((p) => xOf(p) != null)
            .map((p) => [xOf(p)!, p[c.field]]),
          sampling: "lttb" as const,
        });
        const arr = [mk(a, `${aLabel}`, aColor)];
        if (b && bLabel && bColor) arr.push(mk(b, `${bLabel}`, bColor));
        return arr;
      }) as object[]).concat(
        delta && delta.length > 0
          ? [{
              type: "line" as const,
              name: "delta",
              xAxisIndex: channels.length,
              yAxisIndex: channels.length,
              showSymbol: false,
              lineStyle: { width: 1.2, color: "#a78bfa" },
              areaStyle: { opacity: 0.15 },
              data: delta.map((d) => [d.distance, d.delta]),
            }]
          : [],
      ) as object[],
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "line", link: [{ xAxisIndex: "all" }] },
        backgroundColor: isDark ? "#121419" : "#ffffff",
        borderColor: line,
        textStyle: { color: isDark ? "#ecedf0" : "#101216", fontSize: 11 },
        valueFormatter: (v: unknown) => (typeof v === "number" ? v.toFixed(1) : "—"),
      },
      axisPointer: { link: [{ xAxisIndex: "all" }] },
      dataZoom: [
        { type: "inside", xAxisIndex: channels.map((_, i) => i).concat(delta && delta.length ? [channels.length] : []) },
      ],
      legend: {
        top: 0, right: 8, textStyle: { color: ink3, fontSize: 10 },
      },
    };
    chart.setOption(option as echarts.EChartsOption);
    const onResize = () => chart.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.dispose();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, b, aLabel, bLabel, aColor, bColor, delta, prefs.telemetryChannels]);

  const height = Math.max(320, (channels.length + (delta && delta.length ? 1 : 0)) * 120);
  return (
    <div className="relative">
      <div ref={ref} style={{ height }} className="w-full" role="img" aria-label="Telemetry chart" />
      <button
        onClick={() => {
          const url = chartRef.current?.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#0b0c0f" });
          if (!url) return;
          const a = document.createElement("a");
          a.href = url;
          a.download = "apex-f1-telemetry.png";
          a.click();
          toast("Chart exported as PNG", "success");
        }}
        className="absolute right-2 top-2 flex items-center gap-1 border border-[var(--line)] bg-[var(--surface-2)] px-2 py-1 text-[10px] uppercase tracking-wider text-[var(--ink-3)] hover:text-[var(--ink)]"
        aria-label="Export chart as PNG"
      >
        <Download size={11} /> PNG
      </button>
    </div>
  );
}
