export const departments = [
  "programs",
  "facilities",
  "kitchen",
  "development",
  "administration",
] as const;

export const contentTypes = ["news", "events", "resources"] as const;
export const contentStatuses = ["draft", "scheduled", "published", "archived"] as const;

export type DepartmentId = (typeof departments)[number];
export type ContentType = (typeof contentTypes)[number];
export type ContentStatus = (typeof contentStatuses)[number];

export type RoleRecord = {
  role: "publisher" | "admin" | "ed_publisher";
  department: DepartmentId;
};

export type Actor = RoleRecord & {
  email: string;
};

export type MutationRequest = {
  contentType: ContentType;
  operation: "create" | "update" | "archive";
  expectedSha: string;
  item: Record<string, unknown>;
};

export class RequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "RequestError";
    this.status = status;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isDepartment = (value: unknown): value is DepartmentId =>
  typeof value === "string" && departments.includes(value as DepartmentId);

const isContentType = (value: unknown): value is ContentType =>
  typeof value === "string" && contentTypes.includes(value as ContentType);

const isStatus = (value: unknown): value is ContentStatus =>
  typeof value === "string" && contentStatuses.includes(value as ContentStatus);

function cleanString(value: unknown, field: string, maxLength: number, required = false): string {
  if (typeof value !== "string") {
    if (!required && (value === null || value === undefined)) return "";
    throw new RequestError(400, `${field} is required.`);
  }
  const cleaned = value.trim();
  if (required && !cleaned) throw new RequestError(400, `${field} is required.`);
  if (cleaned.length > maxLength) {
    throw new RequestError(400, `${field} is too long.`);
  }
  return cleaned;
}

