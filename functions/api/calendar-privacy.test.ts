import { afterEach, describe, expect, it, vi } from "vitest";
import { CASE_MANAGEMENT_CALENDAR_ID, fetchCalendarPages, fetchMergedCalendarEvents, normalizeCalendarEvents } from "./calendar";

afterEach(() => vi.unstubAllGlobals());
const range = { start: "2026-09-01", end: "2026-12-01" };
const approved = {
  id: "fixture-occurrence-1", summary: "[STAFF HUB] WorkSource-BIRCH", status: "confirmed",
  start: { dateTime: "2026-11-02T09:00:00-08:00" }, end: { dateTime: "2026-11-02T10:00:00-08:00" },
};
const project = (events: unknown[]) => normalizeCalendarEvents(events as never, "2026-09-01T00:00:00Z", "caseManagement");
const isCase = (url: URL) => decodeURIComponent(url.pathname).includes(CASE_MANAGEMENT_CALENDAR_ID);

describe("Case Management public approval boundary", () => {
  it("admits only the exact title prefix and strips it for display", () => {
    expect(project([approved])[0].title).toBe("WorkSource-BIRCH");
    for (const summary of ["WorkSource-BIRCH", "Participant intake - Synthetic Person", " [STAFF HUB] WorkSource", "[staff hub] WorkSource", "WorkSource [STAFF HUB]", "[STAFF HUB]", "[STAFF HUB] <b></b>", null]) {
      expect(project([{ ...approved, summary }])).toEqual([]);
    }
  });
  it("omits private metadata even if the upstream sends more fields than requested", () => {
    const output = project([{ ...approved, description: "PRIVATE_SENTINEL", location: "PRIVATE_SENTINEL", attendees: [{ email: "PRIVATE_SENTINEL" }],
      conferenceData: { uri: "PRIVATE_SENTINEL" }, attachments: ["PRIVATE_SENTINEL"], organizer: "PRIVATE_SENTINEL", creator: "PRIVATE_SENTINEL", extendedProperties: { private: { notes: "PRIVATE_SENTINEL" } } }]);
    expect(output).toHaveLength(1);
    expect(output[0]).toMatchObject({ description: "", location: "", link: null });
    expect(JSON.stringify(output)).not.toContain("PRIVATE_SENTINEL");
    expect(Object.keys(output[0]).sort()).toEqual(["id", "title", "startAt", "endAt", "allDay", "category", "department", "location", "description", "link", "priority", "status", "publishedAt", "expiresAt"].sort());
  });
  it("rejects malformed, cancelled, ambiguous and invalid-date records", () => {
    for (const event of [null, 3, {}, { ...approved, status: "cancelled" }, { ...approved, status: "unknown" },
      { ...approved, end: undefined }, { ...approved, id: "" }, { ...approved, start: { dateTime: "2026-02-31T09:00:00Z" } },
      { ...approved, start: { dateTime: "2026-11-02T09:00:00" } }, { ...approved, start: { date: "2026-11-02", dateTime: "2026-11-02T09:00:00Z" } },
      { ...approved, start: { date: "2026-11-02T09:00:00Z" }, end: { date: "2026-11-03T09:00:00Z" } },
      { ...approved, end: { dateTime: "2026-11-01T09:00:00Z" } }]) expect(project([event])).toEqual([]);
  });
  it("preserves approved all-day multi-day spans and Pacific offset timestamps", () => {
    expect(project([{ ...approved, start: { date: "2026-11-01" }, end: { date: "2026-11-04" } }])[0]).toMatchObject({ allDay: true, startAt: "2026-11-01", endAt: "2026-11-04" });
    expect(project([approved])[0]).toMatchObject({ allDay: false, startAt: "2026-11-02T17:00:00.000Z" });
  });
});

describe("Independent read-only sources", () => {
  it("paginates each source independently, isolates identical IDs and returns only the projection", async () => {
    const calls: URL[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: string, init: RequestInit) => {
      const url = new URL(input); calls.push(url);
      expect(init.method ?? "GET").toBe("GET");
      if (isCase(url)) expect(url.searchParams.get("fields")).toBe("nextPageToken,items(id,summary,status,start,end)");
      const item = isCase(url) ? approved : { ...approved, summary: "Dedicated calendar training" };
      if (!url.searchParams.has("pageToken")) return Response.json({ items: [item], nextPageToken: isCase(url) ? "case-page" : "hub-page" });
      return Response.json({ items: [item, { ...item, id: "fixture-occurrence-2", start: { dateTime: "2026-11-09T09:00:00-08:00" }, end: { dateTime: "2026-11-09T10:00:00-08:00" } }] });
    }));
    const result = await fetchMergedCalendarEvents("test-token", range);
    expect(result.availability).toBe("complete");
    expect(result.events).toHaveLength(4);
    expect(new Set(result.events.map((event) => event.id)).size).toBe(4);
    expect(result.events.every((event) => /^calendar-[a-f0-9]{64}$/.test(event.id))).toBe(true);
    expect(JSON.stringify(result)).not.toContain("fixture-occurrence");
    expect(calls).toHaveLength(4);
    for (const url of calls) {
      expect(url.searchParams.get("singleEvents")).toBe("true");
      expect(url.searchParams.get("showDeleted")).toBe("false");
      expect(url.searchParams.get("timeMin")).toBeTruthy(); expect(url.searchParams.get("timeMax")).toBeTruthy();
    }
    const repeat = await fetchMergedCalendarEvents("test-token", range);
    expect(repeat.events.map((event) => event.id)).toEqual(result.events.map((event) => event.id));
  });
  it.each(["hub", "caseManagement"])("retains the valid source when %s fails, without leaking partial pages", async (failed) => {
    vi.stubGlobal("fetch", vi.fn(async (input: string) => {
      const url = new URL(input);
      if (isCase(url) === (failed === "caseManagement")) {
        if (!url.searchParams.has("pageToken")) return Response.json({ items: [approved], nextPageToken: "failure-page" });
        return new Response("PRIVATE_ERROR_BODY", { status: 403 });
      }
      return Response.json({ items: [approved, { ...approved, id: "private-unapproved", summary: "PRIVATE_SENTINEL" }] });
    }));
    const result = await fetchMergedCalendarEvents("test-token", range);
    expect(result.availability).toBe("partial");
    expect(result.events.length).toBe(failed === "hub" ? 1 : 2);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_ERROR_BODY");
    if (failed === "hub") expect(JSON.stringify(result)).not.toContain("PRIVATE_SENTINEL");
  });
  it("fails closed when both sources fail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("PRIVATE_ERROR_BODY", { status: 503 })));
    await expect(fetchMergedCalendarEvents("test-token", range)).rejects.toThrow("Calendar feed unavailable");
  });
  it("reflects approval removal, edits and cancellation on the next read without stored copies", async () => {
    let current = approved;
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ items: [current] })));
    const first = await fetchCalendarPages("test-token", range, "caseManagement");
    current = { ...approved, summary: "[STAFF HUB] Updated title" };
    const edited = await fetchCalendarPages("test-token", range, "caseManagement");
    expect(edited[0].id).toBe(first[0].id); expect(edited[0].title).toBe("Updated title");
    current = { ...approved, summary: "Approval removed" };
    expect(await fetchCalendarPages("test-token", range, "caseManagement")).toEqual([]);
    current = { ...approved, status: "cancelled" };
    expect(await fetchCalendarPages("test-token", range, "caseManagement")).toEqual([]);
  });
});
