import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCalendarFeed, mergeEvents, type CalendarFeedState } from "../lib/calendar";
import { calendarRange } from "../lib/eventDates";
import type { EventItem } from "../types/content";
import { getActiveEvents } from "../lib/content";
export const CALENDAR_REFRESH_MS = 60000;

export function useCalendarEvents(enabled = true) {
  const [calendarEvents, setCalendarEvents] = useState<EventItem[]>([]);
  const [state, setState] = useState<CalendarFeedState>("loading");
  const [range, setRange] = useState(calendarRange);
  const [version, setVersion] = useState(0);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) return;
    const load = () => {
    setState("loading");
    loadCalendarFeed()
      .then(({ events: items, range: nextRange, partial, fetchedAt: checkedAt }) => {
        if (cancelled) return;
        setCalendarEvents(items);
        setRange(nextRange);
        setFetchedAt(checkedAt);
        setState(partial ? "partial" : "ready");
      })
      .catch(() => {
        if (!cancelled) { setCalendarEvents([]); setFetchedAt(null); setState("unavailable"); }
      });
    };
    load();
    const visibleLoad = () => { if (!document.hidden) load(); };
    const timer = window.setInterval(visibleLoad, CALENDAR_REFRESH_MS);
    window.addEventListener("focus", visibleLoad);
    document.addEventListener("visibilitychange", visibleLoad);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", visibleLoad);
      document.removeEventListener("visibilitychange", visibleLoad);
    };
  }, [enabled, version]);

  const active = useMemo(
    () => mergeEvents(getActiveEvents().filter((item) => !item.sample), calendarEvents),
    [calendarEvents, state],
  );
  return { events: active, state, range, refresh, fetchedAt };
}
