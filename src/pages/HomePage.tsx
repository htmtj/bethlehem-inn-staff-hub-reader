import {
  ArrowRight,
  CalendarDays,
  CircleAlert,
  Megaphone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { DepartmentIcon, ResourceIcon } from "../components/ContentIcons";
import { NewsList } from "../components/NewsList";
import { UpcomingList } from "../components/UpcomingList";
import {
  departments,
  formatShortDate,
  getActiveEvents,
  getActiveNews,
  getActiveResources,
  getDepartmentName,
  getImportantNews,
} from "../lib/content";

export function HomePage() {
  const important = getImportantNews();
  const feature = important[0];
  const secondary = important.slice(1);
  const importantIds = new Set(important.map((item) => item.id));
  const latest = getActiveNews().filter((item) => !importantIds.has(item.id)).slice(0, 4);
  const upcoming = getActiveEvents();
  const quickResources = getActiveResources().filter((item) => item.featured).slice(0, 4);

  return (
    <>
      <section className="home-intro">
        <div className="page-width">
          <h1>What you need to know right now</h1>
          <p>Important updates, recent changes, upcoming dates, and useful staff resources in one place.</p>
        </div>
      </section>

      <section className="section page-width important-section" aria-labelledby="important-heading">
        <div className="section-heading-row">
          <div>
            <span className="section-symbol"><Megaphone aria-hidden="true" size={20} /></span>
            <h2 id="important-heading">Important News</h2>
          </div>
          <Link className="text-link" to="/news?priority=important">
            View important news <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
        {feature ? (
          <div className="important-layout">
            <article className="featured-news">
              <div className="featured-news__icon"><Megaphone aria-hidden="true" size={45} /></div>
              <div className="featured-news__copy">
                {feature.actionNeeded ? (
                  <span className="action-label action-label--large">
                    <CircleAlert aria-hidden="true" size={16} /> Action needed
                  </span>
                ) : null}
                <h3>{feature.title}</h3>
                <p>{feature.summary}</p>
                <div className="feature-meta">
                  <span>{getDepartmentName(feature.department)}</span>
                  {feature.effectiveAt ? <span>Effective {formatShortDate(feature.effectiveAt)}</span> : null}
                </div>
                <Link className="button button--primary" to={`/news/${feature.slug}`}>
                  Read the update <ArrowRight aria-hidden="true" size={19} />
                </Link>
              </div>
            </article>
            <div className="important-secondary">
              {secondary.map((item) => (
                <Link key={item.id} to={`/news/${item.slug}`}>
                  <span className={`content-icon accent-${item.department}`}>
                    <DepartmentIcon id={item.department} size={28} />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>
                      {getDepartmentName(item.department)}
                      {item.effectiveAt ? ` · Effective ${formatShortDate(item.effectiveAt)}` : ""}
                    </small>
                  </span>
                  <ArrowRight aria-hidden="true" size={20} />
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No important notices</h3>
            <p>There are no active high-priority items right now.</p>
          </div>
        )}
      </section>

      <section className="section-band">
        <div className="page-width home-feed-grid">
          <section aria-labelledby="latest-heading">
            <div className="section-heading-row">
              <h2 id="latest-heading">Latest from Bethlehem Inn</h2>
              <Link className="text-link home-latest-link" to="/news">
                View all news <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </div>
            <NewsList compact items={latest} />
            <Link className="text-link section-link mobile-only" to="/news">
              View all news <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </section>
          <section aria-labelledby="upcoming-heading">
            <div className="section-heading-row">
              <h2 id="upcoming-heading">Upcoming</h2>
              <CalendarDays aria-hidden="true" className="heading-icon" />
            </div>
            <UpcomingList items={upcoming} limit={3} />
            <Link className="text-link section-link" to="/upcoming">
              View all upcoming <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </section>
        </div>
      </section>

      <section className="department-band" aria-labelledby="department-heading">
        <div className="page-width">
          <div className="section-heading-row">
            <h2 id="department-heading">Explore departments</h2>
            <Link className="text-link" to="/departments">
              All departments <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
          <nav aria-label="Department spaces" className="department-rail">
            {departments.map((department) => (
              <Link key={department.id} to={`/departments/${department.id}`}>
                <DepartmentIcon id={department.id} size={25} />
                <span>{department.name}</span>
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="section page-width" aria-labelledby="resources-heading">
        <div className="section-heading-row">
          <div>
            <h2 id="resources-heading">Quick resources</h2>
            <p>Common staff destinations and approved resources.</p>
          </div>
          <Link className="text-link home-resources-link" to="/resources">
            Browse all resources <ArrowRight aria-hidden="true" size={18} />
          </Link>
        </div>
        <div className="quick-resource-grid">
          {quickResources.map((resource) => (
            <Link key={resource.id} to={`/resources?focus=${resource.id}`}>
              <span className="content-icon resource-icon">
                <ResourceIcon category={resource.category} />
              </span>
              <span>
                <strong>{resource.title}</strong>
                <small>{resource.category}{resource.destinationUrl ? "" : " · Sample resource"}</small>
              </span>
              <ArrowRight aria-hidden="true" size={20} />
            </Link>
          ))}
        </div>
        <Link className="text-link section-link mobile-only" to="/resources">
          Browse all resources <ArrowRight aria-hidden="true" size={18} />
        </Link>
      </section>
    </>
  );
}
