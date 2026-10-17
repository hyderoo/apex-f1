import type {
  ConstructorStanding, DriverStanding, Envelope, RaceResult, SeasonRound,
} from "@/lib/domain/types";
import { fetchJson, RateLimiter } from "@/lib/cache/http";

/**
 * Jolpica F1 API (Ergast-compatible): official-style schedule, results and
 * standings. Free, no auth. Rate limit: 4 req/s burst, 500/hour sustained.
 */
const BASE = "https://api.jolpi.ca/ergast/f1";
const limiter = new RateLimiter(3, 1000);

/* eslint-disable @typescript-eslint/no-explicit-any */

function env<T>(data: T, staleAfterMs: number): Envelope<T> {
  return {
    data,
    provenance: {
      provider: "Jolpica (Ergast-compatible)",
      status: "historical",
      observedAt: null,
      retrievedAt: new Date().toISOString(),
      staleAfterMs,
    },
  };
}

async function get<T = any>(path: string, revalidate = 3600): Promise<T> {
  return fetchJson<T>(`${BASE}/${path}.json?limit=100`, {
    rateLimiter: limiter,
    retries: 2,
    revalidate,
  });
}

function toIso(date?: string, time?: string): string | null {
  if (!date) return null;
  return time ? `${date}T${time}` : `${date}T00:00:00Z`;
}

export async function fetchSeasonCalendar(year: number): Promise<Envelope<SeasonRound[]>> {
  const raw = await get(`${year}/races`);
  const races = raw?.MRData?.RaceTable?.Races ?? [];
  const data: SeasonRound[] = races.map((r: any) => {
    const sessions: { name: string; date: string }[] = [];
    const push = (name: string, s?: { date?: string; time?: string }) => {
      const iso = s && toIso(s.date, s.time);
      if (iso) sessions.push({ name, date: iso });
    };
    push("Practice 1", r.FirstPractice);
    push("Practice 2", r.SecondPractice);
    push("Practice 3", r.ThirdPractice);
    push("Sprint Qualifying", r.SprintQualifying);
    push("Sprint", r.Sprint);
    push("Qualifying", r.Qualifying);
    const raceIso = toIso(r.date, r.time) ?? "";
    sessions.push({ name: "Race", date: raceIso });
    return {
      round: Number(r.round),
      raceName: r.raceName,
      circuitId: r.Circuit?.circuitId ?? "",
      circuitName: r.Circuit?.circuitName ?? "",
      locality: r.Circuit?.Location?.locality ?? "",
      country: r.Circuit?.Location?.country ?? "",
      lat: Number(r.Circuit?.Location?.lat ?? 0),
      long: Number(r.Circuit?.Location?.long ?? 0),
      date: raceIso,
      sessions: sessions.sort((a, b) => a.date.localeCompare(b.date)),
      url: r.url ?? null,
    };
  });
  return env(data, 6 * 3_600_000);
}

export async function fetchRaceResults(year: number, round?: number): Promise<Envelope<RaceResult[]>> {
  const raw = await get(round ? `${year}/${round}/results` : `${year}/results`);
  const races = raw?.MRData?.RaceTable?.Races ?? [];
  const data: RaceResult[] = races.flatMap((race: any) =>
    (race.Results ?? []).map((r: any) => ({
      round: Number(race.round),
      position: r.position ? Number(r.position) : null,
      positionText: r.positionText ?? "",
      points: Number(r.points ?? 0),
      driverId: r.Driver?.driverId ?? "",
      driverNumber: r.Driver?.permanentNumber ? Number(r.Driver.permanentNumber) : null,
      code: r.Driver?.code ?? null,
      givenName: r.Driver?.givenName ?? "",
      familyName: r.Driver?.familyName ?? "",
      constructorId: r.Constructor?.constructorId ?? "",
      constructorName: r.Constructor?.name ?? "",
      grid: r.grid ? Number(r.grid) : null,
      laps: r.laps ? Number(r.laps) : null,
      status: r.status ?? "",
      time: r.Time?.time ?? null,
      fastestLap: r.FastestLap?.rank === "1",
    })),
  );
  return env(data, 6 * 3_600_000);
}

