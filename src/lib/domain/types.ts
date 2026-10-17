/** Shared domain models. All provider responses are normalized into these. */

export type DataStatus =
  | "live"
  | "delayed"
  | "historical"
  | "demo"
  | "unavailable";

export interface Provenance {
  provider: string;
  status: DataStatus;
  /** When the provider observed the data (source timestamp), if known. */
  observedAt: string | null;
  /** When we retrieved it. */
  retrievedAt: string;
  /** Milliseconds after which this payload should be considered stale. */
  staleAfterMs: number;
}

export interface Envelope<T> {
  data: T;
  provenance: Provenance;
}

export type SessionStatus =
  | "upcoming"
  | "live"
  | "finished"
  | "cancelled"
  | "unknown";

export interface Circuit {
  circuitKey: number;
  shortName: string;
  name: string | null;
  type: string | null;
  location: string;
  countryKey: number;
  countryCode: string;
  countryName: string;
  countryFlagUrl: string | null;
  imageUrl: string | null;
  infoUrl: string | null;
  gmtOffset: string;
}

export interface Meeting {
  meetingKey: number;
  name: string;
  officialName: string;
  location: string;
  countryName: string;
  countryCode: string;
  countryFlagUrl: string | null;
  circuitKey: number;
  circuitShortName: string;
  circuitType: string | null;
  circuitImageUrl: string | null;
  circuitInfoUrl: string | null;
  gmtOffset: string;
  dateStart: string;
  dateEnd: string;
  year: number;
  isCancelled: boolean;
}

export interface Session {
  sessionKey: number;
  meetingKey: number;
  name: string;
  type: string;
  dateStart: string;
  dateEnd: string;
  gmtOffset: string;
  circuitKey: number;
  circuitShortName: string;
  countryName: string;
  countryCode: string;
  location: string;
  year: number;
  isCancelled: boolean;
  status: SessionStatus;
}

export interface Driver {
  driverNumber: number;
  broadcastName: string;
  fullName: string;
  firstName: string;
  lastName: string;
  acronym: string;
  teamName: string;
  teamColour: string;
  headshotUrl: string | null;
  countryCode: string | null;
}

export interface Team {
  name: string;
  colour: string;
  drivers: Driver[];
}

export interface Lap {
  driverNumber: number;
  lapNumber: number;
  dateStart: string | null;
  lapDuration: number | null;
  durationSector1: number | null;
  durationSector2: number | null;
  durationSector3: number | null;
  i1Speed: number | null;
  i2Speed: number | null;
  stSpeed: number | null;
  isPitOutLap: boolean;
  segmentsSector1: (number | null)[];
  segmentsSector2: (number | null)[];
  segmentsSector3: (number | null)[];
}

export interface Stint {
  driverNumber: number;
  stintNumber: number;
  lapStart: number;
  lapEnd: number;
  compound: string | null;
  tyreAgeAtStart: number;
}

export interface PitStop {
  driverNumber: number;
  date: string;
  lapNumber: number;
  pitDuration: number | null;
}

export interface PositionPoint {
  driverNumber: number;
  date: string;
  position: number;
}

export interface IntervalPoint {
  driverNumber: number;
  date: string;
  gapToLeader: number | string | null;
  interval: number | string | null;
}

export interface CarDataSample {
  driverNumber: number;
  date: string;
  speed: number | null;
  rpm: number | null;
  nGear: number | null;
  throttle: number | null;
  /** 0/1 brake signal from OpenF1 — a boolean, NOT brake pressure. */
  brake: number | null;
  drs: number | null;
}

export interface LocationPoint {
  driverNumber: number;
  date: string;
  x: number;
  y: number;
  z: number;
}

export interface WeatherObservation {
  date: string;
  airTemperature: number | null;
  trackTemperature: number | null;
  humidity: number | null;
  pressure: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  rainfall: number | null;
}

export interface RaceControlMessage {
  date: string;
  category: string | null;
  flag: string | null;
  scope: string | null;
  sector: number | null;
  message: string;
  lapNumber: number | null;
  driverNumber: number | null;
  source: "official" | "provider" | "historical";
}

export interface LeaderboardRow {
  position: number | null;
  driverNumber: number;
  acronym: string;
  fullName: string;
  teamName: string;
  teamColour: string;
  lastLap: number | null;
  bestLap: number | null;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  gapToLeader: number | string | null;
  interval: number | string | null;
  compound: string | null;
  tyreAge: number | null;
  pitStops: number;
  speedTrap: number | null;
  lapNumber: number | null;
  inPit: boolean;
  retired: boolean;
  personalBestSectors: [boolean, boolean, boolean];
  sessionBestSectors: [boolean, boolean, boolean];
}

export interface SeasonRound {
  round: number;
  raceName: string;
  circuitId: string;
  circuitName: string;
  locality: string;
  country: string;
  lat: number;
  long: number;
  date: string; // race datetime UTC ISO
  sessions: { name: string; date: string }[];
  url: string | null;
}

export interface RaceResult {
  round: number;
  position: number | null;
  positionText: string;
  points: number;
  driverId: string;
  driverNumber: number | null;
  code: string | null;
  givenName: string;
  familyName: string;
  constructorId: string;
  constructorName: string;
  grid: number | null;
  laps: number | null;
  status: string;
  time: string | null;
  fastestLap: boolean;
}

export interface DriverStanding {
  position: number;
  points: number;
  wins: number;
  driverId: string;
  code: string | null;
  permanentNumber: number | null;
  givenName: string;
  familyName: string;
  nationality: string;
  constructorIds: string[];
}

export interface ConstructorStanding {
  position: number;
  points: number;
  wins: number;
  constructorId: string;
  name: string;
  nationality: string;
}

export type EntityKind = "driver" | "team" | "circuit" | "meeting" | "session";

export interface UserPreferences {
  timezone: string;
  theme: "dark" | "light";
  timingColumns: string[];
  telemetryChannels: string[];
  favoriteDrivers: number[];
  favoriteTeams: string[];
  favoriteCircuits: number[];
  sessionReminders: number[]; // session keys
}

/** Official session classification row (OpenF1 session_result). */
export interface SessionResultEntry {
  position: number | null;
  driverNumber: number;
  numberOfLaps: number | null;
  points: number | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
  duration: number | null;
  gapToLeader: number | string | null;
}

/** Starting grid slot (OpenF1 starting_grid, or derived from qualifying). */
export interface GridSlot {
  position: number;
  driverNumber: number;
  lapDuration: number | null;
}

/** Recorded overtake (OpenF1 overtakes). */
export interface Overtake {
  date: string;
  overtakingDriverNumber: number;
  overtakenDriverNumber: number;
  position: number;
}

/** Team radio clip (OpenF1 team_radio; audio hosted by formula1.com). */
export interface TeamRadioClip {
  date: string;
  driverNumber: number;
  recordingUrl: string;
}
