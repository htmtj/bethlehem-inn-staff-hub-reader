import { ArrowLeft, ArrowRight, CircleAlert } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DepartmentIcon } from "../components/ContentIcons";
import { NewsList } from "../components/NewsList";
import { ResourceList } from "../components/ResourceList";
import { UpcomingList } from "../components/UpcomingList";
import {
  formatDate,
  getActiveEvents,
  getActiveNews,
  getActiveResources,
  getDepartment,
} from "../lib/content";
import { NotFoundPage } from "./NotFoundPage";

export function DepartmentPage() {
  const { departmentId } = useParams();
  const department = getDepartment(departmentId);
  if (!department) return <NotFoundPage />;

  const departmentNews = getActiveNews().filter((item) => item.department === department.id);
  const important = departmentNews.find((item) => item.priority !== "standard" || item.actionNeeded);
  const remainingNews = departmentNews.filter((item) => item.id !== important?.id);
  const departmentEvents = getActiveEvents().filter((item) => item.department === department.id);
  const departmentResources = getActiveResources().filter((item) => item.department === department.id);

  return (
    <>
      <header className={`department-hero department-hero--${department.accent}`}>
        <div className="page-width">
          <nav aria-label="Breadcrumb" className="breadcrumb breadcrumb--inverse">
            <Link to="/departments"><ArrowLeft aria-hidden="true" size={17} /> All departments</Link>
          </nav>
          <div className="department-hero__content">
            <div>
              <h1>{department.displayName}</h1>
              <p>{department.description}</p>
              <span>{department.ownerLabel}</span>
            </div>
            <span className="department-hero__icon"><DepartmentIcon id={department.id} size={86} /></span>
          </div>
        </div>
      </header>
      <div className="page-width department-page-grid">
        <div className="department-main">
          <section aria-labelledby="department-important-heading">
            <h2 id="department-important-heading">Important for {department.name}</h2>
            {important ? (
              <Link className="department-important" to={`/news/${important.slug}`}>
                <span><CircleAlert aria-hidden="true" size={24} /></span>
                <span>
                  <strong>{important.title}</strong>
                  <small>{important.effectiveAt ? `Effective ${formatDate(important.effectiveAt)}` : important.summary}</small>
                </span>
                <ArrowRight aria-hidden="true" />
              </Link>
            ) : (
              <div className="empty-state"><p>No high-priority department notices right now.</p></div>
            )}
          </section>
          <section aria-labelledby="department-updates-heading">
            <div className="section-heading-row">
              <h2 id="department-updates-heading">Latest {department.name} updates</h2>
              <Link className="text-link" to={`/news?department=${department.id}`}>
                All updates <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </div>
            <NewsList items={remainingNews} />
          </section>
        </div>
        <aside className="department-sidebar">
          <section aria-labelledby="department-upcoming-heading">
            <h2 id="department-upcoming-heading">Upcoming for {department.name}</h2>
            <UpcomingList items={departmentEvents} />
            <Link className="text-link section-link" to="/upcoming">View all upcoming <ArrowRight aria-hidden="true" size={18} /></Link>
          </section>
          <section aria-labelledby="department-resources-heading">
            <h2 id="department-resources-heading">{department.name} resources</h2>
            <ResourceList items={departmentResources} />
            <Link className="text-link section-link" to={`/resources?department=${department.id}`}>View all resources <ArrowRight aria-hidden="true" size={18} /></Link>
          </section>
        </aside>
      </div>
    </>
  );
}
