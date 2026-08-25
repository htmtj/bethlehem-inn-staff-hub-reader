import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { UpcomingList } from "../components/UpcomingList";
import { departments, getActiveEvents } from "../lib/content";

export function UpcomingPage() {
  const [department, setDepartment] = useState("all");
  const [category, setCategory] = useState("all");
  const active = getActiveEvents();
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
          <h1>Upcoming</h1>
          <p>Sample meetings, trainings, deadlines, and organizational dates. Calendar integration is intentionally deferred.</p>
        </div>
      </header>
      <section aria-labelledby="upcoming-list-heading">
        <div className="section-heading-row">
          <h2 id="upcoming-list-heading">Coming up</h2>
          <p className="result-count">{filtered.length} item{filtered.length === 1 ? "" : "s"}</p>
        </div>
        <div className="filter-bar filter-bar--selects">
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
        </div>
        <div className="upcoming-page-list">
          <UpcomingList items={filtered} />
        </div>
      </section>
    </div>
  );
}
