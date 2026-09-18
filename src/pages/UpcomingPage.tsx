import { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { departments } from "../lib/content";
import { useCalendarEvents } from "../hooks/useCalendarEvents";
import { CalendarView } from "../components/CalendarView";

export function UpcomingPage() {
  const location = useLocation();
  // A search result can target this route while it is already open, even with the same URL.
  return <UpcomingContent key={location.key} />;
}

function UpcomingContent() {
  const [department, setDepartment] = useState("all");
  const [category, setCategory] = useState("all");
  const { events: active, state, range, refresh, fetchedAt } = useCalendarEvents();
  const categories = Array.from(new Set(active.map((item) => item.category))).sort();
  const filtered = useMemo(
    () => active.filter((item) =>
      (department === "all" || item.department === department) &&
      (category === "all" || item.category === category),
    ),
    [active, category, department],
  );

  return (
    <div className="page-width page-stack">
      <header className="page-header page-header--icon">
        <span><CalendarDays aria-hidden="true" /></span>
        <div>
          <h1>Calendar</h1>
          <p>Services, activities, and organizational dates. All times are Pacific.</p>
        {fetchedAt ? <p className="calendar-freshness">Checked {new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/Los_Angeles", timeZoneName: "short" }).format(new Date(fetchedAt))} · Updates automatically every minute while open.</p> : null}
        </div>
      </header>
      {state === "unavailable" ? (
        <p className="feed-notice" role="status">Calendar could not be refreshed. Try again in a moment.</p>
      ) : null}
      {state === "partial" ? <p className="feed-notice" role="status">Some calendar information is temporarily unavailable. Available events are shown below.</p> : null}
      <section aria-labelledby="upcoming-list-heading">
        <div className="section-heading-row">
          <h2 id="upcoming-list-heading">Staff events</h2>
          <button className="button button--secondary" disabled={state === "loading"} onClick={refresh} type="button">{state === "loading" ? "Refreshing…" : "Refresh calendar"}</button>
        </div>
        {active.length > 0 ? <details className="calendar-filters"><summary>Filter events{department !== "all" || category !== "all" ? " · filters applied" : ""}</summary><div className="filter-bar filter-bar--selects">
          <label>
            <span>Department</span>
            <select onChange={(event) => setDepartment(event.target.value)} value={department}>
              <option value="all">All departments</option>
              {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select onChange={(event) => setCategory(event.target.value)} value={category}>
              <option value="all">All categories</option>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div></details> : null}
        <div className="upcoming-page-list">
          <CalendarView events={filtered} loading={state === "loading" && !active.length} unavailable={state === "unavailable" && !active.length} partial={state === "partial" || (state === "unavailable" && active.length > 0)} range={range} />
        </div>
      </section>
    </div>
  );
}
