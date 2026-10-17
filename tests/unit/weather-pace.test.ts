import { describe, expect, it } from "vitest";
import { fitWeatherPace, type LapPoint, type WeatherSamplePoint } from "@/lib/f1/weather-pace";

const lap = (n: number, t: string, dur: number | null, out = false): LapPoint =>
  ({ lapNumber: n, dateStart: t, lapDuration: dur, isPitOutLap: out });
const wx = (t: string, temp: number): WeatherSamplePoint => ({ date: t, trackTemperature: temp });

describe("fitWeatherPace", () => {
  it("fits a line over joined lap/weather points", () => {
    // Track warms 1°C per 10 min; laps slow 0.5s per °C. Perfect linear data.
    const laps: LapPoint[] = [];
    const weather: WeatherSamplePoint[] = [];
    for (let i = 0; i < 6; i++) {
      const t = new Date(Date.UTC(2026, 9, 11, 12, i * 10)).toISOString();
      weather.push(wx(t, 30 + i));
      laps.push(lap(i + 1, t, 100 + 0.5 * i));
    }
    const fit = fitWeatherPace(laps, weather)!;
    expect(fit.points.length).toBe(6);
    expect(fit.slope).toBeCloseTo(0.5, 5);
    expect(fit.intercept).toBeCloseTo(85, 5);
    expect(fit.r2).toBeCloseTo(1, 5);
    expect(fit.tempRange).toEqual([30, 35]);
  });

  it("excludes pit-out laps and laps without times", () => {
    const weather = [wx("2026-10-11T12:00:00Z", 30), wx("2026-10-11T12:30:00Z", 34)];
    const laps: LapPoint[] = [
      lap(1, "2026-10-11T12:01:00Z", 100), lap(2, "2026-10-11T12:03:00Z", null),
      lap(3, "2026-10-11T12:05:00Z", 101, true), lap(4, "2026-10-11T12:10:00Z", 102),
      lap(5, "2026-10-11T12:15:00Z", 103), lap(6, "2026-10-11T12:20:00Z", 104),
      lap(7, "2026-10-11T12:25:00Z", 105),
    ];
    const fit = fitWeatherPace(laps, weather)!;
    expect(fit.points.map((p) => p.lapNumber)).toEqual([1, 4, 5, 6, 7]);
  });

  it("returns null on degenerate temperature range or too few points", () => {
    const flat = [wx("2026-10-11T12:00:00Z", 30), wx("2026-10-11T12:30:00Z", 30)];
    const laps = Array.from({ length: 8 }, (_, i) =>
      lap(i + 1, new Date(Date.UTC(2026, 9, 11, 12, i * 3)).toISOString(), 100 + i));
    expect(fitWeatherPace(laps, flat)).toBeNull();
    expect(fitWeatherPace(laps.slice(0, 3), [wx("2026-10-11T12:00:00Z", 30), wx("2026-10-11T12:30:00Z", 35)])).toBeNull();
    expect(fitWeatherPace(laps, [])).toBeNull();
  });

  it("ignores joins more than 15 minutes from a weather sample", () => {
    const weather = [wx("2026-10-11T12:00:00Z", 30), wx("2026-10-11T12:05:00Z", 31)];
    const laps = Array.from({ length: 6 }, (_, i) =>
      lap(i + 1, new Date(Date.UTC(2026, 9, 11, 13, i * 3)).toISOString(), 100 + i)); // an hour later
    expect(fitWeatherPace(laps, weather)).toBeNull();
  });
});
