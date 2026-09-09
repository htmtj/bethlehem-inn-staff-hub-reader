import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatTimeRange, getDepartmentName } from "../lib/content";
import type { EventItem } from "../types/content";

type Props = {
  events: EventItem[];
  loading?: boolean;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function eventDateKey(value: string): string {
  // Date-only Google events are normalized to UTC midnight; preserve their source date.
  if (value.endsWith("T00:00:00.000Z")) return value.slice(0, 10);
  return dateKey(new Date(value));
}

function monthStart(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function monthTitle(value: Date): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(value);
}

function readableDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

export function CalendarView({ events, loading = false }: Props) {
  const today = new Date();
  const todayKey = dateKey(today);
  const firstEventDate = events[0] ? eventDateKey(events[0].startAt) : todayKey;
  const [cursor, setCursor] = useState(() => {
    const [year, month] = firstEventDate.split("-").map(Number);
    return new Date(year, month - 1, 1);
  });
  const [selectedDate, setSelectedDate] = useState(firstEventDate);

  useEffect(() => {
    if (!events[0]) return;
    const key = eventDateKey(events[0].startAt);
    const [year, month] = key.split("-").map(Number);
    setCursor(new Date(year, month - 1, 1));
    setSelectedDate(key);
  }, [events]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, EventItem[]>();
    for (const event of events) {
      const key = eventDateKey(event.startAt);
      grouped.set(key, [...(grouped.get(key) ?? []), event]);
    }
    return grouped;
  }, [events]);

  const days = useMemo(() => {
    const start = monthStart(cursor);
    const firstCell = new Date(start);
    firstCell.setDate(1 - start.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(firstCell);
      day.setDate(firstCell.getDate() + index);
      return day;
    });
  }, [cursor]);

  const selectedEvents = eventsByDate.get(selectedDate) ?? [];
  const monthEvents = events.filter((event) => {
    const key = eventDateKey(event.startAt);
    return key.startsWith(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-`);
  });

  const moveMonth = (offset: number) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const goToday = () => {
    setCursor(monthStart(today));
    setSelectedDate(todayKey);
  };

  return (
    <section aria-label="Staff Hub calendar" className="calendar-experience">
      <div className="calendar-toolbar">
        <div>
          <span className="calendar-toolbar__label"><CalendarDays aria-hidden="true" size={17} /> Staff calendar</span>
          <h2>{monthTitle(cursor)}</h2>
        </div>
        <div className="calendar-toolbar__actions">
          <button className="button button--secondary button--icon-label" onClick={goToday} type="button">Today</button>
          <button aria-label="Previous month" className="icon-button" onClick={() => moveMonth(-1)} type="button"><ChevronLeft aria-hidden="true" /></button>
          <button aria-label="Next month" className="icon-button" onClick={() => moveMonth(1)} type="button"><ChevronRight aria-hidden="true" /></button>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-grid-wrap">
          <div aria-hidden="true" className="calendar-weekdays">
            {DAY_NAMES.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid" role="grid" aria-label={monthTitle(cursor)}>
            {days.map((day) => {
              const key = dateKey(day);
              const dayEvents = eventsByDate.get(key) ?? [];
              const inMonth = day.getMonth() === cursor.getMonth();
              const classes = [
                "calendar-day",
                inMonth ? "" : "calendar-day--outside",
                key === todayKey ? "calendar-day--today" : "",
                key === selectedDate ? "calendar-day--selected" : "",
              ].filter(Boolean).join(" ");
              return (
                <button
                  aria-label={`${day.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${dayEvents.length ? `, ${dayEvents.length} event${dayEvents.length === 1 ? "" : "s"}` : ""}`}
                  aria-pressed={key === selectedDate}
                  className={classes}
                  key={key}
                  onClick={() => { setSelectedDate(key); if (!inMonth) setCursor(monthStart(day)); }}
                  role="gridcell"
                  type="button"
                >
                  <span>{day.getDate()}</span>
                  {dayEvents.length ? <i aria-hidden="true" className="calendar-day__dot" /> : null}
                </button>
              );
            })}
          </div>
          <p className="calendar-legend"><span aria-hidden="true" className="calendar-day__dot" /> Dates with staff events</p>
        </div>

        <section aria-labelledby="calendar-agenda-heading" className="calendar-agenda">
          <div className="calendar-agenda__heading">
            <div>
              <span>Selected date</span>
              <h2 id="calendar-agenda-heading">{readableDate(selectedDate)}</h2>
            </div>
            <strong>{selectedEvents.length} {selectedEvents.length === 1 ? "event" : "events"}</strong>
          </div>
          {loading ? (
            <div className="calendar-empty-state"><CalendarDays aria-hidden="true" /><h3>Checking the calendar</h3><p>Looking for the latest approved staff events.</p></div>
          ) : selectedEvents.length ? (
            <ul className="calendar-agenda__list">
              {selectedEvents.map((event) => (
                <li key={event.id}>
                  <div className="calendar-agenda__time"><Clock3 aria-hidden="true" size={15} /> {formatTimeRange(event.startAt, event.endAt)}</div>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <div className="calendar-agenda__meta"><span><MapPin aria-hidden="true" size={14} /> {event.location}</span><span>{getDepartmentName(event.department)}</span></div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="calendar-empty-state"><CalendarDays aria-hidden="true" /><h3>{monthEvents.length ? "No events on this date" : "No staff events are scheduled for this period"}</h3><p>{monthEvents.length ? "Choose a highlighted date to see its staff events." : "Approved staff events will appear here when they are added."}</p></div>
          )}
        </section>
      </div>

      {monthEvents.length ? (
        <section aria-labelledby="next-up-heading" className="calendar-next-up">
          <div className="section-heading-row"><h2 id="next-up-heading">Next up</h2><span>{monthEvents.length} this month</span></div>
          <ol>
            {monthEvents.slice(0, 6).map((event) => <li key={event.id}><time dateTime={event.startAt}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(event.startAt))}</time><div><strong>{event.title}</strong><span>{formatTimeRange(event.startAt, event.endAt)} · {event.location}</span></div></li>)}
          </ol>
        </section>
      ) : null}
    </section>
  );
}
