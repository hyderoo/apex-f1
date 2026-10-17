"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, User } from "lucide-react";
import { usePrefs } from "@/components/preferences";
import { SearchPalette } from "@/components/layout/search-palette";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import Link from "next/link";

export function Topbar() {
  const { prefs, update, signedIn } = usePrefs();
  const [searchOpen, setSearchOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    void sb.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, [signedIn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--line)] bg-[var(--surface)]/90 px-4 backdrop-blur">
      <button
        onClick={() => setSearchOpen(true)}
        className="flex h-8 flex-1 max-w-sm items-center gap-2 border border-[var(--line)] bg-[var(--surface-2)] px-3 text-xs text-[var(--ink-3)] hover:border-[var(--line-2)]"
      >
        <span>Search drivers, teams, races…</span>
        <kbd className="ml-auto border border-[var(--line-2)] px-1 text-[10px]">/</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => update({ theme: prefs.theme === "dark" ? "light" : "dark" })}
          className="flex h-8 w-8 items-center justify-center text-[var(--ink-3)] hover:text-[var(--ink)]"
          aria-label="Toggle theme"
        >
          {prefs.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <Link
          href="/settings"
          className="flex h-8 items-center gap-1.5 px-2 text-[var(--ink-3)] hover:text-[var(--ink)]"
          aria-label="Account and settings"
        >
          <User size={16} />
          {email && <span className="hidden max-w-32 truncate text-xs lg:inline">{email}</span>}
        </Link>
      </div>
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
