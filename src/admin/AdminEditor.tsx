import { CalendarDays, Eye, FileText, Save, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getDepartmentName } from "../lib/content";
import type { ContentStatus } from "../types/content";
import type { AdminActor, AdminContentType, ManagedContent } from "./types";
import { publishingIntent } from "./publishingIntent";
import { useDialogFocus } from "../hooks/useDialogFocus";

type EditorValue = {
  id: string;
  contentType: AdminContentType;
  title: string;
  department: string;
  status: "draft" | "scheduled" | "published";
  publishedAt: string;
  expiresAt: string;
  priority: "standard" | "high" | "urgent";
  category: string;
  lane: "" | "executive-director-message";
  summary: string;
  details: string;
  effectiveAt: string;
  actionNeeded: boolean;
  actionText: string;
  contact: string;
  relatedLinkLabel: string;
  relatedLinkUrl: string;
  pinned: boolean;
  startAt: string;
  endAt: string;
  location: string;
  description: string;
  link: string;
  resourceType: string;
  destinationUrl: string;
  featured: boolean;
};

type Props = {
  actor: AdminActor;
  contentType: AdminContentType;
  editing: ManagedContent | null;
  error: string | null;
  onCancel: () => void;
  onSave: (contentType: AdminContentType, item: Record<string, unknown>) => Promise<void>;
  saving: boolean;
};

const departments = ["programs", "facilities", "kitchen", "development", "administration"];
const resourceCategories = [
  "Employee Tools",
  "Onboarding",
  "Training",
  "Forms",
  "Policies & Procedures",
  "Department Resources",
];

function toInputDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function fromInputDate(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function emptyValue(contentType: AdminContentType, actor: AdminActor): EditorValue {
  return {
    id: "",
    contentType,
    title: "",
    department: actor.department,
    status: "draft",
    publishedAt: "",
    expiresAt: "",
    priority: "standard",
    category: actor.role === "ed_publisher" ? "Executive Director Message" : contentType === "news" ? "Department update" : contentType === "events" ? "Meeting" : "Department Resources",
    lane: actor.role === "ed_publisher" ? "executive-director-message" : "",
    summary: "",
    details: "",
    effectiveAt: "",
    actionNeeded: false,
    actionText: "",
    contact: "",
    relatedLinkLabel: "",
    relatedLinkUrl: "",
    pinned: false,
    startAt: "",
    endAt: "",
    location: "",
    description: "",
    link: "",
    resourceType: "Resource",
    destinationUrl: "",
    featured: false,
  };
}

function valueFromContent(editing: ManagedContent | null, contentType: AdminContentType, actor: AdminActor): EditorValue {
  if (!editing) return emptyValue(contentType, actor);
  const value = emptyValue(editing.contentType, actor);
  value.id = editing.item.id;
  value.title = editing.item.title;
  value.department = editing.item.department;
  value.status = editing.item.status === "scheduled" || editing.item.status === "published" ? editing.item.status : "draft";
  value.publishedAt = toInputDate("publishedAt" in editing.item ? editing.item.publishedAt : undefined);
  value.expiresAt = toInputDate("expiresAt" in editing.item ? editing.item.expiresAt : undefined);

  if (editing.contentType === "news") {
    const item = editing.item;
    value.lane = item.lane ?? "";
    value.priority = item.priority;
    value.category = item.category;
    value.summary = item.summary;
    value.details = item.body.join("\n\n");
    value.effectiveAt = toInputDate(item.effectiveAt);
    value.actionNeeded = item.actionNeeded;
    value.actionText = item.actionText ?? "";
    value.contact = item.contact;
    value.relatedLinkLabel = item.resourceLinks[0]?.label ?? "";
    value.relatedLinkUrl = item.resourceLinks[0]?.url ?? "";
    value.pinned = item.pinned;
  } else if (editing.contentType === "events") {
    const item = editing.item;
    value.priority = item.priority;
    value.category = item.category;
    value.startAt = toInputDate(item.startAt);
    value.endAt = toInputDate(item.endAt);
    value.location = item.location;
    value.description = item.description;
    value.link = item.link ?? "";
  } else {
    const item = editing.item;
    value.category = item.category;
    value.description = item.description;
    value.destinationUrl = item.destinationUrl ?? "";
    value.resourceType = item.resourceType;
    value.featured = item.featured;
  }
  return value;
}

function typeLabel(contentType: AdminContentType): string {
  if (contentType === "news") return "Update";
  if (contentType === "events") return "Upcoming Item";
  return "Resource";
}

export function AdminEditor({ actor, contentType, editing, error, onCancel, onSave, saving }: Props) {
  const [value, setValue] = useState(() => valueFromContent(editing, contentType, actor));
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewRef = useDialogFocus(previewOpen);

  useEffect(() => {
    setValue(valueFromContent(editing, contentType, actor));
    setPreviewOpen(false);
  }, [actor, contentType, editing]);

  useEffect(() => {
    if (!previewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen]);

  const isAdmin = actor.role === "admin";
  const isEdPublisher = actor.role === "ed_publisher";
  const intent = publishingIntent(value.status);
  const submitLabel = intent.label;
  const previewBody = useMemo(() => value.details.split(/\n\s*\n/).filter(Boolean), [value.details]);

  const change = <K extends keyof EditorValue>(key: K, next: EditorValue[K]) => {
    setValue((current) => ({ ...current, [key]: next }));
  };

  const mutationItem = (status: ContentStatus): Record<string, unknown> => {
    const common = {
      id: value.id || undefined,
      title: value.title,
      department: value.department,
      status,
      publishedAt:
        status === "published"
          ? new Date().toISOString()
          : status === "scheduled"
            ? fromInputDate(value.publishedAt)
            : null,
      expiresAt: fromInputDate(value.expiresAt),
      priority: value.priority,
    };
    if (value.contentType === "news") {
      return {
        ...common,
        category: value.category,
        lane: value.lane || null,
        summary: value.summary,
        body: previewBody,
        effectiveAt: fromInputDate(value.effectiveAt),
        actionNeeded: value.actionNeeded,
        actionText: value.actionText || null,
        contact: value.contact,
        pinned: isAdmin && value.pinned,
        resourceLinks: value.relatedLinkUrl
          ? [{ label: value.relatedLinkLabel || "Open resource", url: value.relatedLinkUrl }]
          : [],
      };
    }
    if (value.contentType === "events") {
      return {
        ...common,
        category: value.category,
        startAt: fromInputDate(value.startAt),
        endAt: fromInputDate(value.endAt),
        location: value.location,
        description: value.description,
        link: value.link || null,
      };
    }
    return {
      ...common,
      category: value.category,
      description: value.description,
      destinationUrl: value.destinationUrl || null,
      resourceType: value.resourceType,
      featured: value.featured,
    };
  };

  const save = async (status: ContentStatus) => {
    await onSave(value.contentType, mutationItem(status));
  };

  return (
    <section aria-labelledby="editor-heading" className="admin-editor">
      <div className="admin-editor__heading">
        <div>
          <h2 id="editor-heading">{editing ? "Edit" : "New"} {isEdPublisher ? "Executive Director Message" : typeLabel(value.contentType)}</h2>
          <p>{editing ? "Update the content, preview it, then save your changes." : "Create a clear, staff-ready item without editing the website."}</p>
        </div>
        <button aria-label="Close editor" className="icon-button" onClick={onCancel} type="button">
          <X aria-hidden="true" />
        </button>
      </div>

      {error ? <p className="admin-message admin-message--error" role="alert">{error}</p> : null}
      <p className="admin-message">{value.status === "draft" ? "Save Draft keeps this item out of Reader views." : value.status === "scheduled" ? "This item becomes visible after the selected publish time and a successful site deployment." : "Publishing updates the public, no-login Reader after the site deploys."} Include only information approved for public display. Dates use your device’s local timezone.</p>
      {isEdPublisher ? <p className="admin-message">Published messages appear in News, Latest Updates, search, and Administration. Important priority may also place a message in Important News. The Reader is public: include only information approved for public display.</p> : null}

      <form className="admin-form" onSubmit={(event) => event.preventDefault()}>
        <div className="admin-form__main">
          <label className="admin-field admin-field--wide">
            <span>Title <b aria-hidden="true">*</b></span>
            <input
              maxLength={180}
              onChange={(event) => change("title", event.target.value)}
              placeholder="Enter a clear, specific title"
              required
              value={value.title}
            />
          </label>

          {value.contentType === "news" ? (
            <>
              <label className="admin-field admin-field--wide">
                <span>Summary / What Changed</span>
                <textarea
                  maxLength={360}
                  onChange={(event) => change("summary", event.target.value)}
                  placeholder="One or two sentences staff can scan quickly."
                  rows={3}
                  value={value.summary}
                />
                <small>{value.summary.length}/360</small>
              </label>
              <label className="admin-field admin-field--wide">
                <span>Details</span>
                <textarea
                  maxLength={8000}
                  onChange={(event) => change("details", event.target.value)}
                  placeholder="Provide context, timing, and the steps staff need to know. Separate paragraphs with a blank line."
                  rows={7}
                  value={value.details}
                />
              </label>
            </>
          ) : (
            <label className="admin-field admin-field--wide">
              <span>{value.contentType === "events" ? "Description" : "Description"}</span>
              <textarea
                maxLength={800}
                onChange={(event) => change("description", event.target.value)}
                placeholder={value.contentType === "events" ? "What staff should know about this upcoming item." : "Explain what this resource is for."}
                rows={4}
                value={value.description}
              />
            </label>
          )}

          {value.contentType === "events" ? (
            <>
              <label className="admin-field">
                <span>Start date and time</span>
                <input onChange={(event) => change("startAt", event.target.value)} type="datetime-local" value={value.startAt} />
              </label>
              <label className="admin-field">
                <span>End date and time</span>
                <input onChange={(event) => change("endAt", event.target.value)} type="datetime-local" value={value.endAt} />
              </label>
              <label className="admin-field">
                <span>Location</span>
                <input maxLength={180} onChange={(event) => change("location", event.target.value)} value={value.location} />
              </label>
              <label className="admin-field">
                <span>Useful link</span>
                <input inputMode="url" onChange={(event) => change("link", event.target.value)} placeholder="https://" type="url" value={value.link} />
              </label>
            </>
          ) : null}

          {value.contentType === "resources" ? (
            <>
              <label className="admin-field admin-field--wide">
                <span>Destination URL</span>
                <input inputMode="url" onChange={(event) => change("destinationUrl", event.target.value)} placeholder="https://" type="url" value={value.destinationUrl} />
              </label>
              <label className="admin-field">
                <span>Resource Type</span>
                <input maxLength={80} onChange={(event) => change("resourceType", event.target.value)} value={value.resourceType} />
              </label>
              <label className="admin-check admin-check--field">
                <input checked={value.featured} onChange={(event) => change("featured", event.target.checked)} type="checkbox" />
                <span><strong>Featured / Quick Resource</strong><small>Surface this in the reader’s quick resources area.</small></span>
              </label>
            </>
          ) : null}
        </div>

        <aside className="admin-form__settings" aria-label="Publishing settings">
          <fieldset className="admin-fieldset">
            <legend>Publish Timing</legend>
            <label><input checked={value.status === "published"} name="publish-status" onChange={() => change("status", "published")} type="radio" /> Publish now</label>
            <label><input checked={value.status === "scheduled"} name="publish-status" onChange={() => change("status", "scheduled")} type="radio" /> Schedule</label>
            <label><input checked={value.status === "draft"} name="publish-status" onChange={() => change("status", "draft")} type="radio" /> Save as draft</label>
          </fieldset>

          {value.status === "scheduled" ? (
            <label className="admin-field">
              <span>Publish date and time <b aria-hidden="true">*</b></span>
              <input onChange={(event) => change("publishedAt", event.target.value)} required type="datetime-local" value={value.publishedAt} />
            </label>
          ) : null}

          <label className="admin-field">
            <span>Department / Scope</span>
            {isAdmin ? (
              <select disabled={value.lane === "executive-director-message"} onChange={(event) => change("department", event.target.value)} value={value.department}>
                {departments.map((department) => <option key={department} value={department}>{getDepartmentName(department)}</option>)}
              </select>
            ) : (
              <input aria-describedby="fixed-department" readOnly value={isEdPublisher ? "Executive Director Message" : getDepartmentName(actor.department)} />
            )}
            {!isAdmin ? <small id="fixed-department">Your publishing scope is set by your role.</small> : null}
          </label>

          {isAdmin && value.contentType === "news" ? (
            <label className="admin-field">
              <span>Message lane</span>
              <select value={value.lane} onChange={(event) => {
                const lane = event.target.value as EditorValue["lane"];
                setValue((current) => ({ ...current, lane, category: lane ? "Executive Director Message" : "Department update", department: lane ? "administration" : current.department }));
              }}>
                <option value="">Department update</option>
                <option value="executive-director-message">Executive Director Message</option>
              </select>
              <small>ED messages can also be managed by the Executive Director Publisher.</small>
            </label>
          ) : null}

          <label className="admin-field">
            <span>Category</span>
            {value.contentType === "resources" ? (
              <select onChange={(event) => change("category", event.target.value)} value={value.category}>
                {resourceCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
            ) : (
              <input readOnly={value.lane === "executive-director-message"} maxLength={100} onChange={(event) => change("category", event.target.value)} value={value.category} />
            )}
          </label>

          {value.contentType !== "resources" ? (
            <label className="admin-field">
              <span>Priority</span>
              <select onChange={(event) => change("priority", event.target.value as EditorValue["priority"])} value={value.priority}>
                <option value="standard">Normal</option>
                <option value="high">Important</option>
                {isAdmin ? <option value="urgent">Urgent</option> : null}
              </select>
            </label>
          ) : null}

          {value.contentType === "news" ? (
            <>
              <label className="admin-check">
                <input checked={value.actionNeeded} onChange={(event) => change("actionNeeded", event.target.checked)} type="checkbox" />
                <span><strong>Staff Action Required</strong><small>Use only when staff must do something.</small></span>
              </label>
              {value.actionNeeded ? (
                <label className="admin-field">
                  <span>Action Text</span>
                  <textarea maxLength={280} onChange={(event) => change("actionText", event.target.value)} rows={3} value={value.actionText} />
                </label>
              ) : null}
              {isAdmin ? (
                <label className="admin-check">
                  <input checked={value.pinned} onChange={(event) => change("pinned", event.target.checked)} type="checkbox" />
                  <span><strong>Pin as Important</strong><small>Keep this near the top until it expires.</small></span>
                </label>
              ) : null}
              <label className="admin-field">
                <span>Effective Date</span>
                <input onChange={(event) => change("effectiveAt", event.target.value)} type="datetime-local" value={value.effectiveAt} />
              </label>
              <label className="admin-field">
                <span>Contact / Owner</span>
                <input maxLength={160} onChange={(event) => change("contact", event.target.value)} value={value.contact} />
              </label>
              <label className="admin-field">
                <span>Related Link Label</span>
                <input maxLength={100} onChange={(event) => change("relatedLinkLabel", event.target.value)} value={value.relatedLinkLabel} />
              </label>
              <label className="admin-field">
                <span>Related Link URL</span>
                <input inputMode="url" onChange={(event) => change("relatedLinkUrl", event.target.value)} placeholder="https://" type="url" value={value.relatedLinkUrl} />
              </label>
            </>
          ) : null}

          <label className="admin-field">
            <span>Expiration Date</span>
            <input onChange={(event) => change("expiresAt", event.target.value)} type="datetime-local" value={value.expiresAt} />
          </label>
        </aside>

        <div className="admin-form__actions">
          <button className="button button--secondary" onClick={() => setPreviewOpen(true)} type="button">
            <Eye aria-hidden="true" size={18} /> Preview as Staff Will See It
          </button>
          {value.status !== "draft" ? <button className="button button--secondary" disabled={saving || !value.title.trim()} onClick={() => void save("draft")} type="button">
            <Save aria-hidden="true" size={18} /> Save Draft
          </button> : null}
          <button
            className="button button--primary"
            disabled={saving || !value.title.trim() || (value.status === "scheduled" && !value.publishedAt)}
            onClick={() => void save(intent.status)}
            type="button"
          >
            {value.status === "scheduled" ? <CalendarDays aria-hidden="true" size={18} /> : <Send aria-hidden="true" size={18} />}
            {saving ? "Saving…" : submitLabel}
          </button>
        </div>
      </form>

      {previewOpen ? (
        <div className="admin-preview-backdrop" role="presentation">
          <section ref={previewRef} aria-labelledby="preview-heading" aria-modal="true" className="admin-preview" role="dialog">
            <div className="admin-preview__heading">
              <div>
                <span>Staff view preview</span>
                <h2 id="preview-heading">{value.title || "Untitled draft"}</h2>
              </div>
              <button aria-label="Close preview" className="icon-button" onClick={() => setPreviewOpen(false)} type="button"><X aria-hidden="true" /></button>
            </div>
            <div className="admin-preview__meta">
              <span>{getDepartmentName(value.department)}</span>
              <span>{value.priority === "standard" ? "Normal" : value.priority === "high" ? "Important" : "Urgent"}</span>
              {value.actionNeeded ? <strong>Action needed</strong> : null}
            </div>
            {value.contentType === "news" ? (
              <>
                <p className="admin-preview__summary">{value.summary || "Add a short summary staff can scan quickly."}</p>
                {value.effectiveAt ? <p><b>Effective:</b> {new Date(value.effectiveAt).toLocaleString()}</p> : null}
                {value.actionNeeded && value.actionText ? <div className="admin-preview__action"><b>Staff action:</b> {value.actionText}</div> : null}
                <div className="admin-preview__body">{previewBody.length ? previewBody.map((paragraph) => <p key={paragraph}>{paragraph}</p>) : <p>Add details before publishing.</p>}</div>
              </>
            ) : value.contentType === "events" ? (
              <>
                <p className="admin-preview__summary">{value.description || "Add a description before publishing."}</p>
                {value.startAt ? <p><b>When:</b> {new Date(value.startAt).toLocaleString()}</p> : null}
                {value.location ? <p><b>Where:</b> {value.location}</p> : null}
              </>
            ) : (
              <>
                <p className="admin-preview__summary">{value.description || "Add a description before publishing."}</p>
                <p><b>Category:</b> {value.category}</p>
                <p><b>Resource type:</b> {value.resourceType}</p>
              </>
            )}
            <div className="admin-preview__footer">
              <button className="button button--secondary" onClick={() => setPreviewOpen(false)} type="button">Back to Edit</button>
              {value.status !== "draft" ? <button className="button button--secondary" disabled={saving || !value.title.trim()} onClick={() => void save("draft")} type="button">
                <Save aria-hidden="true" size={18} /> Save Draft
              </button> : null}
              <button
                className="button button--primary"
                disabled={saving || !value.title.trim() || (value.status === "scheduled" && !value.publishedAt)}
                onClick={() => void save(intent.status)}
                type="button"
              >
                {value.status === "scheduled" ? <CalendarDays aria-hidden="true" size={18} /> : <Send aria-hidden="true" size={18} />}
                {saving ? "Saving…" : submitLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
