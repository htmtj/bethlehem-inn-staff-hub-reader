import { describe, expect, it } from "vitest";
import { normalizeCalendarEvents, onRequestGet, STAFF_HUB_CALENDAR_ID } from "./calendar";

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
});
