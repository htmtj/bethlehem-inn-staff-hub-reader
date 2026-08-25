import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getDepartmentName } from "../lib/content";
import type { ResourceItem } from "../types/content";
import { ResourceIcon } from "./ContentIcons";

export function ResourceList({ items }: { items: ResourceItem[] }) {
  if (!items.length) {
    return (
      <div className="empty-state">
        <h3>No resources match those filters</h3>
        <p>Try adjusting your search or filters.</p>
      </div>
    );
  }

  return (
    <ul className="resource-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link to={`/resources?focus=${item.id}`}>
            <span className="content-icon resource-icon">
              <ResourceIcon category={item.category} />
            </span>
            <span className="resource-list__copy">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </span>
            <span className="resource-list__meta">
              <span>{getDepartmentName(item.department)}</span>
              <small>{item.category} · Sample resource</small>
            </span>
            <ArrowRight aria-hidden="true" className="row-arrow" size={21} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
