import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarView } from "./CalendarView";
import { UpcomingList } from "./UpcomingList";
import { normalizeCalendarEvents } from "../../functions/api/calendar";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("Calendar audit regressions", () => {
  const occurrence = { id: "synthetic", summary: "P&P Intake - PRIVATE_SENTINEL", status: "confirmed", start: { date: "2026-09-28" }, end: { date: "2026-09-29" } };
  it("omits unapproved Case Management occurrences, including their timing", () => {
    for (const summary of [occurrence.summary, "Yoga at BIRCH", "[staff hub] Yoga", " [STAFF HUB] Yoga", "Yoga [STAFF HUB]", undefined]) {
      expect(normalizeCalendarEvents([{ ...occurrence, summary }], undefined, "caseManagement")).toEqual([]);
    }
    expect(normalizeCalendarEvents([{ ...occurrence, summary: "[STAFF HUB] P&P Intake - PRIVATE_SENTINEL" }], undefined, "caseManagement")).toHaveLength(1);
    expect(normalizeCalendarEvents([occurrence], undefined, "hub")).toHaveLength(1);
  });
  it.each(["2026-09-99", "2026-09-31"])("ignores impossible deep-link dates %s", date => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-29T12:00:00-07:00"));
    vi.stubGlobal("window", { location: { search: `?date=${date}` } });
    const html = renderToStaticMarkup(<CalendarView events={[]} range={{ start: "2026-08-01", end: "2027-04-01" }} />);
    expect(html).toContain("Tuesday, September 29");
  });
  it("does not list ended timed or exclusive-end all-day events as upcoming", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-29T12:00:00-07:00"));
    const events = normalizeCalendarEvents([
      { ...occurrence, summary: "Ended all-day" },
      { ...occurrence, id: "ended-timed", summary: "Ended timed", start: { dateTime: "2026-09-29T09:00:00-07:00" }, end: { dateTime: "2026-09-29T10:00:00-07:00" } },
      { ...occurrence, id: "today", summary: "Today all-day", start: { date: "2026-09-29" }, end: { date: "2026-09-30" } },
      { ...occurrence, id: "ongoing", summary: "Ongoing timed", start: { dateTime: "2026-09-29T11:00:00-07:00" }, end: { dateTime: "2026-09-29T13:00:00-07:00" } },
    ]);
    const html = renderToStaticMarkup(<UpcomingList items={events} />);
    expect(html).not.toContain("Ended");
    expect(html).toContain("Today all-day");
    expect(html).toContain("Ongoing timed");
  });
});
