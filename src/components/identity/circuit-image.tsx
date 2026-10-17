"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

/** Provider-supplied circuit outline with a designed empty fallback (hidden, not broken). */
export function CircuitImage({
  src, label, width = 64, height = 48, className,
}: {
  src?: string | null; label: string; width?: number; height?: number; className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        aria-hidden
        className={cn("inline-block rounded-[3px] border border-dashed border-[var(--line)]", className)}
        style={{ width, height }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- provider-supplied circuit outline
    <img
      src={src}
      alt={`${label} layout`}
      width={width}
      height={height}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("object-contain opacity-80", className)}
      style={{ width, height }}
    />
  );
}
