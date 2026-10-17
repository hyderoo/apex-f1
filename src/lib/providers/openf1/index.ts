import { z } from "zod";
import type {
  CarDataSample, Driver, Envelope, GridSlot, IntervalPoint, Lap, LocationPoint,
  Meeting, Overtake, PitStop, PositionPoint, RaceControlMessage, Session, SessionResultEntry,
  SessionStatus, Stint, TeamRadioClip, WeatherObservation,
} from "@/lib/domain/types";
import { fetchJson, HttpError, RateLimiter } from "@/lib/cache/http";
import { DRIVER_NATIONALITY_2026 } from "@/lib/assets/manifest";
import type {
  F1DataProvider, LapQuery, ProviderCapabilities, SessionQuery, TelemetryQuery,
} from "../types";
import {
  openF1CarDataSchema, openF1DriverSchema, openF1IntervalSchema, openF1LapSchema,
  openF1LocationSchema, openF1MeetingSchema, openF1PitSchema, openF1PositionSchema,
  openF1OvertakeSchema, openF1RaceControlSchema, openF1SessionResultSchema, openF1SessionSchema,
  openF1StartingGridSchema, openF1StintSchema, openF1TeamRadioSchema, openF1WeatherSchema,
} from "./schemas";

const BASE = "https://api.openf1.org/v1";
/** Free tier is roughly 3 req/s, 30 req/min — stay well under. */
const limiter = new RateLimiter(3, 1000);

export function sessionStatus(s: { date_start: string | null; date_end: string | null; is_cancelled?: boolean }, now = new Date()): SessionStatus {
  if (s.is_cancelled) return "cancelled";
  if (!s.date_start) return "unknown";
  const start = new Date(s.date_start);
  const end = s.date_end ? new Date(s.date_end) : null;
  if (Number.isNaN(start.getTime())) return "unknown";
  if (now < start) return "upcoming";
  if (end && now > end) return "finished";
  return "live";
}

const num = (v: unknown): number | null => {
  if (typeof v === "number") return v;
  if (Array.isArray(v)) {
    const nums = v.filter((x): x is number => typeof x === "number");
    return nums.length ? Math.min(...nums) : null;
  }
  return null;
};

export class OpenF1Provider implements F1DataProvider {
  readonly id = "openf1";
  constructor(private apiKey?: string) {}

  capabilities(): ProviderCapabilities {
    return {
      liveTiming: Boolean(this.apiKey),
      historicalTiming: true,
      telemetry: true,
      trackGeometry: true,
      weather: true,
      raceControl: true,
      officialResults: false,
    };
  }

  private headers(): Record<string, string> {
    return this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {};
  }

  private async get<T>(
    path: string,
    schema: z.ZodType<T>,
    params: Record<string, string | number>,
    opts: { status: Envelope<unknown>["provenance"]["status"]; staleAfterMs: number; revalidate?: number | false },
  ): Promise<Envelope<T[]>> {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
    const url = `${BASE}/${path}?${qs.toString()}`;
    let raw: unknown;
    try {
      raw = await fetchJson<unknown>(url, {
        rateLimiter: limiter,
        retries: 2,
        revalidate: opts.revalidate ?? false,
        headers: this.headers(),
      });
    } catch (err) {
      // OpenF1 answers "no data" with 404 + {"detail":"No results found."} on
      // some endpoints (e.g. starting_grid) and 200 with the same body on
      // others. Both are an empty result, not a failure.
      if (err instanceof HttpError && err.status === 404) {
        return this.envelope([], opts.status, opts.staleAfterMs);
      }
      throw err;
    }
    if (raw && typeof raw === "object" && "detail" in (raw as Record<string, unknown>)) {
      // OpenF1 returns {"detail":"No results found."} for empty queries
      return this.envelope([], opts.status, opts.staleAfterMs);
    }
    const parsed = z.array(schema).safeParse(raw);
    if (!parsed.success) {
      throw new Error(`OpenF1 ${path}: invalid payload: ${parsed.error.issues[0]?.message}`);
    }
    return this.envelope(parsed.data, opts.status, opts.staleAfterMs);
  }

  private envelope<T>(data: T, status: Envelope<T>["provenance"]["status"], staleAfterMs: number): Envelope<T> {
    return {
      data,
      provenance: {
        provider: "OpenF1",
        status,
        observedAt: null,
        retrievedAt: new Date().toISOString(),
        staleAfterMs,
      },
    };
  }

  async meetings(year: number) {
    const env = await this.get("meetings", openF1MeetingSchema, { year }, { status: "historical", staleAfterMs: 6 * 3_600_000, revalidate: 3600 });
    const data: Meeting[] = env.data.map((m) => ({
      meetingKey: m.meeting_key, name: m.meeting_name, officialName: m.meeting_official_name,
      location: m.location, countryName: m.country_name, countryCode: m.country_code,
      countryFlagUrl: m.country_flag, circuitKey: m.circuit_key,
      circuitShortName: m.circuit_short_name, circuitType: m.circuit_type,
      circuitImageUrl: m.circuit_image, circuitInfoUrl: m.circuit_info_url,
      gmtOffset: m.gmt_offset, dateStart: m.date_start, dateEnd: m.date_end,
      year: m.year, isCancelled: m.is_cancelled,
    }));
    return { ...env, data };
  }

