"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from "react";
import type { UserPreferences } from "@/lib/domain/types";
import { DEFAULT_TIMEZONE } from "@/lib/utils/time";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const STORAGE_KEY = "apex-f1:prefs";

export const DEFAULT_PREFS: UserPreferences = {
  timezone: DEFAULT_TIMEZONE,
  theme: "dark",
  timingColumns: ["position", "driver", "lastLap", "bestLap", "sectors", "gap", "interval", "tyre", "pit", "speed"],
  telemetryChannels: ["speed", "throttle", "brake", "gear"],
  favoriteDrivers: [],
  favoriteTeams: [],
  favoriteCircuits: [],
  sessionReminders: [],
};

interface PrefsContextValue {
  prefs: UserPreferences;
  update: (patch: Partial<UserPreferences>) => void;
  toggleFavorite: (kind: "driver" | "team" | "circuit", id: number | string) => void;
  isFavorite: (kind: "driver" | "team" | "circuit", id: number | string) => boolean;
  signedIn: boolean;
}

const Ctx = createContext<PrefsContextValue>({
  prefs: DEFAULT_PREFS,
  update: () => {},
  toggleFavorite: () => {},
  isFavorite: () => false,
  signedIn: false,
});

export function usePrefs() {
  return useContext(Ctx);
}

function load(): UserPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFS);
  const [signedIn, setSignedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage, then merge Supabase preferences when signed in.
  // Hydration from localStorage is a deliberate external-store read on mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    const local = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPrefs(local);
    setHydrated(true);
    const sb = getSupabaseBrowser();
    if (!sb) return;
    let cancelled = false;
    (async () => {
      const { data: auth } = await sb.auth.getUser();
      if (cancelled || !auth.user) return;
      setSignedIn(true);
      const { data } = await sb
        .from("user_preferences")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!cancelled && data) {
        setPrefs((p) => ({
          ...p,
          timezone: data.timezone ?? p.timezone,
          theme: data.theme ?? p.theme,
          timingColumns: (data.timing_columns as string[]) ?? p.timingColumns,
          telemetryChannels: (data.telemetry_channels as string[]) ?? p.telemetryChannels,
        }));
      }
      const { data: favs } = await sb
        .from("user_favorites")
        .select("entity_kind, entity_id")
        .eq("user_id", auth.user.id);
      if (!cancelled && favs) {
        setPrefs((p) => ({
          ...p,
          favoriteDrivers: favs.filter((f) => f.entity_kind === "driver").map((f) => Number(f.entity_id)),
          favoriteTeams: favs.filter((f) => f.entity_kind === "team").map((f) => f.entity_id),
          favoriteCircuits: favs.filter((f) => f.entity_kind === "circuit").map((f) => Number(f.entity_id)),
        }));
      }
    })();
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Apply theme class
  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", prefs.theme === "dark");
    document.documentElement.classList.toggle("light", prefs.theme !== "dark");
  }, [prefs.theme, hydrated]);

  // Persist locally
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* storage full / private mode */
    }
  }, [prefs, hydrated]);

  const update = useCallback((patch: Partial<UserPreferences>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    const sb = getSupabaseBrowser();
    if (sb) {
      void (async () => {
        const { data: auth } = await sb.auth.getUser();
        if (!auth.user) return;
        await sb.from("user_preferences").upsert({
          user_id: auth.user.id,
          ...(patch.timezone ? { timezone: patch.timezone } : {}),
          ...(patch.theme ? { theme: patch.theme } : {}),
          ...(patch.timingColumns ? { timing_columns: patch.timingColumns } : {}),
          ...(patch.telemetryChannels ? { telemetry_channels: patch.telemetryChannels } : {}),
          updated_at: new Date().toISOString(),
        });
      })();
    }
  }, []);

  const toggleFavorite = useCallback((kind: "driver" | "team" | "circuit", id: number | string) => {
    const key = kind === "driver" ? "favoriteDrivers" : kind === "team" ? "favoriteTeams" : "favoriteCircuits";
    setPrefs((p) => {
      const list = p[key] as (number | string)[];
      const has = list.map(String).includes(String(id));
      const next = has ? list.filter((x) => String(x) !== String(id)) : [...list, id];
      const sb = getSupabaseBrowser();
      if (sb) {
        void (async () => {
          const { data: auth } = await sb.auth.getUser();
          if (!auth.user) return;
          if (has) {
            await sb.from("user_favorites").delete()
              .eq("user_id", auth.user.id).eq("entity_kind", kind).eq("entity_id", String(id));
          } else {
            await sb.from("user_favorites").upsert({
              user_id: auth.user.id, entity_kind: kind, entity_id: String(id),
            });
          }
        })();
      }
      return { ...p, [key]: next } as UserPreferences;
    });
  }, []);

  const isFavorite = useCallback(
    (kind: "driver" | "team" | "circuit", id: number | string) => {
      const key = kind === "driver" ? "favoriteDrivers" : kind === "team" ? "favoriteTeams" : "favoriteCircuits";
      return (prefs[key] as (number | string)[]).map(String).includes(String(id));
    },
    [prefs],
  );

  const value = useMemo(
    () => ({ prefs, update, toggleFavorite, isFavorite, signedIn }),
    [prefs, update, toggleFavorite, isFavorite, signedIn],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