function nullableString(value: unknown, field: string, maxLength: number): string | null {
  const cleaned = cleanString(value, field, maxLength);
  return cleaned || null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function validIso(value: unknown, field: string, required = false): string | null {
  const cleaned = cleanString(value, field, 64, required);
  if (!cleaned) return null;
  const timestamp = Date.parse(cleaned);
  if (!Number.isFinite(timestamp)) throw new RequestError(400, `${field} is not a valid date.`);
  return new Date(timestamp).toISOString();
}

function validUrl(value: unknown, field: string, required = false): string | null {
  const cleaned = cleanString(value, field, 2048, required);
  if (!cleaned) return null;
  let parsed: URL;
  try {
    parsed = new URL(cleaned);
  } catch {
    throw new RequestError(400, `${field} must be a complete web address.`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new RequestError(400, `${field} must use http or https.`);
  }
  return parsed.toString();
}

function parseBody(value: unknown): string[] {
  const paragraphs = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\n\s*\n/)
      : [];
  const cleaned = paragraphs
    .map((paragraph) => cleanString(paragraph, "Details", 4000))
    .filter(Boolean);
  if (cleaned.length > 20) throw new RequestError(400, "Details has too many paragraphs.");
  return cleaned;
}

function parseLinks(value: unknown): Array<{ label: string; url: string }> {
  if (!Array.isArray(value)) return [];
  if (value.length > 5) throw new RequestError(400, "Use no more than five related links.");
  return value
    .filter(isRecord)
    .map((link) => {
      const url = validUrl(link.url, "Related link");
      if (!url) return null;
      return {
        label: cleanString(link.label, "Related link label", 100) || "Open resource",
        url,
      };
    })
    .filter((link): link is { label: string; url: string } => Boolean(link));
}

function normalizeStatus(value: unknown, publishedAt: string | null, now: Date): ContentStatus {
  const status: ContentStatus = isStatus(value) ? value : "draft";
  if (status === "scheduled") {
    if (!publishedAt || Date.parse(publishedAt) <= now.getTime()) {
      throw new RequestError(400, "Scheduled content needs a future publish date and time.");
    }
  }
  return status;
}

function normalizePriority(value: unknown, actor: Actor): "standard" | "high" | "urgent" {
  const priority = value === "high" || value === "urgent" ? value : "standard";
  if (priority === "urgent" && actor.role !== "admin") {
    throw new RequestError(403, "Only an administrator can mark content urgent.");
  }
  return priority;
}

function targetDepartment(value: unknown, actor: Actor): DepartmentId {
  if (actor.role !== "admin") {
    if (value !== undefined && value !== null && value !== "" && value !== actor.department) {
      throw new RequestError(403, "You cannot publish content for another department.");
    }
    return actor.department;
  }
  if (!isDepartment(value)) throw new RequestError(400, "Choose a valid department or scope.");
  return value;
}

function statusAndPublishTime(
  input: Record<string, unknown>,
  now: Date,
): { publishedAt: string | null; status: ContentStatus } {
  const requested = isStatus(input.status) ? input.status : "draft";
  const supplied = validIso(input.publishedAt, "Publish date");
  const publishedAt = requested === "published" ? supplied ?? now.toISOString() : supplied;
  return { status: normalizeStatus(requested, publishedAt, now), publishedAt };
}

export function parseRoleRecord(raw: unknown, email: string): Actor {
  if (!isRecord(raw) || !["publisher", "admin", "ed_publisher"].includes(String(raw.role))) {
    throw new RequestError(403, "This account does not have Staff Hub publishing access.");
  }
  if (!isDepartment(raw.department)) {
    throw new RequestError(403, "This publishing assignment is not valid.");
  }
  if (raw.role === "publisher" && raw.department === "administration") {
    throw new RequestError(403, "Organization-wide publishing requires an administrator role.");
  }
  if (raw.role === "ed_publisher" && raw.department !== "administration") {
    throw new RequestError(403, "Executive Director publishing requires the ED Message scope.");
  }
  return { email: email.trim().toLowerCase(), role: raw.role as RoleRecord["role"], department: raw.department };
}

export function parseMutationRequest(value: unknown): MutationRequest {
  if (!isRecord(value)) throw new RequestError(400, "The request is not valid.");
  if (!isContentType(value.contentType)) throw new RequestError(400, "Choose a valid content type.");
  if (value.operation !== "create" && value.operation !== "update" && value.operation !== "archive") {
    throw new RequestError(400, "Choose a valid content action.");
  }
  if (!isRecord(value.item)) throw new RequestError(400, "Content fields are required.");
  return {
    contentType: value.contentType,
    operation: value.operation,
    expectedSha: cleanString(value.expectedSha, "Content version", 100, true),
    item: value.item,
  };
}

export function canManageDepartment(actor: Actor, department: unknown): boolean {
  return actor.role === "admin" || (actor.role === "publisher" && department === actor.department);
}

export const ED_MESSAGE_LANE = "executive-director-message";
export const ED_MESSAGE_CATEGORY = "Executive Director Message";

export function assertContentTypeAllowed(actor: Actor, contentType: ContentType): void {
  if (actor.role === "ed_publisher" && contentType !== "news") {
    throw new RequestError(403, "Your role can manage Executive Director messages only.");
  }
}

function canManageItem(actor: Actor, item: { department?: unknown; lane?: unknown }, contentType: ContentType): boolean {
  if (actor.role === "ed_publisher") {
    return contentType === "news" && item.department === "administration" && item.lane === ED_MESSAGE_LANE;
  }
  // A forged ED marker never broadens a department publisher's authority.
  if (actor.role === "publisher" && item.lane === ED_MESSAGE_LANE) return false;
  return canManageDepartment(actor, item.department);
}

export function filterItemsForActor<T extends { department?: unknown; lane?: unknown }>(actor: Actor, items: T[], contentType: ContentType): T[] {
  return items.filter((item) => canManageItem(actor, item, contentType));
}

function assertOwnsExisting(actor: Actor, item: Record<string, unknown>, contentType: ContentType): void {
  if (!canManageItem(actor, item, contentType)) {
    throw new RequestError(403, "You cannot manage content outside your publishing scope.");
  }
}

function newsLane(input: Record<string, unknown>, actor: Actor, existing: Record<string, unknown> | undefined): string | undefined {
  const supplied = input.lane === undefined ? existing?.lane : input.lane;
  if (supplied !== undefined && supplied !== null && supplied !== "" && supplied !== ED_MESSAGE_LANE) {
    throw new RequestError(400, "Choose a valid message lane.");
  }
  if (actor.role === "ed_publisher") {
    if (supplied !== undefined && supplied !== ED_MESSAGE_LANE) {
      throw new RequestError(403, "Executive Director messages cannot be moved to another lane.");
    }
    return ED_MESSAGE_LANE;
  }
  if (supplied === ED_MESSAGE_LANE) {
    if (actor.role !== "admin" || input.department !== "administration") {
      throw new RequestError(403, "Executive Director messages require their authorized publishing scope.");
    }
    return ED_MESSAGE_LANE;
  }
  return undefined;
}

function sanitizeNews(
  input: Record<string, unknown>,
  actor: Actor,
  existing: Record<string, unknown> | undefined,
  now: Date,
  idFactory: () => string,
): Record<string, unknown> {
  const lane = newsLane(input, actor, existing);
  const category = lane === ED_MESSAGE_LANE
    ? ED_MESSAGE_CATEGORY
    : cleanString(input.category, "Category", 80) || "Department update";
  if (!lane && category.toLowerCase() === ED_MESSAGE_CATEGORY.toLowerCase()) {
    throw new RequestError(400, "Use the Executive Director Message lane for this category.");
  }
  const timing = statusAndPublishTime(input, now);
  const title = cleanString(input.title, "Title", 180, true);
  const body = parseBody(input.body ?? input.details);
  if (timing.status !== "draft" && body.length === 0) {
    throw new RequestError(400, "Details is required before publishing.");
  }
  const actionNeeded = booleanValue(input.actionNeeded);
  const actionText = nullableString(input.actionText, "Action text", 280);
  if (timing.status !== "draft" && actionNeeded && !actionText) {
    throw new RequestError(400, "Add the action staff should take.");
  }
  const suffix = idFactory();
  const slugBase = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "update";
  return {
    id: existing?.id ?? `news-${suffix}`,
    slug: existing?.slug ?? `${slugBase}-${suffix.slice(0, 8)}`,
    title,
    summary: cleanString(input.summary, "Summary", 360, timing.status !== "draft"),
    body,
    department: targetDepartment(input.department, actor),
    ...(lane ? { lane } : {}),
    category,
    publishedAt: timing.publishedAt ?? now.toISOString(),
    effectiveAt: validIso(input.effectiveAt, "Effective date"),
    expiresAt: validIso(input.expiresAt, "Expiration date"),
    status: timing.status,
    priority: normalizePriority(input.priority, actor),
    pinned:
      actor.role === "admin"
        ? booleanValue(input.pinned)
        : existing
          ? booleanValue(existing.pinned)
          : false,
    actionNeeded,
    actionText,
    contact: cleanString(input.contact, "Contact / Owner", 160),
    resourceLinks: parseLinks(input.resourceLinks),
    image: existing?.image ?? null,
    imageAlt: existing?.imageAlt ?? null,
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function sanitizeEvent(
  input: Record<string, unknown>,
  actor: Actor,
  existing: Record<string, unknown> | undefined,
  now: Date,
  idFactory: () => string,
): Record<string, unknown> {
  const timing = statusAndPublishTime(input, now);
  const startAt = validIso(input.startAt, "Start date and time", timing.status !== "draft");
  const endAt = validIso(input.endAt, "End date and time");
  if (startAt && endAt && Date.parse(endAt) < Date.parse(startAt)) {
    throw new RequestError(400, "End time must be after the start time.");
  }
  return {
    id: existing?.id ?? `event-${idFactory()}`,
    title: cleanString(input.title, "Title", 180, true),
    startAt: startAt ?? now.toISOString(),
    endAt,
    category: cleanString(input.category, "Category", 80) || "Meeting",
    department: targetDepartment(input.department, actor),
    location: cleanString(input.location, "Location", 180),
    description: cleanString(input.description, "Description", 800, timing.status !== "draft"),
    link: validUrl(input.link, "Useful link"),
    priority: normalizePriority(input.priority, actor),
    status: timing.status,
    publishedAt: timing.publishedAt,
    expiresAt: validIso(input.expiresAt, "Expiration date"),
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function sanitizeResource(
  input: Record<string, unknown>,
  actor: Actor,
  existing: Record<string, unknown> | undefined,
  now: Date,
  idFactory: () => string,
): Record<string, unknown> {
  const timing = statusAndPublishTime(input, now);
  const destinationUrl = validUrl(
    input.destinationUrl,
    "Destination URL",
    timing.status === "published" || timing.status === "scheduled",
  );
  return {
    id: existing?.id ?? `resource-${idFactory()}`,
    title: cleanString(input.title, "Resource Name", 180, true),
    description: cleanString(input.description, "Description", 600, timing.status !== "draft"),
    category: cleanString(input.category, "Category", 100, timing.status !== "draft"),
    department: targetDepartment(input.department, actor),
    destinationUrl,
    featured: booleanValue(input.featured),
    resourceType: cleanString(input.resourceType, "Resource Type", 80) || "Resource",
    status: timing.status,
    publishedAt: timing.publishedAt,
    expiresAt: validIso(input.expiresAt, "Expiration date"),
    createdAt: existing?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export function applyMutation(options: {
  actor: Actor;
  items: Array<Record<string, unknown>>;
  request: MutationRequest;
  now?: Date;
  idFactory?: () => string;
}): { item: Record<string, unknown>; items: Array<Record<string, unknown>> } {
  const { actor, request } = options;
  assertContentTypeAllowed(actor, request.contentType);
  const now = options.now ?? new Date();
  const idFactory = options.idFactory ?? (() => crypto.randomUUID());
  const items = [...options.items];
  const requestedId = cleanString(request.item.id, "Content ID", 120);
  if (request.operation === "create" && requestedId) {
    throw new RequestError(400, "New content cannot include an existing content ID.");
  }
  const index = requestedId ? items.findIndex((item) => item.id === requestedId) : -1;
  const existing = index >= 0 ? items[index] : undefined;

  if (request.operation !== "create") {
    if (!existing) throw new RequestError(404, "This content item no longer exists.");
    assertOwnsExisting(actor, existing, request.contentType);
  }

  if (request.operation === "archive") {
    const archived = {
      ...existing,
      status: "archived",
      ...(request.contentType === "news" ? { pinned: false } : {}),
      updatedAt: now.toISOString(),
    };
    items[index] = archived;
    return { item: archived, items };
  }

  const sanitized = request.contentType === "news"
    ? sanitizeNews(request.item, actor, existing, now, idFactory)
    : request.contentType === "events"
      ? sanitizeEvent(request.item, actor, existing, now, idFactory)
      : sanitizeResource(request.item, actor, existing, now, idFactory);

  if (!canManageItem(actor, sanitized, request.contentType)) {
    throw new RequestError(403, "You cannot publish content for another department.");
  }

  if (index >= 0) items[index] = sanitized;
  else items.unshift(sanitized);
  return { item: sanitized, items };
}
