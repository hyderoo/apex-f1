"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Provider-supplied circuit outline with a designed empty fallback (dashed
 * plate, never a broken image). Rendered on a subtle light plate because some
 * provider "carbon" track icons are near-black strokes on transparency and
 * would be invisible on the dark UI.
 */
export function CircuitImage({
  src, label, width = 64, height = 48, className,
}: {
  src?: string | null; label: string; width?: number; height?: number; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const plate = cn(
    "inline-flex items-center justify-center rounded-[3px] border",
    !src || failed
      ? "border-dashed border-[var(--line)]"
      : "border-[var(--line)] bg-[rgba(255,255,255,0.14)] p-1",
    className,
  );
  const unavailable = !src || failed;
  return (
    <span
      role={unavailable ? "img" : undefined}
      aria-label={unavailable ? `${label} track outline unavailable from the data provider` : undefined}
      title={unavailable ? `${label} — track outline unavailable from provider` : undefined}
      className={plate}
      style={{ width, height }}
    >
      {unavailable && (
        <span className="font-mono text-[9px] font-bold tracking-widest text-[var(--ink-3)]">
          {label.slice(0, 3).toUpperCase()}
        </span>
      )}
      {src && !failed && (
        // eslint-disable-next-line @next/next/no-img-element -- provider-supplied circuit outline
        <img
          src={src}
          alt={`${label} layout`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="max-h-full max-w-full object-contain"
        />
      )}
    </span>
  );
}
