import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { NewsList } from "../components/NewsList";
import { departments, getActiveNews, getArchivedNews, getImportantNews } from "../lib/content";

export function NewsPage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(params.get("department") ?? "all");
  const [showArchive, setShowArchive] = useState(false);
  const importantOnly = params.get("priority") === "important";
  const source = showArchive ? getArchivedNews() : importantOnly ? getImportantNews() : getActiveNews();
  const importantIds = new Set(getImportantNews().map((item) => item.id));

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return source.filter((item) => {
      const matchesDepartment = department === "all" || item.department === department;
      const matchesQuery =
        !normalized ||
        [item.title, item.summary, item.body.join(" "), item.category]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalized);
      return matchesDepartment && matchesQuery;
    });
  }, [department, query, source]);

  return (
    <div className="page-width page-stack">
      <header className="page-header">
        <h1>News & updates</h1>
        <p>Important organizational news and recent department changes, kept findable after the first announcement.</p>
      </header>
      {!showArchive ? (
        <section aria-labelledby="important-news-page" className="priority-strip">
          <h2 id="important-news-page">Important now</h2>
          <NewsList compact items={getImportantNews()} />
        </section>
      ) : null}
      <section aria-labelledby="news-feed-heading">
        <div className="section-heading-row news-heading-row">
          <div>
            <h2 id="news-feed-heading">{showArchive ? "Archive / history" : importantOnly ? "Important news" : "Latest updates"}</h2>
            <p>{showArchive ? "Expired and archived sample entries." : "Newest relevant items first."}</p>
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
        <p className="result-count">{filtered.length} item{filtered.length === 1 ? "" : "s"}</p>
        <NewsList items={showArchive ? filtered : filtered.filter((item) => !importantIds.has(item.id))} />
      </section>
    </div>
  );
}
