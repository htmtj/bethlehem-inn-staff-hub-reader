import type { EventItem } from "../types/content";

export const HUB_TIME_ZONE = "America/Los_Angeles";
export type CalendarRange = { start: string; end: string };

export function hubDateKey(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: HUB_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function calendarRange(now = new Date()): CalendarRange {
  const [year, month] = hubDateKey(now).split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10),
    end: new Date(Date.UTC(year, month + 6, 1)).toISOString().slice(0, 10),
  };
}

export function eventOnDate(event: EventItem, date: string): boolean {
  const start = hubDateKey(event.startAt);
  if (!event.endAt) return start === date;
  // Google Calendar end dates/times are exclusive, including multi-day all-day events.
  const last = event.allDay || /^\d{4}-\d{2}-\d{2}$/.test(event.endAt)
    ? new Date(Date.parse(event.endAt) - 1).toISOString().slice(0, 10)
    : hubDateKey(new Date(Date.parse(event.endAt) - 1));
  return start <= date && date <= last;
}

export function formatEventDate(value: string, options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : HUB_TIME_ZONE }).format(new Date(value));
}

export function formatEventTime(event: EventItem): string {
  if (event.allDay || /^\d{4}-\d{2}-\d{2}$/.test(event.startAt)) return "All day";
  const format = (value: string) => new Intl.DateTimeFormat("en-US", { timeZone: HUB_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(new Date(value));
  return `${format(event.startAt)}${event.endAt ? `–${format(event.endAt)}` : ""} PT`;
}
