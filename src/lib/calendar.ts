import type { EventItem } from "../types/content";
import { calendarRange, type CalendarRange } from "./eventDates";

export type CalendarFeedState = "loading" | "ready" | "partial" | "unavailable";

type CalendarResponse = {
  events?: EventItem[];
  source?: string;
  range?: CalendarRange;
  availability?: "complete" | "partial";
};

export async function loadCalendarFeed(): Promise<{ events: EventItem[]; range: CalendarRange; partial: boolean }> {
  const response = await fetch("/api/calendar", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error("Calendar feed unavailable");
  const payload = await response.json() as CalendarResponse;
  if (payload.source !== "calendar" || !Array.isArray(payload.events)) throw new Error("Calendar feed unavailable");
  return { events: payload.events, range: payload.range ?? calendarRange(), partial: payload.availability === "partial" };
}

export async function loadCalendarEvents(): Promise<EventItem[]> { return (await loadCalendarFeed()).events; }

export function mergeEvents(localEvents: EventItem[], calendarEvents: EventItem[]): EventItem[] {
  const byId = new Map(localEvents.map((item) => [item.id, item]));
  for (const item of calendarEvents) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}
