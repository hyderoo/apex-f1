import type {
  CarDataSample,
  Driver,
  Envelope,
  IntervalPoint,
  Lap,
  LocationPoint,
  GridSlot,
  Meeting,
  Overtake,
  PitStop,
  PositionPoint,
  RaceControlMessage,
  Session,
  SessionResultEntry,
  Stint,
  TeamRadioClip,
  WeatherObservation,
} from "@/lib/domain/types";

export interface ProviderCapabilities {
  liveTiming: boolean;
  historicalTiming: boolean;
  telemetry: boolean;
  trackGeometry: boolean;
  weather: boolean;
  raceControl: boolean;
  officialResults: boolean;
}

export interface SessionQuery {
  sessionKey: number;
  driverNumber?: number;
}

export interface LapQuery extends SessionQuery {
  lapNumber?: number;
}

export interface TelemetryQuery extends SessionQuery {
  driverNumber: number;
  dateStart?: string;
  dateEnd?: string;
}

/** Timing/telemetry provider (OpenF1-shaped). */
export interface F1DataProvider {
  readonly id: string;
  capabilities(): ProviderCapabilities;
  meetings(year: number): Promise<Envelope<Meeting[]>>;
  sessions(year: number): Promise<Envelope<Session[]>>;
  drivers(q: SessionQuery): Promise<Envelope<Driver[]>>;
  laps(q: LapQuery): Promise<Envelope<Lap[]>>;
  stints(q: SessionQuery): Promise<Envelope<Stint[]>>;
  pitStops(q: SessionQuery): Promise<Envelope<PitStop[]>>;
  positions(q: SessionQuery): Promise<Envelope<PositionPoint[]>>;
  intervals(q: SessionQuery): Promise<Envelope<IntervalPoint[]>>;
  carData(q: TelemetryQuery): Promise<Envelope<CarDataSample[]>>;
  locations(q: TelemetryQuery): Promise<Envelope<LocationPoint[]>>;
  weather(q: SessionQuery): Promise<Envelope<WeatherObservation[]>>;
  raceControl(q: SessionQuery): Promise<Envelope<RaceControlMessage[]>>;
  sessionResult(q: SessionQuery): Promise<Envelope<SessionResultEntry[]>>;
  startingGrid(q: SessionQuery): Promise<Envelope<GridSlot[]>>;
  overtakes(q: SessionQuery): Promise<Envelope<Overtake[]>>;
  teamRadio(q: SessionQuery): Promise<Envelope<TeamRadioClip[]>>;
}
