import { ArrowLeft, CalendarDays, CircleAlert, Contact, ListChecks, Tag } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { formatDate, getDepartmentName, news } from "../lib/content";
import { NotFoundPage } from "./NotFoundPage";

export function NewsDetailPage() {
  const { slug } = useParams();
  const item = news.find((entry) => entry.slug === slug);
  if (!item) return <NotFoundPage />;

  return (
    <article className="page-width article-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link to="/news"><ArrowLeft aria-hidden="true" size={17} /> All news</Link>
        <span>/</span>
        <Link to={`/departments/${item.department}`}>{getDepartmentName(item.department)}</Link>
      </nav>
      <header className="article-header">
        <span className={`priority-label priority-${item.priority}`}>{item.priority === "standard" ? item.category : `${item.priority} priority`}</span>
        <h1>{item.title}</h1>
        <p>{item.summary}</p>
        <div className="article-byline">
          <span>Published {formatDate(item.publishedAt)}</span>
          <span>{getDepartmentName(item.department)}</span>
          {item.status === "archived" ? <span>Archived sample</span> : null}
        </div>
      </header>
      <div className="article-layout">
        <div className="article-body">
          {item.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <div className="sample-disclaimer">
            <strong>Sample content only</strong>
            <p>This fictional entry demonstrates the reader experience and contains no confidential Bethlehem Inn information.</p>
          </div>
        </div>
        <aside aria-label="Update details" className="article-facts">
          <h2>Update details</h2>
          <dl>
            <div>
              <dt><ListChecks aria-hidden="true" /> What changed</dt>
              <dd>{item.summary}</dd>
            </div>
            <div>
              <dt><CalendarDays aria-hidden="true" /> Effective date</dt>
              <dd>{item.effectiveAt ? formatDate(item.effectiveAt) : "No separate effective date"}</dd>
            </div>
            <div className={item.actionNeeded ? "fact-action" : undefined}>
              <dt><CircleAlert aria-hidden="true" /> Action needed</dt>
              <dd>{item.actionText ?? "No action is required."}</dd>
            </div>
            <div>
              <dt><Contact aria-hidden="true" /> Contact / owner</dt>
              <dd>{item.contact}</dd>
            </div>
            <div>
              <dt><Tag aria-hidden="true" /> Category</dt>
              <dd>{item.category}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </article>
  );
}
