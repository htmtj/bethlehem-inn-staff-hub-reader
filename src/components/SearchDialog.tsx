import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { Link } from "react-router-dom";
import { searchHub } from "../lib/content";
import { useDialogFocus } from "../hooks/useDialogFocus";
import { useCalendarEvents } from "../hooks/useCalendarEvents";

type SearchDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function SearchDialog({ open, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useDialogFocus(open);
  const { events, state } = useCalendarEvents(open);
  const results = useMemo(() => searchHub(query, new Date(), events), [query, events]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => inputRef.current?.focus(), 20);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={dialogRef}
        aria-label="Search the Staff Hub"
        aria-modal="true"
        className="search-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="search-dialog__header">
          <div>
            <h2>Search the Staff Hub</h2>
            <p>Find active news, upcoming items, departments, and staff resources.</p>
          </div>
          <button aria-label="Close search" className="icon-button" onClick={onClose} type="button">
            <X aria-hidden="true" />
          </button>
        </div>
        <label className="search-input search-input--dialog">
          <Search aria-hidden="true" size={23} />
          <span className="sr-only">Search the Staff Hub</span>
          <input
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try “Programs”, “meeting”, or “incident”"
            ref={inputRef}
            type="search"
            value={query}
          />
        </label>
        <div aria-live="polite" className="search-results">
          {state === "unavailable" ? <p className="feed-notice">Calendar search is temporarily unavailable. News, departments, and resources are still searchable.</p> : null}
          {state === "partial" ? <p className="feed-notice" role="status">Some calendar events may be missing from these results. Try again later.</p> : null}
          {!query.trim() ? (
            <p className="search-prompt">Start typing to search current Staff Hub content.</p>
          ) : results.length ? (
            <>
              <p className="result-count">
                {results.length} result{results.length === 1 ? "" : "s"}
              </p>
              <ul>
                {results.map((result) => (
                  <li key={`${result.type}-${result.id}`}>
                    <Link onClick={onClose} to={result.href}>
                      <span className="result-type">{result.type}</span>
                      <span className="result-copy">
                        <strong>{result.title}</strong>
                        <span>{result.description}</span>
                        <small>{result.meta}</small>
                      </span>
                      <ArrowRight aria-hidden="true" size={20} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="empty-state">
              <Search aria-hidden="true" />
              <h3>No results found</h3>
              <p>Try a department, resource category, event, or shorter phrase.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
