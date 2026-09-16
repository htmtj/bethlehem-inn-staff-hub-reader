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
  it("coalesces concurrent subscribers without retaining a stale completed response", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ source: "calendar", events: [], fetchedAt: "2026-09-16T14:00:00Z" }));
    vi.stubGlobal("fetch", fetcher);
    const first = loadCalendarFeed(); const second = loadCalendarFeed();
    expect(first).toBe(second);
    expect((await first).fetchedAt).toBe("2026-09-16T14:00:00Z");
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValue(Response.json({ source: "calendar", events: [event("new", "2026-10-01T09:00:00Z")] }));
    expect((await loadCalendarFeed()).events).toHaveLength(1);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1].cache).toBe("no-store");
  });
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
