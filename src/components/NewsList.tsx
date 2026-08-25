import { ArrowRight, CircleAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate, getDepartmentName } from "../lib/content";
import type { NewsItem } from "../types/content";
import { DepartmentIcon } from "./ContentIcons";

type NewsListProps = {
  items: NewsItem[];
  compact?: boolean;
};

export function NewsList({ items, compact = false }: NewsListProps) {
  if (!items.length) {
    return (
      <div className="empty-state">
        <h3>No active updates</h3>
        <p>There are no published items for this view right now.</p>
      </div>
    );
  }

  return (
    <ul className={compact ? "news-list news-list--compact" : "news-list"}>
      {items.map((item) => (
        <li key={item.id}>
          <Link to={`/news/${item.slug}`}>
            <span className={`content-icon accent-${item.department}`}>
              <DepartmentIcon id={item.department} />
            </span>
            <span className="news-list__copy">
              <span className="news-list__meta">
                <span>{getDepartmentName(item.department)}</span>
                <span>{formatDate(item.publishedAt)}</span>
                {item.actionNeeded ? (
                  <span className="action-label">
                    <CircleAlert aria-hidden="true" size={15} /> Action needed
                  </span>
                ) : null}
              </span>
              <strong>{item.title}</strong>
              {!compact ? <span>{item.summary}</span> : null}
            </span>
            <ArrowRight aria-hidden="true" className="row-arrow" size={21} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
