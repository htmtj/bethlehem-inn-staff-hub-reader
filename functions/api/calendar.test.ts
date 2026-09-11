import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCalendarPages, normalizeCalendarEvents, onRequestGet, STAFF_HUB_CALENDAR_ID } from "./calendar";
afterEach(() => vi.unstubAllGlobals());

describe("Calendar event projection", () => {
  it("keeps only safe display fields and omits cancelled events", () => {
    const events = normalizeCalendarEvents([
      {
        id: "event-1",
        summary: "  Bend staff training  ",
        description: "<b>Bring a badge</b>",
        location: "Room 2",
        status: "confirmed",
        start: { dateTime: "2026-10-01T09:00:00-07:00" },
        end: { dateTime: "2026-10-01T10:00:00-07:00" },
        htmlLink: "https://calendar.google.com/private-event",
        attendees: [{ email: "private@example.invalid" }],
      },
      { id: "cancelled", status: "cancelled", start: { date: "2026-10-02" } },
    ] as never, "2026-09-09T00:00:00.000Z");

    expect(events).toEqual([{
      id: "calendar-event-1",
      allDay: false,
      title: "Bend staff training",
      startAt: "2026-10-01T16:00:00.000Z",
      endAt: "2026-10-01T17:00:00.000Z",
      category: "Calendar",
      department: "administration",
      location: "Room 2",
      description: "Bring a badge",
      link: null,
      priority: "standard",
      status: "published",
      publishedAt: "2026-09-09T00:00:00.000Z",
      expiresAt: "2026-10-01T17:00:00.000Z",
    }]);
    expect(JSON.stringify(events)).not.toContain("private@example.invalid");
    expect(STAFF_HUB_CALENDAR_ID).toContain("@group.calendar.google.com");
  });

  it("fails closed when the Production secret is not configured", async () => {
    const response = await onRequestGet({ env: {} });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ events: [], source: "unavailable" });
  });

  it("preserves all-day dates and their exclusive multi-day end without a UTC date shift", () => {
    const [event] = normalizeCalendarEvents([{ id: "unit-only", start: { date: "2026-11-01" }, end: { date: "2026-11-04" } }]);
    expect(event).toMatchObject({ allDay: true, startAt: "2026-11-01", endAt: "2026-11-04" });
    expect(normalizeCalendarEvents([{ id: "bad", start: { date: "2026-02-31" } }])).toEqual([]);
  });

  it("follows even an empty first page, expands recurrences, deduplicates and hashes public IDs", async () => {
    const item = { id: "source-unit-only", start: { date: "2026-10-01" }, end: { date: "2026-10-02" } };
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ items: [], nextPageToken: "next" }))
      .mockResolvedValueOnce(Response.json({ items: [item, item] }));
    vi.stubGlobal("fetch", fetcher);
    const result = await fetchCalendarPages("unit-test-token", { start: "2026-09-01", end: "2026-11-01" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toMatch(/^calendar-[a-f0-9]{64}$/);
    const url = new URL(fetcher.mock.calls[1][0]);
    expect(url.pathname).toContain(encodeURIComponent(STAFF_HUB_CALENDAR_ID));
    expect(url.searchParams.get("pageToken")).toBe("next");
    expect(url.searchParams.get("singleEvents")).toBe("true");
    expect(url.searchParams.get("timeMax")).toBeTruthy();
    expect(url.searchParams.get("timeZone")).toBe("America/Los_Angeles");
    expect(JSON.stringify(result)).not.toContain("source-unit-only");
  });

  it("rejects partial feeds and repeated page tokens instead of reporting false completeness", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => Response.json({ items: [], nextPageToken: "loop" })));
    await expect(fetchCalendarPages("unit-test-token", { start: "2026-09-01", end: "2026-11-01" })).rejects.toThrow("pagination");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 })));
    await expect(fetchCalendarPages("unit-test-token", { start: "2026-09-01", end: "2026-11-01" })).rejects.toThrow();
  });
});
