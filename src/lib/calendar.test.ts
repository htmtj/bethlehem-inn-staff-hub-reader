import { describe, expect, it } from "vitest";
import { mergeEvents } from "./calendar";
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
  it("deduplicates by stable event ID and keeps chronological order", () => {
    const merged = mergeEvents(
      [event("sample", "2026-10-02T09:00:00Z")],
      [event("calendar-1", "2026-10-01T09:00:00Z"), event("sample", "2026-10-02T11:00:00Z")],
    );
    expect(merged.map((item) => item.id)).toEqual(["calendar-1", "sample"]);
    expect(merged.find((item) => item.id === "sample")?.startAt).toBe("2026-10-02T11:00:00Z");
  });
});
