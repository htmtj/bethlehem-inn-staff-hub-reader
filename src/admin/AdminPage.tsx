import {
  Archive,
  CalendarPlus,
  ChevronRight,
  Eye,
  FilePlus2,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getDepartmentName } from "../lib/content";
import type { ContentStatus, EventItem, NewsItem, ResourceItem } from "../types/content";
import { loadAdminBootstrap, mutateContent } from "./api";
import { AdminEditor } from "./AdminEditor";
import type {
  AdminActor,
  AdminContent,
  AdminContentType,
  ManagedContent,
  MutationOperation,
} from "./types";

type StatusFilter = "draft" | "scheduled" | "published" | "archived";

const statusTabs: Array<{ label: string; value: StatusFilter }> = [
  { label: "Drafts", value: "draft" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

function displayStatus(status: ContentStatus): StatusFilter {
  return status === "expired" ? "archived" : status;
}

function typeLabel(type: AdminContentType): string {
  if (type === "news") return "Update";
  if (type === "events") return "Upcoming Item";
  return "Resource";
}

function itemDate(managed: ManagedContent): string | null {
  if (managed.contentType === "news") return managed.item.publishedAt;
  if (managed.contentType === "events") return managed.item.publishedAt ?? managed.item.startAt;
  return managed.item.publishedAt ?? null;
}

function itemUpdatedAt(managed: ManagedContent): string | null {
  const item = managed.item;
  if (item.updatedAt) return item.updatedAt;
  return itemDate(managed);
}

function itemEffectiveAt(managed: ManagedContent): string | null {
  return managed.contentType === "news" ? managed.item.effectiveAt : null;
}

function itemExpiresAt(managed: ManagedContent): string | null {
  return "expiresAt" in managed.item ? managed.item.expiresAt ?? null : null;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function allContent(content: AdminContent): ManagedContent[] {
  return [
    ...content.news.items.map((item) => ({ contentType: "news" as const, item })),
    ...content.events.items.map((item) => ({ contentType: "events" as const, item })),
    ...content.resources.items.map((item) => ({ contentType: "resources" as const, item })),
  ].sort((a, b) => {
    const aDate = itemUpdatedAt(a) ? Date.parse(itemUpdatedAt(a) as string) : 0;
    const bDate = itemUpdatedAt(b) ? Date.parse(itemUpdatedAt(b) as string) : 0;
    return bDate - aDate;
  });
}

function collectionSha(content: AdminContent, type: AdminContentType): string {
  return content[type].sha;
}

function contentRecord(managed: ManagedContent): Record<string, unknown> {
  return managed.item as unknown as Record<string, unknown>;
}

function updateLocalContent(
  content: AdminContent,
  contentType: AdminContentType,
  item: Record<string, unknown>,
  operation: MutationOperation,
  sha: string | null,
): AdminContent {
  const id = typeof item.id === "string" && item.id ? item.id : `${contentType}-local-${Date.now()}`;
  const normalized = { ...item, id };
  const collection = content[contentType];
  const index = collection.items.findIndex((entry) => entry.id === id);
  const nextItems = [...collection.items] as Array<NewsItem | EventItem | ResourceItem>;
  if (index >= 0) nextItems[index] = normalized as NewsItem | EventItem | ResourceItem;
  else nextItems.unshift(normalized as NewsItem | EventItem | ResourceItem);
  return {
    ...content,
    [contentType]: {
      sha: sha ?? collection.sha,
      items: nextItems,
    },
  } as AdminContent;
}

function PreviewDialog({ managed, onClose }: { managed: ManagedContent; onClose: () => void }) {
  return (
    <div className="admin-preview-backdrop" role="presentation">
      <section aria-labelledby="row-preview-heading" aria-modal="true" className="admin-preview" role="dialog">
        <div className="admin-preview__heading">
          <div>
            <span>Staff view preview</span>
            <h2 id="row-preview-heading">{managed.item.title}</h2>
          </div>
          <button aria-label="Close preview" className="icon-button" onClick={onClose} type="button"><X aria-hidden="true" /></button>
        </div>
        <div className="admin-preview__meta">
          <span>{getDepartmentName(managed.item.department)}</span>
          {managed.contentType !== "resources" ? <span>{managed.item.priority === "standard" ? "Normal" : managed.item.priority === "high" ? "Important" : "Urgent"}</span> : null}
          {managed.contentType === "news" && managed.item.actionNeeded ? <strong>Action needed</strong> : null}
        </div>
        {managed.contentType === "news" ? (
          <>
            <p className="admin-preview__summary">{managed.item.summary}</p>
            {managed.item.effectiveAt ? <p><b>Effective:</b> {formatDateTime(managed.item.effectiveAt)}</p> : null}
            {managed.item.actionNeeded && managed.item.actionText ? <div className="admin-preview__action"><b>Staff action:</b> {managed.item.actionText}</div> : null}
            <div className="admin-preview__body">{managed.item.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          </>
        ) : managed.contentType === "events" ? (
          <>
            <p className="admin-preview__summary">{managed.item.description}</p>
            <p><b>When:</b> {formatDateTime(managed.item.startAt)}</p>
            {managed.item.location ? <p><b>Where:</b> {managed.item.location}</p> : null}
          </>
        ) : (
          <>
            <p className="admin-preview__summary">{managed.item.description}</p>
            <p><b>Category:</b> {managed.item.category}</p>
            <p><b>Resource type:</b> {managed.item.resourceType}</p>
          </>
        )}
        <div className="admin-preview__footer">
          <button className="button button--secondary" onClick={onClose} type="button">Close Preview</button>
        </div>
      </section>
    </div>
  );
}

export function AdminPage() {
  const [actor, setActor] = useState<AdminActor | null>(null);
  const [content, setContent] = useState<AdminContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("draft");
  const [typeFilter, setTypeFilter] = useState<AdminContentType | "all">("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [editorType, setEditorType] = useState<AdminContentType | null>(null);
  const [editing, setEditing] = useState<ManagedContent | null>(null);
  const [previewing, setPreviewing] = useState<ManagedContent | null>(null);
  const [archiving, setArchiving] = useState<ManagedContent | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const bootstrap = await loadAdminBootstrap();
      setActor(bootstrap.actor);
      setContent(bootstrap.content);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Publishing is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Staff Hub Publishing · Bethlehem Inn";
    void load();
    return () => {
      document.title = previousTitle;
    };
  }, [load]);

  useEffect(() => {
    if (!previewing && !archiving) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewing(null);
        setArchiving(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [archiving, previewing]);

  const managed = useMemo(() => (content ? allContent(content) : []), [content]);
  const counts = useMemo(
    () => Object.fromEntries(statusTabs.map((tab) => [tab.value, managed.filter((entry) => displayStatus(entry.item.status) === tab.value).length])) as Record<StatusFilter, number>,
    [managed],
  );
  const visible = useMemo(
    () => managed.filter((entry) =>
      displayStatus(entry.item.status) === status &&
      (typeFilter === "all" || entry.contentType === typeFilter) &&
      (departmentFilter === "all" || entry.item.department === departmentFilter)),
    [departmentFilter, managed, status, typeFilter],
  );

  const beginNew = (contentType: AdminContentType) => {
    setEditing(null);
    setEditorType(contentType);
    setEditorError(null);
    setMessage(null);
    window.setTimeout(() => document.getElementById("editor-heading")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const beginEdit = (item: ManagedContent) => {
    setEditing(item);
    setEditorType(item.contentType);
    setEditorError(null);
    setMessage(null);
    window.setTimeout(() => document.getElementById("editor-heading")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const save = async (contentType: AdminContentType, item: Record<string, unknown>) => {
    if (!content) return;
    setSaving(true);
    setEditorError(null);
    setMessage(null);
    const operation: MutationOperation = editing ? "update" : "create";
    try {
      const result = await mutateContent({
        contentType,
        operation,
        expectedSha: collectionSha(content, contentType),
        item,
      });
      if (import.meta.env.DEV) {
        setContent((current) => current ? updateLocalContent(current, contentType, result.item, operation, result.sha) : current);
      } else {
        const refreshed = await loadAdminBootstrap();
        setActor(refreshed.actor);
        setContent(refreshed.content);
      }
      setMessage(result.message);
      setEditorType(null);
      setEditing(null);
      setStatus(item.status === "draft" ? "draft" : item.status === "scheduled" ? "scheduled" : "published");
    } catch (error) {
      setEditorError(error instanceof Error ? error.message : "This content could not be saved. Your changes have not been lost.");
    } finally {
      setSaving(false);
    }
  };

  const confirmArchive = async () => {
    if (!content || !archiving) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await mutateContent({
        contentType: archiving.contentType,
        operation: "archive",
        expectedSha: collectionSha(content, archiving.contentType),
        item: { id: archiving.item.id },
      });
      if (import.meta.env.DEV) {
        const archivedItem = { ...contentRecord(archiving), status: "archived", pinned: false, updatedAt: new Date().toISOString() };
        setContent((current) => current ? updateLocalContent(current, archiving.contentType, archivedItem, "archive", result.sha) : current);
      } else {
        const refreshed = await loadAdminBootstrap();
        setActor(refreshed.actor);
        setContent(refreshed.content);
      }
      setArchiving(null);
      setMessage(result.message);
      setStatus("archived");
    } catch (error) {
      setArchiving(null);
      setMessage(error instanceof Error ? error.message : "This item could not be archived.");
    } finally {
      setSaving(false);
    }
  };

  const signOutHref = `/cdn-cgi/access/logout?returnTo=${encodeURIComponent(`${window.location.origin}/`)}`;

  if (loading) {
    return (
      <main className="admin-shell admin-state" id="main-content">
        <RefreshCw aria-hidden="true" className="admin-spinner" />
        <h1>Loading Staff Hub Publishing</h1>
        <p>Checking your publishing role and loading the latest content.</p>
      </main>
    );
  }

  if (loadError || !actor || !content) {
    return (
      <main className="admin-shell admin-state" id="main-content">
        <ShieldCheck aria-hidden="true" />
        <h1>Publishing is not available</h1>
        <p>{loadError ?? "Your publishing role could not be loaded."}</p>
        <div className="admin-state__actions">
          <button className="button button--primary" onClick={() => void load()} type="button"><RefreshCw aria-hidden="true" size={18} /> Try Again</button>
          <a className="button button--secondary" href="/">Open Staff Hub</a>
        </div>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-security-bar"><ShieldCheck aria-hidden="true" size={16} /> Secure publishing beta · Sample content only</div>
      <header className="admin-header">
        <div className="admin-header__inner">
          <a aria-label="Bethlehem Inn Staff Hub Publishing" className="admin-brand" href="/admin">
            <img alt="" height="54" src="/brand/bi-logo.png" width="54" />
            <span><strong>Bethlehem Inn</strong><b>Staff Hub Publishing</b></span>
          </a>
          <div className="admin-account">
            <div>
              <strong>{actor.email}</strong>
              <span>{actor.role === "admin" ? "Administrator" : "Department Publisher"}</span>
              <small>{getDepartmentName(actor.department)}</small>
            </div>
            <a className="admin-header-link" href="/">Open Staff Hub</a>
            <a className="admin-header-link" href={signOutHref}><LogOut aria-hidden="true" size={17} /> Sign Out</a>
          </div>
        </div>
      </header>

      <main className="admin-main" id="main-content">
        <div className="admin-intro">
          <div>
            <h1>Manage Staff Hub content</h1>
            <p>Create, review, and publish updates, upcoming items, and resources for staff.</p>
          </div>
          <div className="admin-primary-actions" aria-label="Create content">
            <button className="button button--primary" onClick={() => beginNew("news")} type="button"><Plus aria-hidden="true" size={19} /> New Update</button>
            <button className="button button--secondary" onClick={() => beginNew("events")} type="button"><CalendarPlus aria-hidden="true" size={19} /> Add Upcoming Item</button>
            <button className="button button--secondary" onClick={() => beginNew("resources")} type="button"><FilePlus2 aria-hidden="true" size={19} /> Add Resource</button>
          </div>
        </div>

        {message ? <div aria-live="polite" className="admin-message admin-message--success">{message}</div> : null}

        <section aria-labelledby="content-heading" className="admin-content-panel">
          <h2 className="sr-only" id="content-heading">Staff Hub content</h2>
          <div className="admin-content-toolbar">
            <div aria-label="Content status" className="admin-status-tabs" role="tablist">
              {statusTabs.map((tab) => (
                <button
                  aria-selected={status === tab.value}
                  className={status === tab.value ? "is-active" : ""}
                  key={tab.value}
                  onClick={() => setStatus(tab.value)}
                  role="tab"
                  type="button"
                >
                  {tab.label} <span>{counts[tab.value]}</span>
                </button>
              ))}
            </div>
            <div className="admin-filters">
              <label>
                <span className="sr-only">Content type</span>
                <select onChange={(event) => setTypeFilter(event.target.value as AdminContentType | "all")} value={typeFilter}>
                  <option value="all">All content types</option>
                  <option value="news">Updates</option>
                  <option value="events">Upcoming</option>
                  <option value="resources">Resources</option>
                </select>
              </label>
              {actor.role === "admin" ? (
                <label>
                  <span className="sr-only">Department</span>
                  <select onChange={(event) => setDepartmentFilter(event.target.value)} value={departmentFilter}>
                    <option value="all">All departments</option>
                    {["programs", "facilities", "kitchen", "development", "administration"].map((department) => (
                      <option key={department} value={department}>{getDepartmentName(department)}</option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          </div>

          {visible.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Publish date</th>
                    <th>Effective / expires</th>
                    <th>Last updated</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((entry) => (
                    <tr key={`${entry.contentType}-${entry.item.id}`}>
                      <td data-label="Title"><strong>{entry.item.title}</strong></td>
                      <td data-label="Type">{typeLabel(entry.contentType)}</td>
                      <td data-label="Department">{getDepartmentName(entry.item.department)}</td>
                      <td data-label="Status"><span className={`admin-status admin-status--${displayStatus(entry.item.status)}`}>{displayStatus(entry.item.status)}</span></td>
                      <td className="admin-table__desktop-time" data-label="Publish date">{formatDateTime(itemDate(entry))}</td>
                      <td className="admin-lifecycle" data-label="Effective / expires">
                        {itemEffectiveAt(entry) ? <span><b>Effective</b> {formatDateTime(itemEffectiveAt(entry))}</span> : null}
                        {itemExpiresAt(entry) ? <span><b>Expires</b> {formatDateTime(itemExpiresAt(entry))}</span> : null}
                        {!itemEffectiveAt(entry) && !itemExpiresAt(entry) ? "—" : null}
                      </td>
                      <td className="admin-table__desktop-time" data-label="Last updated">{formatDateTime(itemUpdatedAt(entry))}</td>
                      <td className="admin-row-actions">
                        <button onClick={() => beginEdit(entry)} type="button"><Pencil aria-hidden="true" size={15} /> Edit</button>
                        <button onClick={() => setPreviewing(entry)} type="button"><Eye aria-hidden="true" size={15} /> Preview</button>
                        <button onClick={() => setArchiving(entry)} type="button"><Archive aria-hidden="true" size={15} /> Archive</button>
                        <ChevronRight aria-hidden="true" className="admin-row-chevron" size={18} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty-state">
              <FilePlus2 aria-hidden="true" />
              <h3>No {status} items match these filters</h3>
              <p>Choose another status or create a new item.</p>
            </div>
          )}
        </section>

        {editorType ? (
          <AdminEditor
            actor={actor}
            contentType={editorType}
            editing={editing}
            error={editorError}
            onCancel={() => { setEditorType(null); setEditing(null); setEditorError(null); }}
            onSave={save}
            saving={saving}
          />
        ) : null}
      </main>

      {previewing ? <PreviewDialog managed={previewing} onClose={() => setPreviewing(null)} /> : null}

      {archiving ? (
        <div className="admin-preview-backdrop" role="presentation">
          <section aria-labelledby="archive-heading" aria-modal="true" className="admin-confirm" role="dialog">
            <Archive aria-hidden="true" />
            <h2 id="archive-heading">Archive “{archiving.item.title}”?</h2>
            <p>This removes the item from active Staff Hub views but keeps it in history.</p>
            <div>
              <button className="button button--secondary" onClick={() => setArchiving(null)} type="button">Cancel</button>
              <button className="button button--primary" disabled={saving} onClick={() => void confirmArchive()} type="button">{saving ? "Archiving…" : "Archive Item"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
