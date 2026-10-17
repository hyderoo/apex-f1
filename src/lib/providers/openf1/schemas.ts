import { z } from "zod";

const nullableNumber = z.number().nullable().optional().default(null);

export const openF1MeetingSchema = z.object({
  meeting_key: z.number(),
  meeting_name: z.string(),
  meeting_official_name: z.string().optional().default(""),
  location: z.string().optional().default(""),
  country_key: z.number().optional().default(0),
  country_code: z.string().optional().default(""),
  country_name: z.string().optional().default(""),
  country_flag: z.string().nullable().optional().default(null),
  circuit_key: z.number(),
  circuit_short_name: z.string().optional().default(""),
  circuit_type: z.string().nullable().optional().default(null),
  circuit_info_url: z.string().nullable().optional().default(null),
  circuit_image: z.string().nullable().optional().default(null),
  gmt_offset: z.string().optional().default("+00:00"),
  date_start: z.string(),
  date_end: z.string(),
  year: z.number(),
  is_cancelled: z.boolean().optional().default(false),
});

export const openF1SessionSchema = z.object({
  session_key: z.number(),
  session_name: z.string(),
  session_type: z.string(),
  date_start: z.string().nullable(),
  date_end: z.string().nullable(),
  gmt_offset: z.string().optional().default("+00:00"),
  meeting_key: z.number(),
  circuit_key: z.number(),
  circuit_short_name: z.string().optional().default(""),
  country_key: z.number().optional().default(0),
  country_code: z.string().optional().default(""),
  country_name: z.string().optional().default(""),
  location: z.string().optional().default(""),
  year: z.number().optional().default(0),
  is_cancelled: z.boolean().optional().default(false),
});

export const openF1DriverSchema = z.object({
  session_key: z.number(),
  driver_number: z.number(),
  broadcast_name: z.string().optional().default(""),
  full_name: z.string().optional().default(""),
  name_acronym: z.string().optional().default(""),
  team_name: z.string().optional().default(""),
  team_colour: z.string().optional().default("8a8f98"),
  first_name: z.string().optional().default(""),
  last_name: z.string().optional().default(""),
  headshot_url: z.string().nullable().optional().default(null),
  country_code: z.string().nullable().optional().default(null),
});

export const openF1LapSchema = z.object({
  driver_number: z.number(),
  lap_number: z.number(),
  date_start: z.string().nullable().optional().default(null),
  lap_duration: nullableNumber,
  duration_sector_1: nullableNumber,
  duration_sector_2: nullableNumber,
  duration_sector_3: nullableNumber,
  i1_speed: nullableNumber,
  i2_speed: nullableNumber,
  st_speed: nullableNumber,
  is_pit_out_lap: z.boolean().optional().default(false),
  segments_sector_1: z.array(z.number().nullable()).optional().default([]),
  segments_sector_2: z.array(z.number().nullable()).optional().default([]),
  segments_sector_3: z.array(z.number().nullable()).optional().default([]),
});

export const openF1StintSchema = z.object({
  driver_number: z.number(),
  stint_number: z.number(),
  lap_start: z.number(),
  lap_end: z.number(),
  compound: z.string().nullable().optional().default(null),
  tyre_age_at_start: z.number().optional().default(0),
});

export const openF1PitSchema = z.object({
  driver_number: z.number(),
  date: z.string(),
  lap_number: z.number(),
  pit_duration: nullableNumber,
});

export const openF1PositionSchema = z.object({
  driver_number: z.number(),
  date: z.string(),
  position: z.number(),
});

export const openF1IntervalSchema = z.object({
  driver_number: z.number(),
  date: z.string(),
  gap_to_leader: z.union([z.number(), z.string()]).nullable().optional().default(null),
  interval: z.union([z.number(), z.string()]).nullable().optional().default(null),
});

export const openF1CarDataSchema = z.object({
  driver_number: z.number(),
  date: z.string(),
  speed: nullableNumber,
  rpm: nullableNumber,
  n_gear: nullableNumber,
  throttle: nullableNumber,
  brake: nullableNumber,
  drs: nullableNumber,
});

export const openF1LocationSchema = z.object({
  driver_number: z.number(),
  date: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const openF1WeatherSchema = z.object({
  date: z.string(),
  air_temperature: nullableNumber,
  track_temperature: nullableNumber,
  humidity: nullableNumber,
  pressure: nullableNumber,
  wind_speed: nullableNumber,
  wind_direction: nullableNumber,
  rainfall: nullableNumber,
});

export const openF1RaceControlSchema = z.object({
  date: z.string(),
  category: z.string().nullable().optional().default(null),
  flag: z.string().nullable().optional().default(null),
  scope: z.string().nullable().optional().default(null),
  sector: z.number().nullable().optional().default(null),
  message: z.string().optional().default(""),
  lap_number: z.number().nullable().optional().default(null),
  driver_number: z.number().nullable().optional().default(null),
});
