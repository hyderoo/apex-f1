"use client";

import { useState } from "react";

/** Copies the absolute URL of the generated share card (OG image) for a driver pair. */
export function ShareCardButton({ a, b }: { a: string; b: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        const url = `${window.location.origin}/api/og?type=h2h&a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="border border-[var(--line)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[var(--ink-3)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
      title={`Copy share-card link for ${a} vs ${b}`}
    >
      {copied ? "Copied" : "Share card"}
    </button>
  );
}
