import { useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { NewsList } from "../components/NewsList";
import { departments, getActiveNews, getArchivedNews, filterNews } from "../lib/content";

export function NewsPage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(params.get("department") ?? "all");
  const [showArchive, setShowArchive] = useState(false);
  const importantOnly = params.get("priority") === "important";
  const source = showArchive ? getArchivedNews() : getActiveNews();
  const filtered = filterNews(source, query, department, !showArchive && importantOnly);

  return (
    <div className="page-width page-stack">
      <header className="page-header">
        <h1>Updates</h1>
        <p>Important organizational news and recent department changes, kept findable after the first announcement.</p>
      </header>
      <section aria-labelledby="news-feed-heading">
        <div className="section-heading-row news-heading-row">
          <div>
            <h2 id="news-feed-heading">{showArchive ? "Archive / history" : importantOnly ? "Important news" : "Latest updates"}</h2>
            <p>{showArchive ? "Expired and archived updates." : "Newest relevant items first."}</p>
          </div>
          <button className="button button--secondary" onClick={() => setShowArchive((value) => !value)} type="button">
            {showArchive ? "Return to active news" : "View archive"}
          </button>
        </div>
        <div className="filter-bar">
          <label className="search-input">
            <Search aria-hidden="true" size={20} />
            <span className="sr-only">Search news</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search news and updates"
              type="search"
              value={query}
            />
          </label>
          <label>
            <span className="sr-only">Filter news by department</span>
            <select onChange={(event) => setDepartment(event.target.value)} value={department}>
              <option value="all">All departments</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="result-count" role="status">{filtered.length} item{filtered.length === 1 ? "" : "s"}</p>
        {filtered.length ? <NewsList items={filtered} /> : <div className="empty-state"><h3>{query.trim() || department !== "all" ? "No matching updates" : showArchive ? "No archived updates" : "You’re up to date"}</h3><p>{query.trim() || department !== "all" ? "Try another term or choose all departments." : showArchive ? "Expired and archived updates will appear here." : "New published updates will appear here."}</p></div>}
      </section>
    </div>
  );
}
