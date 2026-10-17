"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv, supabaseConfigured } from "@/lib/env";

let client: SupabaseClient | null = null;

/** Browser Supabase client, or null when Supabase is not configured. */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!supabaseConfigured()) return null;
  if (!client) {
    client = createBrowserClient(
      publicEnv.NEXT_PUBLIC_SUPABASE_URL!,
      publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return client;
}
