import { describe, expect, it } from "vitest";
import { calendarRange, eventOnDate, formatEventDate, formatEventTime, hubDateKey } from "./eventDates";
import type { EventItem } from "../types/content";
const event = (startAt: string, endAt: string | null, allDay = false) => ({ startAt, endAt, allDay } as EventItem);
describe("Calendar date contract", () => {
  it("uses Pacific dates through DST and does not guess midnight is all-day", () => {
    expect(hubDateKey("2026-11-01T06:00:00Z")).toBe("2026-10-31");
    expect(formatEventTime(event("2026-10-01T00:00:00Z", null))).toBe("5:00 PM PT");
    expect(formatEventDate("2026-10-01")).toBe("Oct 1");
  });
  it("marks every day in an all-day span except its exclusive end", () => {
    const item = event("2026-11-01", "2026-11-04", true);
    expect(["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"].map((date) => eventOnDate(item, date))).toEqual([false, true, true, true, false]);
    expect(formatEventTime(item)).toBe("All day");
  });
  it("shows overnight timed events across dates without adding the exclusive end date", () => {
    const item = event("2026-10-01T23:00:00-07:00", "2026-10-03T00:00:00-07:00");
    expect(eventOnDate(item, "2026-10-02")).toBe(true);
    expect(eventOnDate(item, "2026-10-03")).toBe(false);
  });
  it("bounds month navigation across year rollover", () => {
    expect(calendarRange(new Date("2026-12-15T12:00:00Z"))).toEqual({ start: "2026-11-01", end: "2027-07-01" });
  });
});