  async sessions(year: number) {
    const env = await this.get("sessions", openF1SessionSchema, { year }, { status: "historical", staleAfterMs: 3_600_000, revalidate: 1800 });
    const data: Session[] = env.data.map((s) => ({
      sessionKey: s.session_key, meetingKey: s.meeting_key, name: s.session_name,
      type: s.session_type, dateStart: s.date_start ?? "", dateEnd: s.date_end ?? "",
      gmtOffset: s.gmt_offset, circuitKey: s.circuit_key,
      circuitShortName: s.circuit_short_name, countryName: s.country_name,
      countryCode: s.country_code, location: s.location, year: s.year,
      isCancelled: s.is_cancelled, status: sessionStatus(s),
    }));
    return { ...env, data };
  }

  async drivers(q: SessionQuery) {
    const env = await this.get("drivers", openF1DriverSchema, { session_key: q.sessionKey }, { status: "historical", staleAfterMs: 24 * 3_600_000, revalidate: 3600 });
    // OpenF1 can return one row per driver per session it saw them; dedupe.
    const seen = new Map<number, Driver>();
    for (const d of env.data) {
      seen.set(d.driver_number, {
        driverNumber: d.driver_number, broadcastName: d.broadcast_name,
        fullName: d.full_name, firstName: d.first_name, lastName: d.last_name,
        acronym: d.name_acronym, teamName: d.team_name, teamColour: d.team_colour,
        headshotUrl: d.headshot_url, countryCode: d.country_code ?? DRIVER_NATIONALITY_2026[d.driver_number] ?? null,
      });
    }
    return { ...env, data: [...seen.values()] };
  }

  private timingStatus(): "delayed" | "historical" {
    return "historical";
  }

  async laps(q: LapQuery) {
    const params: Record<string, string | number> = { session_key: q.sessionKey };
    if (q.driverNumber != null) params.driver_number = q.driverNumber;
    if (q.lapNumber != null) params.lap_number = q.lapNumber;
    const env = await this.get("laps", openF1LapSchema, params, { status: this.timingStatus(), staleAfterMs: 60_000, revalidate: 120 });
    const data: Lap[] = env.data.map((l) => ({
      driverNumber: l.driver_number, lapNumber: l.lap_number, dateStart: l.date_start,
      lapDuration: l.lap_duration, durationSector1: l.duration_sector_1,
      durationSector2: l.duration_sector_2, durationSector3: l.duration_sector_3,
      i1Speed: l.i1_speed, i2Speed: l.i2_speed, stSpeed: l.st_speed,
      isPitOutLap: l.is_pit_out_lap, segmentsSector1: l.segments_sector_1 ?? [],
      segmentsSector2: l.segments_sector_2 ?? [], segmentsSector3: l.segments_sector_3 ?? [],
    }));
    return { ...env, data };
  }

  async stints(q: SessionQuery) {
    const params: Record<string, string | number> = { session_key: q.sessionKey };
    if (q.driverNumber != null) params.driver_number = q.driverNumber;
    const env = await this.get("stints", openF1StintSchema, params, { status: "historical", staleAfterMs: 60_000, revalidate: 300 });
    const data: Stint[] = env.data.map((s) => ({
      driverNumber: s.driver_number, stintNumber: s.stint_number,
      lapStart: s.lap_start, lapEnd: s.lap_end, compound: s.compound,
      tyreAgeAtStart: s.tyre_age_at_start,
    }));
    return { ...env, data };
  }

  async pitStops(q: SessionQuery) {
    const params: Record<string, string | number> = { session_key: q.sessionKey };
    if (q.driverNumber != null) params.driver_number = q.driverNumber;
    const env = await this.get("pit", openF1PitSchema, params, { status: "historical", staleAfterMs: 60_000, revalidate: 300 });
    const data: PitStop[] = env.data.map((p) => ({
      driverNumber: p.driver_number, date: p.date, lapNumber: p.lap_number,
      pitDuration: p.pit_duration,
    }));
    return { ...env, data };
  }

  async positions(q: SessionQuery) {
    const params: Record<string, string | number> = { session_key: q.sessionKey };
    if (q.driverNumber != null) params.driver_number = q.driverNumber;
    const env = await this.get("position", openF1PositionSchema, params, { status: this.timingStatus(), staleAfterMs: 30_000, revalidate: 60 });
    const data: PositionPoint[] = env.data.map((p) => ({
      driverNumber: p.driver_number, date: p.date, position: p.position,
    }));
    return { ...env, data };
  }

  async intervals(q: SessionQuery) {
    const params: Record<string, string | number> = { session_key: q.sessionKey };
    if (q.driverNumber != null) params.driver_number = q.driverNumber;
    const env = await this.get("intervals", openF1IntervalSchema, params, { status: this.timingStatus(), staleAfterMs: 30_000, revalidate: 60 });
    const data: IntervalPoint[] = env.data.map((i) => ({
      driverNumber: i.driver_number, date: i.date,
      gapToLeader: i.gap_to_leader, interval: i.interval,
    }));
    return { ...env, data };
  }

