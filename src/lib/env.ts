import { z } from "zod";

/**
 * Environment validation. Public values are safe for the browser; server
 * secrets are only read in server modules.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional().or(z.literal("")),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  OPENF1_API_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

export function getServerEnv() {
  return serverSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENF1_API_KEY: process.env.OPENF1_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  });
}

export function supabaseConfigured() {
  return Boolean(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL &&
      publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

/** Web Push needs the public key in the browser and the private key server-side. */
export function pushConfigured() {
  return Boolean(
    publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY && getServerEnv().VAPID_PRIVATE_KEY,
  );
}

export function openF1LiveConfigured() {
  return Boolean(process.env.OPENF1_API_KEY);
}
