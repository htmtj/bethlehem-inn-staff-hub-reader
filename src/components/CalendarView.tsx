import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { getDepartmentName } from "../lib/content";
import { calendarRange, eventOnDate, formatEventDate, formatEventTime, hubDateKey, type CalendarRange } from "../lib/eventDates";
import type { EventItem } from "../types/content";

type Props = {
  events: EventItem[];
  loading?: boolean;
  unavailable?: boolean;
  range?: CalendarRange;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function eventDateKey(value: string): string {
  return hubDateKey(value);
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

export function CalendarView({ events, loading = false, unavailable = false, range = calendarRange() }: Props) {
  const todayKey = hubDateKey(new Date());
  const today = new Date(`${todayKey}T12:00:00`);
  const requestedDate = new URLSearchParams(window.location.search).get("date");
  const firstEventDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate) && requestedDate >= range.start && requestedDate < range.end ? requestedDate : todayKey;
  const [cursor, setCursor] = useState(() => {
    const [year, month] = firstEventDate.split("-").map(Number);
    return new Date(year, month - 1, 1);
  });
  const [selectedDate, setSelectedDate] = useState(firstEventDate);

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

  const selectedEvents = events.filter((event) => eventOnDate(event, selectedDate));
  const monthEvents = events.filter((event) => days.some((day) => day.getMonth() === cursor.getMonth() && eventOnDate(event, dateKey(day))));

  const moveMonth = (offset: number) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1);
    setCursor(next);
    setSelectedDate(dateKey(next));
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
          <button disabled={dateKey(cursor) <= range.start} aria-label="Previous month" className="icon-button" onClick={() => moveMonth(-1)} type="button"><ChevronLeft aria-hidden="true" /></button>
          <button disabled={dateKey(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) >= range.end} aria-label="Next month" className="icon-button" onClick={() => moveMonth(1)} type="button"><ChevronRight aria-hidden="true" /></button>
        </div>
      </div>

      <div className="calendar-layout">
        <div className="calendar-grid-wrap">
          <div aria-hidden="true" className="calendar-weekdays">
            {DAY_NAMES.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="calendar-grid" role="group" aria-label={`Choose a date in ${monthTitle(cursor)}`}>
            {days.map((day) => {
              const key = dateKey(day);
              const dayEvents = events.filter((event) => eventOnDate(event, key));
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
                  aria-current={key === todayKey ? "date" : undefined}
                  disabled={key < range.start || key >= range.end}
                  className={classes}
                  key={key}
                  onClick={() => { setSelectedDate(key); if (!inMonth) setCursor(monthStart(day)); }}
                  type="button"
                >
                  <span>{day.getDate()}</span>
                  {dayEvents.length ? <i aria-hidden="true" className="calendar-day__dot" /> : null}
                </button>
              );
            })}
          </div>
          <p className="calendar-legend"><span aria-hidden="true" className="calendar-day__dot" /> Dates with staff events</p>
          <p className="calendar-range">Pacific time · {formatEventDate(range.start, { month: "short", year: "numeric" })}–{formatEventDate(new Date(Date.parse(range.end) - 86400000).toISOString().slice(0, 10), { month: "short", year: "numeric" })}</p>
        </div>

        <section aria-labelledby="calendar-agenda-heading" className="calendar-agenda" aria-live="polite" aria-busy={loading}>
          <div className="calendar-agenda__heading">
            <div>
              <span>Selected date</span>
              <h2 id="calendar-agenda-heading">{readableDate(selectedDate)}</h2>
            </div>
            <strong>{selectedEvents.length} {selectedEvents.length === 1 ? "event" : "events"}</strong>
          </div>
          {unavailable ? (
            <div className="calendar-empty-state"><CalendarDays aria-hidden="true" /><h3>Calendar temporarily unavailable</h3><p>We couldn’t confirm the events for this date. Use Refresh calendar to try again.</p></div>
          ) : loading ? (
            <div className="calendar-empty-state"><CalendarDays aria-hidden="true" /><h3>Checking the calendar</h3><p>Looking for the latest approved staff events.</p></div>
          ) : selectedEvents.length ? (
            <ul className="calendar-agenda__list">
              {selectedEvents.map((event) => (
                <li key={event.id}>
                  <div className="calendar-agenda__time"><Clock3 aria-hidden="true" size={15} /> {formatEventTime(event)}</div>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <div className="calendar-agenda__meta"><span><MapPin aria-hidden="true" size={14} /> {event.location || "Location not provided"}</span><span>{getDepartmentName(event.department)}</span></div>
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
          <div className="section-heading-row"><h2 id="next-up-heading">This month</h2><span>{monthEvents.length} events</span></div>
          <ol>
            {monthEvents.map((event) => <li key={event.id}><time dateTime={event.startAt}>{formatEventDate(event.startAt)}</time><div><button className="text-link" onClick={() => setSelectedDate(eventDateKey(event.startAt) < dateKey(cursor) ? dateKey(cursor) : eventDateKey(event.startAt))} type="button">{event.title}</button><span>{formatEventTime(event)} · {event.location}</span></div></li>)}
          </ol>
        </section>
      ) : null}
    </section>
  );
}
