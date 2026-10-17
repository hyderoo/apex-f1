"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

interface SearchItem {
  kind: "driver" | "team" | "meeting" | "circuit" | "session";
  id: string;
  label: string;
  sub: string;
  href: string;
}

async function fetchIndex(): Promise<SearchItem[]> {
  const res = await fetch("/api/search-index");
  if (!res.ok) throw new Error("search index failed");
  return res.json();
}

export function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["search-index"], queryFn: fetchIndex, staleTime: 300_000 });

  const results = useMemo(() => {
    if (!data) return [];
    if (!q.trim()) return data.slice(0, 12);
    const needle = q.toLowerCase();
    return data
      .filter((i) => i.label.toLowerCase().includes(needle) || i.sub.toLowerCase().includes(needle))
      .slice(0, 14);
  }, [data, q]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-[15%] z-[90] w-[92vw] max-w-lg -translate-x-1/2 border border-[var(--line-2)] bg-[var(--surface-2)] shadow-2xl">
          <Dialog.Title className="sr-only">Search</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-[var(--line)] px-3">
            <Search size={14} className="text-[var(--ink-3)]" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search drivers, teams, Grands Prix, circuits, sessions"
              className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--ink-3)]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) {
                  router.push(results[0].href);
                  onClose();
                }
              }}
            />
          </div>
          <ul className="max-h-80 overflow-y-auto py-1">
            {results.map((r) => (
              <li key={`${r.kind}-${r.id}`}>
                <button
                  className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--surface-3)]"
                  onClick={() => {
                    router.push(r.href);
                    onClose();
                  }}
                >
                  <span className="w-14 shrink-0 text-[9px] uppercase tracking-[0.15em] text-[var(--ink-3)]">
                    {r.kind}
                  </span>
                  <span className="flex-1 truncate text-sm">{r.label}</span>
                  <span className="truncate text-xs text-[var(--ink-3)]">{r.sub}</span>
                </button>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-[var(--ink-3)]">No matches</li>
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
