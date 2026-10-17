import { describe, expect, it } from "vitest";
import {
  classifySession,
  renderNotification,
  selectDueNotifications,
  sentKey,
  type DispatchSession,
  type PushSubscriptionRow,
} from "@/lib/f1/push-dispatch";

const NOW = new Date("2026-10-18T12:00:00Z");

function sub(over: Partial<PushSubscriptionRow> = {}): PushSubscriptionRow {
  return {
    id: "s1", endpoint: "https://push.example/x", p256dh: "k", auth: "a",
    timezone: "Asia/Jakarta", sessionKinds: ["race"], leadMinutes: 30,
    circuitKeys: [], ...over,
  };
}

function sess(over: Partial<DispatchSession> = {}): DispatchSession {
  return {
    sessionKey: 9001, meetingKey: 100, name: "Race", circuitKey: 5,
    dateStart: "2026-10-18T12:20:00Z", meetingName: "Singapore Grand Prix",
    location: "Marina Bay", ...over,
  };
}

describe("classifySession", () => {
  it("maps OpenF1 session names, including sprint typed as Race", () => {
    expect(classifySession("Race")).toBe("race");
    expect(classifySession("Sprint")).toBe("sprint");
    expect(classifySession("Qualifying")).toBe("qualifying");
    expect(classifySession("Sprint Qualifying")).toBe("qualifying");
    expect(classifySession("Practice 1")).toBe("practice");
    expect(classifySession("Day 2")).toBe("practice");
    expect(classifySession("Press Conference")).toBeNull();
  });
});

describe("selectDueNotifications", () => {
  it("includes a session inside the lead window", () => {
    const due = selectDueNotifications([sub()], [sess()], new Set(), NOW);
    expect(due).toHaveLength(1);
    expect(due[0].minutesUntil).toBe(20);
  });

  it("excludes sessions outside the window, already started, or already sent", () => {
    const far = sess({ dateStart: "2026-10-18T12:45:00Z" });   // 45 > 30 lead
    const started = sess({ sessionKey: 2, dateStart: "2026-10-18T11:59:00Z" });
    const sentOne = sess({ sessionKey: 3, dateStart: "2026-10-18T12:10:00Z" });
    const due = selectDueNotifications(
      [sub()], [far, started, sentOne], new Set([sentKey("s1", 3)]), NOW,
    );
    expect(due).toHaveLength(0);
  });

  it("filters by session kind and favourite circuits", () => {
    const quali = sess({ name: "Qualifying", dateStart: "2026-10-18T12:15:00Z" });
    expect(selectDueNotifications([sub()], [quali], new Set(), NOW)).toHaveLength(0);
    expect(selectDueNotifications([sub({ sessionKinds: ["race", "qualifying"] })], [quali], new Set(), NOW)).toHaveLength(1);

    const restricted = sub({ circuitKeys: [99] });
    expect(selectDueNotifications([restricted], [sess()], new Set(), NOW)).toHaveLength(0);
    expect(selectDueNotifications([sub({ circuitKeys: [5] })], [sess()], new Set(), NOW)).toHaveLength(1);
  });
});

describe("renderNotification", () => {
  it("renders title, localised time and a stable tag", () => {
    const n = renderNotification({ subscription: sub(), session: sess(), minutesUntil: 20 });
    expect(n.title).toBe("Race starts in 20 min");
    expect(n.body).toContain("Singapore Grand Prix");
    expect(n.body).toContain("Asia/Jakarta");
    expect(n.tag).toBe("session-9001");
    expect(n.url).toBe("/calendar");
  });

  it("falls back to UTC for an invalid stored timezone", () => {
    const n = renderNotification({
      subscription: sub({ timezone: "Not/AZone" }), session: sess(), minutesUntil: 20,
    });
    expect(n.body).toContain("(UTC)");
  });
});
