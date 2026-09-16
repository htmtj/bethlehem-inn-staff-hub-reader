import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { DepartmentIcon } from "../components/ContentIcons";
import { departments, getActiveNews } from "../lib/content";
import { useCalendarEvents } from "../hooks/useCalendarEvents";

export function DepartmentsPage() {
  const activeNews = getActiveNews();
  const { events: activeEvents, state } = useCalendarEvents();

  return (
    <div className="page-width page-stack">
      <header className="page-header">
        <h1>Departments</h1>
        <p>Find your department’s updates and upcoming events.</p>
      </header>
      <section aria-labelledby="department-directory-heading">
        <h2 id="department-directory-heading" className="sr-only">Department directory</h2>
        <ul className="department-directory">
          {departments.map((department) => {
            const newsCount = activeNews.filter((item) => item.department === department.id).length;
            const eventCount = activeEvents.filter((item) => item.department === department.id).length;
            return (
              <li key={department.id}>
                <Link to={`/departments/${department.id}`}>
                  <span className={`department-directory__icon accent-${department.id}`}>
                    <DepartmentIcon id={department.id} size={34} />
                  </span>
                  <span className="department-directory__copy">
                    <strong>{department.displayName}</strong>
                    <span>{department.description}</span>
                  </span>
                  <span className="department-directory__counts">
                    <small>{newsCount} update{newsCount === 1 ? "" : "s"}</small>
                    <small>{state === "loading" ? "Loading events…" : `${eventCount} upcoming`}{state === "partial" || state === "unavailable" ? " · incomplete" : ""}</small>
                  </span>
                  <ArrowRight aria-hidden="true" size={23} />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
