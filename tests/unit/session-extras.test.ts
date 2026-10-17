import { describe, expect, it } from "vitest";
import { DemoDataProvider } from "@/lib/providers/demo";
import {
  openF1OvertakeSchema, openF1SessionResultSchema, openF1StartingGridSchema, openF1TeamRadioSchema,
} from "@/lib/providers/openf1/schemas";

describe("session extras schemas", () => {
  it("accepts real OpenF1 session_result rows", () => {
    const row = { position: 1, driver_number: 3, number_of_laps: 62, points: 25, dnf: false, dns: false, dsq: false, duration: 6120.785, gap_to_leader: 0 };
    expect(openF1SessionResultSchema.parse(row).driver_number).toBe(3);
  });
  it("accepts duration as array and gap as string (multi-day / lapped formats)", () => {
    const row = { position: 9, driver_number: 14, number_of_laps: 61, dnf: false, dns: false, dsq: false, duration: [6120, 13], gap_to_leader: "+1 LAP" };
    const parsed = openF1SessionResultSchema.parse(row);
    expect(Array.isArray(parsed.duration)).toBe(true);
    expect(parsed.gap_to_leader).toBe("+1 LAP");
  });
  it("accepts DNF rows with missing duration and null gap", () => {
    const row = { position: null, driver_number: 77, dnf: true, dns: false, dsq: false, duration: null, gap_to_leader: null };
    expect(openF1SessionResultSchema.parse(row).dnf).toBe(true);
  });
  it("parses overtake rows", () => {
    const row = { meeting_key: 1296, session_key: 11388, overtaking_driver_number: 55, overtaken_driver_number: 31, date: "2026-10-11T12:03:48.886000+00:00", position: 12 };
    expect(openF1OvertakeSchema.parse(row).position).toBe(12);
  });
  it("parses team radio rows", () => {
    const row = { meeting_key: 1296, session_key: 11388, driver_number: 23, date: "2026-10-11T11:56:17.510000+00:00", recording_url: "https://livetiming.formula1.com/x.mp3" };
    expect(openF1TeamRadioSchema.parse(row).recording_url).toContain("mp3");
  });
  it("accepts non-numeric positions like RT in qualifying results", () => {
    const row = { position: "RT", driver_number: 44, dnf: false, dns: false, dsq: false, duration: null, gap_to_leader: null };
    expect(openF1SessionResultSchema.parse(row).position).toBe("RT");
  });
  it("parses starting grid rows", () => {
    expect(openF1StartingGridSchema.parse({ position: 1, driver_number: 3, lap_duration: 97.1 }).position).toBe(1);
  });
});

describe("demo provider extras", () => {
  const demo = new DemoDataProvider();
  it("serves the Singapore classification snapshot", async () => {
    const env = await demo.sessionResult({ sessionKey: 11388 });
    expect(env.provenance.status).toBe("demo");
    expect(env.data.length).toBeGreaterThan(10);
    expect(env.data[0].position).toBe(1);
    expect(env.data[0].duration).toBeGreaterThan(6000);
  });
  it("derives the demo grid from qualifying (11384), sorted", async () => {
    const env = await demo.startingGrid({ sessionKey: 11388 });
    expect(env.data.length).toBeGreaterThan(10);
    expect(env.data[0].position).toBe(1);
    for (let i = 1; i < env.data.length; i++) expect(env.data[i].position).toBeGreaterThan(env.data[i - 1].position);
  });
  it("serves overtakes and radio snapshots; other sessions are empty, not fake", async () => {
    expect((await demo.overtakes({ sessionKey: 11388 })).data.length).toBeGreaterThan(50);
    expect((await demo.teamRadio({ sessionKey: 11388 })).data.length).toBeGreaterThan(10);
    expect((await demo.overtakes({ sessionKey: 99999 })).data).toEqual([]);
  });
  it("filters radio by driver number", async () => {
    const env = await demo.teamRadio({ sessionKey: 11388, driverNumber: 23 });
    expect(env.data.length).toBeGreaterThan(0);
    expect(env.data.every((c) => c.driverNumber === 23)).toBe(true);
  });
});
