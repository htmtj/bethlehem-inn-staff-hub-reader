import { useEffect, useMemo, useState } from "react";
import { getActiveEvents } from "../lib/content";
import { loadCalendarEvents, mergeEvents, type CalendarFeedState } from "../lib/calendar";
import type { EventItem } from "../types/content";

export function useCalendarEvents(): { events: EventItem[]; state: CalendarFeedState } {
  const [calendarEvents, setCalendarEvents] = useState<EventItem[]>([]);
  const [state, setState] = useState<CalendarFeedState>("loading");

  useEffect(() => {
    let cancelled = false;
    loadCalendarEvents()
      .then((items) => {
        if (cancelled) return;
        setCalendarEvents(items);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = useMemo(
    () => mergeEvents(state === "unavailable" ? getActiveEvents() : [], calendarEvents),
    [calendarEvents, state],
  );
  return { events: active, state };
}
