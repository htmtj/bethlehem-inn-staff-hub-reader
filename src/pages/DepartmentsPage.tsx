import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { DepartmentIcon } from "../components/ContentIcons";
import { departments, getActiveNews, getActiveResources } from "../lib/content";
import { useCalendarEvents } from "../hooks/useCalendarEvents";

export function DepartmentsPage() {
  const activeNews = getActiveNews();
  const { events: activeEvents, state } = useCalendarEvents();
  const activeResources = getActiveResources();

  return (
    <div className="page-width page-stack">
      <header className="page-header">
        <h1>Departments</h1>
        <p>Each space brings together department news, upcoming items, and commonly used staff resources without becoming a separate mini-site.</p>
      </header>
      <section aria-labelledby="department-directory-heading">
        <h2 id="department-directory-heading" className="sr-only">Department directory</h2>
        <ul className="department-directory">
          {departments.map((department) => {
            const newsCount = activeNews.filter((item) => item.department === department.id).length;
            const eventCount = activeEvents.filter((item) => item.department === department.id).length;
            const resourceCount = activeResources.filter((item) => item.department === department.id).length;
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
                    <small>{resourceCount} resource{resourceCount === 1 ? "" : "s"}</small>
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
