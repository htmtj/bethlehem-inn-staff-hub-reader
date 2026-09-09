import type { EventItem } from "../types/content";

export type CalendarFeedState = "loading" | "ready" | "unavailable";

type CalendarResponse = {
  events?: EventItem[];
};

export async function loadCalendarEvents(): Promise<EventItem[]> {
  const response = await fetch("/api/calendar", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Calendar feed unavailable");
  const payload = await response.json() as CalendarResponse;
  return Array.isArray(payload.events) ? payload.events : [];
}

export function mergeEvents(localEvents: EventItem[], calendarEvents: EventItem[]): EventItem[] {
  const byId = new Map(localEvents.map((item) => [item.id, item]));
  for (const item of calendarEvents) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
}
