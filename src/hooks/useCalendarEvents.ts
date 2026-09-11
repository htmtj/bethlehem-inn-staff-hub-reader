import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCalendarFeed, mergeEvents, type CalendarFeedState } from "../lib/calendar";
import { calendarRange } from "../lib/eventDates";
import type { EventItem } from "../types/content";
import { getActiveEvents } from "../lib/content";

export function useCalendarEvents(enabled = true) {
  const [calendarEvents, setCalendarEvents] = useState<EventItem[]>([]);
  const [state, setState] = useState<CalendarFeedState>("loading");
  const [range, setRange] = useState(calendarRange);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) return;
    const load = () => {
    setState("loading");
    loadCalendarFeed()
      .then(({ events: items, range: nextRange, partial }) => {
        if (cancelled) return;
        setCalendarEvents(items);
        setRange(nextRange);
        setState(partial ? "partial" : "ready");
      })
      .catch(() => {
        if (!cancelled) { setCalendarEvents([]); setState("unavailable"); }
      });
    };
    load();
    const timer = window.setInterval(() => { if (!document.hidden) load(); }, 300000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, version]);

  const active = useMemo(
    () => mergeEvents(getActiveEvents().filter((item) => !item.sample), calendarEvents),
    [calendarEvents, state],
  );
  return { events: active, state, range, refresh };
}
