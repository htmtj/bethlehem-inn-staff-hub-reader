import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeCalendarEvents, fetchCalendarPages } from "./calendar";
import { CalendarView } from "../../src/components/CalendarView";
import { UpcomingList } from "../../src/components/UpcomingList";
import { eventOnDate, formatEventTime } from "../../src/lib/eventDates";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const base = { id: "synthetic-occurrence", summary: "Yoga at BIRCH", status: "confirmed", start: { dateTime: "2026-11-02T09:00:00-08:00" }, end: { dateTime: "2026-11-02T10:00:00-08:00" } };
const project = (items: unknown[]) => normalizeCalendarEvents(items as never, "2026-11-01T00:00:00Z", "caseManagement");

describe("continuous safe Calendar mirror", () => {
  it.each([
    [{ loading: true }, "Checking the calendar"],
    [{ unavailable: true }, "Calendar temporarily unavailable"],
    [{ partial: true }, "No available events for this date"],
    [{}, "No staff events are scheduled for this period"],
  ])("distinguishes the rendered Calendar state %o", (state, message) => {
    vi.stubGlobal("window", { location: { search: "?date=2026-11-02" } });
    const html = renderToStaticMarkup(createElement(CalendarView, { events: [], ...state, range: { start: "2026-11-01", end: "2027-01-01" } }));
    expect(html).toContain(message);
  });
  it.each(["Worksource-BIRCH", "DCBH @ BIRCH", "Yoga at BIRCH", "Sound Bath-Bend", "Ideal Option-Bend", "Participant Job Fair-Bend"])("automatically includes established service %s without a marker", title => {
    expect(project([{ ...base, summary: title }])[0].title).toBe(title);
  });
  it("includes all valid new unknown occurrences without their source titles", () => {
    const events = project([base, { ...base, id: "new", summary: "PRIVATE_NEW_CATEGORY" }, { ...base, id: "missing-title", summary: undefined }]);
    expect(events).toHaveLength(3);
    expect(events.map(e => e.title)).toEqual(["Yoga at BIRCH", "Case Management Event", "Case Management Event"]);
    expect(JSON.stringify(events)).not.toContain("PRIVATE_NEW_CATEGORY");
  });
  it("uses the fixed intake class label, never arbitrary name stripping", () => {
    expect(project([{ ...base, summary: "P&P Intake - Synthetic Participant X. (m)" }])[0].title).toBe("P&P Intake");
    expect(project([{ ...base, summary: "[STAFF HUB] P&P Intake - PRIVATE_SENTINEL" }])[0].title).toBe("P&P Intake");
    expect(project([{ ...base, summary: "[STAFF HUB] PRIVATE_NEW_CATEGORY" }])[0].title).toBe("Case Management Event");
    expect(project([{ ...base, summary: "Private meeting - Synthetic Participant X. (m)" }])[0].title).toBe("Case Management Event");
    expect(project([{ ...base, summary: "Yoga at BIRCH - Synthetic Participant" }])[0].title).toBe("Case Management Event");
  });
  it("keeps raw private fields out of both Calendar and Home Upcoming markup", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-02T08:00:00-08:00"));
    vi.stubGlobal("window", { location: { search: "?date=2026-11-02" } });
    const events = project([{ ...base, summary: "P&P Intake - PRIVATE_SENTINEL", location: "PRIVATE_SENTINEL", description: "PRIVATE_SENTINEL", attendees: ["PRIVATE_SENTINEL"], attachments: ["PRIVATE_SENTINEL"], organizer: "PRIVATE_SENTINEL", creator: "PRIVATE_SENTINEL" }]);
    const home = renderToStaticMarkup(createElement(UpcomingList, { items: events }));
    const calendar = renderToStaticMarkup(createElement(CalendarView, { events, range: { start: "2026-11-01", end: "2027-01-01" } }));
    for (const output of [JSON.stringify(events), home, calendar]) expect(output).not.toContain("PRIVATE_SENTINEL");
    for (const html of [home, calendar]) { expect(html).toContain("P&amp;P Intake"); expect(html).toContain("9:00 AM–10:00 AM PT"); }
    expect(events[0].location).toBe("");
  });
  it("reflects new, moved, renamed, cancelled and deleted recurring occurrences on the next read", async () => {
    let items = [base];
    const fetcher = vi.fn(async () => Response.json({ items }));
    vi.stubGlobal("fetch", fetcher);
    const read = () => fetchCalendarPages("synthetic-token", { start: "2026-11-01", end: "2027-01-01" }, "caseManagement");
    const original = await read();
    items = [base, { ...base, id: "future-occurrence", start: { dateTime: "2026-11-09T09:00:00-08:00" }, end: { dateTime: "2026-11-09T10:00:00-08:00" } }];
    expect(await read()).toHaveLength(2);
    items[0] = { ...base, summary: "DCBH @ BIRCH", start: { dateTime: "2026-11-03T11:00:00-08:00" }, end: { dateTime: "2026-11-03T12:30:00-08:00" } };
    const edited = (await read()).find(e => e.id === original[0].id)!;
    expect(edited.title).toBe("DCBH @ BIRCH"); expect(edited.startAt).toBe("2026-11-03T19:00:00.000Z");
    items[0] = { ...items[0], status: "cancelled" };
    expect(await read()).toHaveLength(1);
    items = [];
    expect(await read()).toEqual([]);
    expect(new URL(fetcher.mock.calls[0][0] as string).searchParams.get("singleEvents")).toBe("true");
  });
  it("supports timed/all-day conversion, exclusive multi-day ends and DST", () => {
    const timed = project([base])[0];
    const allDay = project([{ ...base, start: { date: "2026-11-01" }, end: { date: "2026-11-04" } }])[0];
    expect(allDay.id).toBe(timed.id); expect(allDay.allDay).toBe(true);
    expect(eventOnDate(allDay, "2026-11-03")).toBe(true); expect(eventOnDate(allDay, "2026-11-04")).toBe(false);
    const dst = project([{ ...base, start: { dateTime: "2026-11-01T01:30:00-07:00" }, end: { dateTime: "2026-11-01T01:30:00-08:00" } }])[0];
    expect(Date.parse(dst.endAt!) - Date.parse(dst.startAt)).toBe(3600000);
    expect(formatEventTime(timed)).toBe("9:00 AM–10:00 AM PT");
  });
});
