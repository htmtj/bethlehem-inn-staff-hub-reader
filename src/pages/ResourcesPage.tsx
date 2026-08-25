import { useMemo, useState } from "react";
import { ExternalLink, Info, Search, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { ResourceList } from "../components/ResourceList";
import { departments, getActiveResources, getDepartmentName } from "../lib/content";

const categories = [
  "All",
  "Employee Tools",
  "Onboarding",
  "Forms",
  "Policies & Procedures",
  "Training",
  "Department Resources",
];

export function ResourcesPage() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const initialDepartment = params.get("department") ?? "all";
  const [department, setDepartment] = useState(initialDepartment);
  const resources = getActiveResources();
  const focusId = params.get("focus");
  const focused = resources.find((item) => item.id === focusId);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return resources.filter((item) => {
      const matchesQuery =
        !normalized ||
        [item.title, item.description, item.category, item.resourceType, getDepartmentName(item.department)]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalized);
      return (
        matchesQuery &&
        (category === "All" || item.category === category) &&
        (department === "all" || item.department === department)
      );
    });
  }, [category, department, query, resources]);

  const closePreview = () => {
    const next = new URLSearchParams(params);
    next.delete("focus");
    setParams(next, { replace: true });
  };

  return (
    <div className="page-width page-stack resource-page">
      <header className="page-header">
        <h1>Resources</h1>
        <p>Find commonly used staff tools, forms, policies, and department links.</p>
      </header>
      <section aria-labelledby="resource-directory-heading">
        <h2 className="sr-only" id="resource-directory-heading">Resource directory</h2>
        <label className="search-input search-input--large">
          <Search aria-hidden="true" size={23} />
          <span className="sr-only">Search resources</span>
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search resources"
            type="search"
            value={query}
          />
        </label>
        <div aria-label="Resource category" className="category-filters" role="group">
          {categories.map((item) => (
            <button
              aria-pressed={category === item}
              className={category === item ? "is-active" : undefined}
              key={item}
              onClick={() => setCategory(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <div className="resource-filter-row">
          <label>
            <span className="sr-only">Filter resources by department</span>
            <select onChange={(event) => setDepartment(event.target.value)} value={department}>
              <option value="all">All departments</option>
              {departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <p className="result-count">{filtered.length} result{filtered.length === 1 ? "" : "s"}</p>
        </div>
        <ResourceList items={filtered} />
      </section>

      {focused ? (
        <aside aria-labelledby="resource-preview-heading" className="resource-preview">
          <button aria-label="Close resource details" className="icon-button" onClick={closePreview} type="button"><X aria-hidden="true" /></button>
          {!focused.destinationUrl ? <span className="sample-resource-label">Sample resource</span> : null}
          <h2 id="resource-preview-heading">{focused.title}</h2>
          <p>{focused.description}</p>
          <dl>
            <div><dt>Category</dt><dd>{focused.category}</dd></div>
            <div><dt>Department</dt><dd>{getDepartmentName(focused.department)}</dd></div>
            <div><dt>Resource type</dt><dd>{focused.resourceType}</dd></div>
          </dl>
          {focused.destinationUrl ? (
            <a
              className="button button--primary"
              href={focused.destinationUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open resource <ExternalLink aria-hidden="true" size={18} />
            </a>
          ) : (
            <>
              <div className="sample-disclaimer">
                <Info aria-hidden="true" />
                <div>
                  <strong>Destination intentionally withheld</strong>
                  <p>An authoritative link will be added only after it is approved. This beta does not expose or guess internal resource URLs.</p>
                </div>
              </div>
              <button className="button button--disabled" disabled type="button">
                Open resource <ExternalLink aria-hidden="true" size={18} />
              </button>
            </>
          )}
        </aside>
      ) : null}
    </div>
  );
}
