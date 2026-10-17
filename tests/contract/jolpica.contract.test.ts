/**
 * Jolpica (Ergast-compatible) live contract tests.
 *
 * Every field asserted here is one the app reads in
 * src/lib/providers/jolpica. Catches schema drift in standings,
 * schedule and race results before it breaks the UI.
 *
 * Run: pnpm test:contract  (network access required; CI runs it daily)
 */
import { describe, expect, it } from "vitest";
import { fetchJson, pace } from "./helpers";

const BASE = "https://api.jolpi.ca/ergast/f1";

// Live payloads are unvalidated JSON — index access returns any.
type AnyRec = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function mrdata(doc: unknown): AnyRec {
  const d = doc as AnyRec;
  expect(d.MRData, "MRData root missing").toBeTruthy();
  return d.MRData;
}

describe("Jolpica contract", () => {
  it("driver standings", async () => {
    const doc = mrdata(await fetchJson(`${BASE}/2026/driverstandings.json`));
    const lists = (doc.StandingsTable as AnyRec).StandingsLists;
    expect(Array.isArray(lists) && lists.length > 0).toBe(true);
    const ds = lists[0].DriverStandings;
    expect(Array.isArray(ds) && ds.length > 0).toBe(true);
    const row = ds[0];
    for (const k of ["position", "positionText", "points", "wins"]) expect(typeof row[k], k).toBe("string");
    for (const k of ["driverId", "code", "permanentNumber", "givenName", "familyName", "nationality"]) {
      expect(typeof row.Driver[k], `Driver.${k}`).toBe("string");
    }
    expect(Array.isArray(row.Constructors) && row.Constructors.length > 0).toBe(true);
    for (const k of ["constructorId", "name", "nationality"]) {
      expect(typeof row.Constructors[0][k], `Constructor.${k}`).toBe("string");
    }
    await pace();
  }, 60000);

  it("constructor standings", async () => {
    const doc = mrdata(await fetchJson(`${BASE}/2026/constructorstandings.json`));
    const lists = (doc.StandingsTable as AnyRec).StandingsLists;
    const cs = lists[0].ConstructorStandings;
    expect(Array.isArray(cs) && cs.length > 0).toBe(true);
    const row = cs[0];
    for (const k of ["position", "positionText", "points", "wins"]) expect(typeof row[k], k).toBe("string");
    for (const k of ["constructorId", "name", "nationality"]) {
      expect(typeof row.Constructor[k], `Constructor.${k}`).toBe("string");
    }
    await pace();
  }, 60000);

  it("schedule", async () => {
    const doc = mrdata(await fetchJson(`${BASE}/2026.json`));
    const races = (doc.RaceTable as AnyRec).Races;
    expect(Array.isArray(races) && races.length > 0).toBe(true);
    const r = races[0];
    for (const k of ["season", "round", "raceName", "date"]) expect(typeof r[k], k).toBe("string");
    for (const k of ["circuitId", "circuitName"]) expect(typeof r.Circuit[k], `Circuit.${k}`).toBe("string");
    for (const k of ["lat", "long", "locality", "country"]) {
      expect(typeof r.Circuit.Location[k], `Location.${k}`).toBe("string");
    }
    await pace();
  }, 60000);

  it("latest race results", async () => {
    const doc = mrdata(await fetchJson(`${BASE}/2026/last/results.json`));
    const races = (doc.RaceTable as AnyRec).Races;
    expect(Array.isArray(races) && races.length > 0).toBe(true);
    const results = races[0].Results;
    expect(Array.isArray(results) && results.length > 0).toBe(true);
    const res = results[0];
    for (const k of ["position", "positionText", "points", "grid", "laps", "status"]) {
      expect(typeof res[k], k).toBe("string");
    }
    expect(typeof res.Driver.driverId).toBe("string");
    expect(typeof res.Constructor.constructorId).toBe("string");
    if (res.Time) expect(typeof res.Time.millis === "string" || typeof res.Time.time === "string").toBe(true);
    if (res.FastestLap) {
      expect(typeof res.FastestLap.rank).toBe("string");
      expect(typeof res.FastestLap.Time.time).toBe("string");
      if (res.FastestLap.AverageSpeed) expect(typeof res.FastestLap.AverageSpeed.speed).toBe("string");
    }
  }, 60000);
});
