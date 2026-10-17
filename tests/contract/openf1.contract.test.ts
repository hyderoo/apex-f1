/**
 * OpenF1 live contract tests.
 *
 * Every field asserted here is one the app actually reads (see
 * src/lib/providers/openf1, src/lib/telemetry, src/lib/radio).
 * If OpenF1 renames, removes or retypes any of them, this suite fails
 * before users notice broken panels. Runs against the latest completed
 * 2026 race session — discovered live, not hardcoded.
 *
 * Run: pnpm test:contract  (network access required; CI runs it daily)
 */
import { describe, expect, it } from "vitest";
import { assertRowShape, fetchJson, fetchJsonAllowEmpty, pace, type FieldSpec } from "./helpers";

const BASE = "https://api.openf1.org/v1";

/** OpenF1 500s when "=" is percent-encoded in date>= keys — build those by hand. */
function qs(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k.replace(">=", "%3E").replace("<", "%3C")}=${encodeURIComponent(String(v))}`)
    .join("&");
}

const S = (nullable = false): FieldSpec => ({ type: "string", nullable });
const N = (nullable = false): FieldSpec => ({ type: "number", nullable });
const B = (nullable = false): FieldSpec => ({ type: "boolean", nullable });

let sessionKey = 0;
let driverNumber = 0;
let sessionStart = "";

describe("OpenF1 contract", () => {
  it("sessions (also discovers the reference session)", async () => {
    const all = (await fetchJson(`${BASE}/sessions?${qs({ year: 2026, session_name: "Race" })}`)) as Record<string, unknown>[];
    expect(Array.isArray(all)).toBe(true);
    // Latest COMPLETED race — the list includes future rounds, which have no data.
    const rows = all.filter((r) => new Date(r.date_end as string).getTime() < Date.now());
    expect(rows.length).toBeGreaterThan(0);
    assertRowShape("sessions", rows[rows.length - 1], {
      session_key: N(), meeting_key: N(), session_name: S(), session_type: S(),
      date_start: S(), date_end: S(), gmt_offset: S(), circuit_key: N(),
      country_code: S(), year: N(), location: S(), circuit_short_name: S(),
    });
    const ref = rows[rows.length - 1];
    sessionKey = ref.session_key as number;
    sessionStart = ref.date_start as string;
    await pace();
  }, 60000);

  it("meetings", async () => {
    const rows = (await fetchJson(`${BASE}/meetings?${qs({ year: 2026 })}`)) as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    assertRowShape("meetings", rows[0], {
      meeting_key: N(), meeting_name: S(), meeting_official_name: S(), location: S(),
      country_key: N(), country_code: S(), country_name: S(), circuit_key: N(),
      circuit_short_name: S(), date_start: S(), date_end: S(), gmt_offset: S(),
      year: N(), circuit_type: S(true), circuit_image: S(true),
    });
    await pace();
  }, 60000);

  it("drivers (also discovers the reference driver)", async () => {
    const rows = (await fetchJson(`${BASE}/drivers?${qs({ session_key: sessionKey })}`)) as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    assertRowShape("drivers", rows[0], {
      driver_number: N(), broadcast_name: S(), full_name: S(), first_name: S(),
      last_name: S(), name_acronym: S(), team_name: S(), team_colour: S(),
      headshot_url: S(true), country_code: S(true), session_key: N(), meeting_key: N(),
    });
    driverNumber = rows[0].driver_number as number;
    await pace();
  }, 60000);

  it("laps", async () => {
    const rows = (await fetchJson(`${BASE}/laps?${qs({ session_key: sessionKey, driver_number: driverNumber, lap_number: 1 })}`)) as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    assertRowShape("laps", rows[0], {
      driver_number: N(), lap_number: N(), lap_duration: N(true), is_pit_out_lap: B(),
      duration_sector_1: N(true), duration_sector_2: N(true), duration_sector_3: N(true),
      st_speed: N(true), i1_speed: N(true), i2_speed: N(true), date_start: S(true),
    });
    await pace();
  }, 60000);

  it("car_data (bounded 1-minute window)", async () => {
    const end = new Date(new Date(sessionStart).getTime() + 60_000).toISOString();
    const rows = (await fetchJson(`${BASE}/car_data?${qs({ session_key: sessionKey, driver_number: driverNumber, "date>=": sessionStart, "date<": end })}`)) as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    assertRowShape("car_data", rows[0], {
      driver_number: N(), speed: N(), rpm: N(), n_gear: N(),
      throttle: N(), brake: N(), drs: N(true), date: S(),
    });
    await pace();
  }, 60000);

  it("location (bounded 1-minute window)", async () => {
    const end = new Date(new Date(sessionStart).getTime() + 60_000).toISOString();
    const rows = (await fetchJson(`${BASE}/location?${qs({ session_key: sessionKey, driver_number: driverNumber, "date>=": sessionStart, "date<": end })}`)) as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    assertRowShape("location", rows[0], {
      driver_number: N(), x: N(), y: N(), z: N(), date: S(),
    });
    await pace();
  }, 60000);

  it("weather", async () => {
    const rows = (await fetchJson(`${BASE}/weather?${qs({ session_key: sessionKey })}`)) as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    assertRowShape("weather", rows[0], {
      air_temperature: N(), track_temperature: N(), humidity: N(), pressure: N(),
      wind_speed: N(), wind_direction: N(), rainfall: N(), date: S(),
    });
    await pace();
  }, 60000);

  it("stints", async () => {
    const rows = (await fetchJson(`${BASE}/stints?${qs({ session_key: sessionKey, driver_number: driverNumber })}`)) as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    assertRowShape("stints", rows[0], {
      driver_number: N(), stint_number: N(), compound: S(true),
      tyre_age_at_start: N(true), lap_start: N(), lap_end: N(),
      session_key: N(), meeting_key: N(),
    });
    await pace();
  }, 60000);

  it("pit (may be empty for a clean session — shape checked when rows exist)", async () => {
    const rows = await fetchJsonAllowEmpty(`${BASE}/pit?${qs({ session_key: sessionKey })}`);
    expect(Array.isArray(rows)).toBe(true);
    if (rows.length > 0) {
      assertRowShape("pit", rows[0], {
        driver_number: N(), lap_number: N(), pit_duration: N(true),
        date: S(), session_key: N(), meeting_key: N(),
      });
    }
    await pace();
  }, 60000);

  it("team_radio (coverage varies — shape checked when rows exist)", async () => {
    const rows = await fetchJsonAllowEmpty(`${BASE}/team_radio?${qs({ session_key: sessionKey })}`);
    expect(Array.isArray(rows)).toBe(true);
    if (rows.length > 0) {
      assertRowShape("team_radio", rows[0], {
        driver_number: N(), recording_url: S(), date: S(),
        session_key: N(), meeting_key: N(),
      });
    }
    await pace();
  }, 60000);

  it("intervals", async () => {
    const rows = (await fetchJson(`${BASE}/intervals?${qs({ session_key: sessionKey, driver_number: driverNumber })}`)) as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    // gap_to_leader / interval are numbers or "+1 LAP"-style strings — both valid.
    const r = rows[0];
    assertRowShape("intervals", r, { driver_number: N(), date: S() });
    for (const k of ["gap_to_leader", "interval"]) {
      const v = r[k];
      expect(v === null || typeof v === "number" || typeof v === "string", `${k} should be number|string|null`).toBe(true);
    }
    await pace();
  }, 60000);

  it("position", async () => {
    const rows = (await fetchJson(`${BASE}/position?${qs({ session_key: sessionKey, driver_number: driverNumber })}`)) as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    assertRowShape("position", rows[0], { driver_number: N(), position: N(), date: S() });
    await pace();
  }, 60000);

  it("race_control", async () => {
    const rows = (await fetchJson(`${BASE}/race_control?${qs({ session_key: sessionKey })}`)) as Record<string, unknown>[];
    expect(rows.length).toBeGreaterThan(0);
    assertRowShape("race_control", rows[0], {
      message: S(), flag: S(true), category: S(true), scope: S(true),
      sector: N(true), date: S(), driver_number: N(true), lap_number: N(true),
    });
    await pace();
  }, 60000);

  it("overtakes (may be empty — shape checked when rows exist)", async () => {
    const rows = await fetchJsonAllowEmpty(`${BASE}/overtakes?${qs({ session_key: sessionKey })}`);
    expect(Array.isArray(rows)).toBe(true);
    if (rows.length > 0) {
      assertRowShape("overtakes", rows[0], {
        overtaking_driver_number: N(), overtaken_driver_number: N(),
        position: N(), date: S(),
      });
    }
    await pace();
  }, 60000);

  // OpenF1's starting_grid beta currently has no 2026 rows (404); the app
  // documents this and falls back to qualifying classification. 404/empty is
  // the accepted current state — if rows ever appear their shape is checked.
  it("starting_grid (currently no 2026 coverage — shape checked when rows exist)", async () => {
    const rows = await fetchJsonAllowEmpty(`${BASE}/starting_grid?${qs({ session_key: sessionKey })}`);
    expect(Array.isArray(rows)).toBe(true);
    if (rows.length > 0) {
      assertRowShape("starting_grid", rows[0], {
        driver_number: N(), position: N(), lap_duration: N(true),
        session_key: N(), meeting_key: N(),
      });
    }
  }, 60000);
});
