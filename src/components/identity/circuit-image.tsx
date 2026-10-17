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
  return (
    <span aria-hidden={!src || failed} className={plate} style={{ width, height }}>
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
