import { CalendarDays, MapPin } from "lucide-react";
import { getDepartmentName } from "../lib/content";
import { formatEventDate, formatEventTime, hubDateKey } from "../lib/eventDates";
import type { EventItem } from "../types/content";

export function UpcomingList({ items, limit, loading = false }: { items: EventItem[]; limit?: number; loading?: boolean }) {
  const upcoming = items.filter((item) => hubDateKey(item.endAt ?? item.startAt) >= hubDateKey(new Date()));
  const visibleItems = typeof limit === "number" ? upcoming.slice(0, limit) : upcoming;

  if (loading || !visibleItems.length) {
    return (
      <div className="empty-state">
        <CalendarDays aria-hidden="true" />
        <h3>{loading ? "Checking for upcoming events" : "No upcoming staff events have been posted yet"}</h3>
        <p>{loading ? "We’re checking the Staff Hub calendar for the latest approved dates." : "Approved staff events and organizational dates will appear here when they are added."}</p>
      </div>
    );
  }

  return (
    <ol className="upcoming-list">
      {visibleItems.map((item) => {
        const date = { month: formatEventDate(item.startAt, { month: "short" }), day: formatEventDate(item.startAt, { day: "2-digit" }) };
        return (
          <li key={item.id}>
            <time className="date-block" dateTime={item.startAt}>
              <span>{date.month}</span>
              <strong>{date.day}</strong>
            </time>
            <div>
              <strong>{item.title}</strong>
              <span>{formatEventTime(item)}</span>
              <span className="location-line">
                <MapPin aria-hidden="true" size={14} /> {item.location}
              </span>
              <small>{getDepartmentName(item.department)}</small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
