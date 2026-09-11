import { afterEach, describe, expect, it, vi } from "vitest";
import { loadCalendarFeed, mergeEvents } from "./calendar";
afterEach(() => vi.unstubAllGlobals());
import type { EventItem } from "../types/content";

const event = (id: string, startAt: string): EventItem => ({
  id,
  title: id,
  startAt,
  endAt: null,
  category: "Calendar",
  department: "administration",
  location: "Bethlehem Inn",
  description: "",
  link: null,
  priority: "standard",
  status: "published",
});

describe("Calendar event merge", () => {
  it("does not interpret a failed or malformed feed as a successful empty calendar", async () => {
    for (const payload of [{}, { events: [], source: "unavailable" }]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(payload)));
      await expect(loadCalendarFeed()).rejects.toThrow();
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ events: [], source: "calendar" })));
    await expect(loadCalendarFeed()).resolves.toMatchObject({ events: [] });
  });
  it("deduplicates by stable event ID and keeps chronological order", () => {
    const merged = mergeEvents(
      [event("sample", "2026-10-02T09:00:00Z")],
      [event("calendar-1", "2026-10-01T09:00:00Z"), event("sample", "2026-10-02T11:00:00Z")],
    );
    expect(merged.map((item) => item.id)).toEqual(["calendar-1", "sample"]);
    expect(merged.find((item) => item.id === "sample")?.startAt).toBe("2026-10-02T11:00:00Z");
  });
  it("preserves valid events while reporting incomplete source availability", async () => {
    const items = [event("available", "2026-10-01T09:00:00Z")];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ events: items, source: "calendar", availability: "partial" })));
    await expect(loadCalendarFeed()).resolves.toMatchObject({ events: items, partial: true });
  });
});