  async carData(q: TelemetryQuery) {
    const params: Record<string, string | number> = {
      session_key: q.sessionKey, driver_number: q.driverNumber,
    };
    if (q.dateStart) params["date>="] = q.dateStart;
    if (q.dateEnd) params["date<"] = q.dateEnd;
    const env = await this.get("car_data", openF1CarDataSchema, params, { status: "historical", staleAfterMs: 3_600_000 });
    const data: CarDataSample[] = env.data.map((c) => ({
      driverNumber: c.driver_number, date: c.date, speed: c.speed, rpm: c.rpm,
      nGear: c.n_gear, throttle: c.throttle, brake: c.brake, drs: c.drs,
    }));
    return { ...env, data };
  }

  async locations(q: TelemetryQuery) {
    const params: Record<string, string | number> = {
      session_key: q.sessionKey, driver_number: q.driverNumber,
    };
    if (q.dateStart) params["date>="] = q.dateStart;
    if (q.dateEnd) params["date<"] = q.dateEnd;
    const env = await this.get("location", openF1LocationSchema, params, { status: "historical", staleAfterMs: 3_600_000 });
    const data: LocationPoint[] = env.data.map((l) => ({
      driverNumber: l.driver_number, date: l.date, x: l.x, y: l.y, z: l.z,
    }));
    return { ...env, data };
  }

  async weather(q: SessionQuery) {
    const env = await this.get("weather", openF1WeatherSchema, { session_key: q.sessionKey }, { status: "historical", staleAfterMs: 300_000, revalidate: 300 });
    const data: WeatherObservation[] = env.data.map((w) => ({
      date: w.date, airTemperature: w.air_temperature,
      trackTemperature: w.track_temperature, humidity: w.humidity,
      pressure: w.pressure, windSpeed: w.wind_speed,
      windDirection: w.wind_direction, rainfall: w.rainfall,
    }));
    return { ...env, data };
  }

  async raceControl(q: SessionQuery) {
    const env = await this.get("race_control", openF1RaceControlSchema, { session_key: q.sessionKey }, { status: "historical", staleAfterMs: 60_000, revalidate: 300 });
    const data: RaceControlMessage[] = env.data.map((r) => ({
      date: r.date, category: r.category, flag: r.flag, scope: r.scope,
      sector: r.sector, message: r.message, lapNumber: r.lap_number,
      driverNumber: r.driver_number, source: "official" as const,
    }));
    return { ...env, data };
  }


  async sessionResult(q: SessionQuery) {
    const env = await this.get("session_result", openF1SessionResultSchema, { session_key: q.sessionKey }, { status: "historical", staleAfterMs: 6 * 3_600_000, revalidate: 3600 });
    const data: SessionResultEntry[] = env.data.map((r) => ({
      position: typeof r.position === "number" ? r.position : null,
      driverNumber: r.driver_number,
      numberOfLaps: r.number_of_laps ?? null,
      points: r.points ?? null,
      dnf: r.dnf, dns: r.dns, dsq: r.dsq,
      duration: num(r.duration),
      gapToLeader: Array.isArray(r.gap_to_leader)
        ? (r.gap_to_leader.filter((x): x is number => typeof x === "number").at(-1) ?? null)
        : (r.gap_to_leader ?? null),
    }));
    data.sort((a, b) => (a.position ?? 99) - (b.position ?? 99));
    return { ...env, data };
  }

  async startingGrid(q: SessionQuery) {
    const env = await this.get("starting_grid", openF1StartingGridSchema, { session_key: q.sessionKey }, { status: "historical", staleAfterMs: 6 * 3_600_000, revalidate: 3600 });
    const data: GridSlot[] = env.data
      .map((g) => ({ position: g.position, driverNumber: g.driver_number, lapDuration: g.lap_duration ?? null }))
      .sort((a, b) => a.position - b.position);
    return { ...env, data };
  }

  async overtakes(q: SessionQuery) {
    const env = await this.get("overtakes", openF1OvertakeSchema, { session_key: q.sessionKey }, { status: "historical", staleAfterMs: 6 * 3_600_000, revalidate: 3600 });
    const data: Overtake[] = env.data.map((o) => ({
      date: o.date,
      overtakingDriverNumber: o.overtaking_driver_number,
      overtakenDriverNumber: o.overtaken_driver_number,
      position: o.position,
    }));
    return { ...env, data };
  }

  async teamRadio(q: SessionQuery) {
    const params: Record<string, string | number> = { session_key: q.sessionKey };
    if (q.driverNumber != null) params.driver_number = q.driverNumber;
    const env = await this.get("team_radio", openF1TeamRadioSchema, params, { status: "historical", staleAfterMs: 6 * 3_600_000, revalidate: 3600 });
    const data: TeamRadioClip[] = env.data.map((t) => ({
      date: t.date, driverNumber: t.driver_number, recordingUrl: t.recording_url,
    }));
    return { ...env, data };
  }
}
