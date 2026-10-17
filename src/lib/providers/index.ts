import type { Envelope } from "@/lib/domain/types";
import { OpenF1Provider } from "./openf1";
import { DemoDataProvider } from "./demo";
import type { F1DataProvider } from "./types";

const openF1 = new OpenF1Provider(process.env.OPENF1_API_KEY);
const demo = new DemoDataProvider();

export function getProvider(): F1DataProvider {
  return openF1;
}

export function getDemoProvider(): F1DataProvider {
  return demo;
}

/**
 * Run a provider call with automatic fallback to the bundled demo snapshot.
 * Demo data always keeps its `demo` status so the UI labels it correctly.
 */
export async function withDemoFallback<T>(
  fn: (p: F1DataProvider) => Promise<Envelope<T>>,
): Promise<{ envelope: Envelope<T>; fellBack: boolean; error?: string }> {
  try {
    const envelope = await fn(openF1);
    return { envelope, fellBack: false };
  } catch (err) {
    try {
      const envelope = await fn(demo);
      return {
        envelope,
        fellBack: true,
        error: err instanceof Error ? err.message : String(err),
      };
    } catch (demoErr) {
      // Both failed: return an explicitly unavailable envelope.
      return {
        envelope: {
          data: null as T,
          provenance: {
            provider: "none",
            status: "unavailable",
            observedAt: null,
            retrievedAt: new Date().toISOString(),
            staleAfterMs: 0,
          },
        },
        fellBack: true,
        error: `${err instanceof Error ? err.message : String(err)}; demo: ${
          demoErr instanceof Error ? demoErr.message : String(demoErr)
        }`,
      };
    }
  }
}

/** Mark an envelope as delayed when live access is not configured. */
export function delayedIfNoLive<T>(env: Envelope<T>, liveConfigured: boolean): Envelope<T> {
  if (liveConfigured || env.provenance.status !== "historical") return env;
  return { ...env, provenance: { ...env.provenance, status: "delayed" } };
}