export interface QualifyingResult {
  round: number;
  position: number | null;
  driverId: string;
  constructorId: string;
  q1: string | null;
  q2: string | null;
  q3: string | null;
}

export async function fetchQualifyingResults(year: number, round?: number): Promise<Envelope<QualifyingResult[]>> {
  const raw = await get(round ? `${year}/${round}/qualifying` : `${year}/qualifying`);
  const races = raw?.MRData?.RaceTable?.Races ?? [];
  const data: QualifyingResult[] = races.flatMap((race: any) =>
    (race.QualifyingResults ?? []).map((r: any) => ({
      round: Number(race.round),
      position: r.position ? Number(r.position) : null,
      driverId: r.Driver?.driverId ?? "",
      constructorId: r.Constructor?.constructorId ?? "",
      q1: r.Q1 ?? null,
      q2: r.Q2 ?? null,
      q3: r.Q3 ?? null,
    })),
  );
  return env(data, 6 * 3_600_000);
}

export async function fetchDriverStandings(year: number): Promise<Envelope<DriverStanding[]>> {
  const raw = await get(`${year}/driverstandings`);
  const lists = raw?.MRData?.StandingsTable?.StandingsLists ?? [];
  const data: DriverStanding[] = (lists[0]?.DriverStandings ?? []).map((s: any) => ({
    position: Number(s.position),
    points: Number(s.points),
    wins: Number(s.wins),
    driverId: s.Driver?.driverId ?? "",
    code: s.Driver?.code ?? null,
    permanentNumber: s.Driver?.permanentNumber ? Number(s.Driver.permanentNumber) : null,
    givenName: s.Driver?.givenName ?? "",
    familyName: s.Driver?.familyName ?? "",
    nationality: s.Driver?.nationality ?? "",
    constructorIds: (s.Constructors ?? []).map((c: any) => c.constructorId),
  }));
  return env(data, 3_600_000);
}

export async function fetchConstructorStandings(year: number): Promise<Envelope<ConstructorStanding[]>> {
  const raw = await get(`${year}/constructorstandings`);
  const lists = raw?.MRData?.StandingsTable?.StandingsLists ?? [];
  const data: ConstructorStanding[] = (lists[0]?.ConstructorStandings ?? []).map((s: any) => ({
    position: Number(s.position),
    points: Number(s.points),
    wins: Number(s.wins),
    constructorId: s.Constructor?.constructorId ?? "",
    name: s.Constructor?.name ?? "",
    nationality: s.Constructor?.nationality ?? "",
  }));
  return env(data, 3_600_000);
}

export async function fetchDrivers(year: number) {
  const raw = await get(`${year}/drivers`);
  const drivers = raw?.MRData?.DriverTable?.Drivers ?? [];
  return env(
    drivers.map((d: any) => ({
      driverId: d.driverId,
      permanentNumber: d.permanentNumber ? Number(d.permanentNumber) : null,
      code: d.code ?? null,
      givenName: d.givenName ?? "",
      familyName: d.familyName ?? "",
      dateOfBirth: d.dateOfBirth ?? null,
      nationality: d.nationality ?? "",
      url: d.url ?? null,
    })),
    24 * 3_600_000,
  );
}

export async function fetchConstructors(year: number) {
  const raw = await get(`${year}/constructors`);
  const constructors = raw?.MRData?.ConstructorTable?.Constructors ?? [];
  return env(
    constructors.map((c: any) => ({
      constructorId: c.constructorId,
      name: c.name ?? "",
      nationality: c.nationality ?? "",
      url: c.url ?? null,
    })),
    24 * 3_600_000,
  );
}
