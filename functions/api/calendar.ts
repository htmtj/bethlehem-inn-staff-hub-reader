import { calendarRange, type CalendarRange } from "../../src/lib/eventDates";

type CalendarEnv = {
  GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON?: string;
};

type CalendarContext = {
  env: CalendarEnv;
};

type GoogleCalendarEvent = {
  id?: unknown;
  summary?: unknown;
  description?: unknown;
  location?: unknown;
  htmlLink?: unknown;
  status?: unknown;
  start?: { dateTime?: unknown; date?: unknown };
  end?: { dateTime?: unknown; date?: unknown };
};

type EventItem = {
  allDay: boolean;
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  category: string;
  department: string;
  location: string;
  description: string;
  link: string | null;
  priority: "standard";
  status: "published";
  publishedAt: string;
  expiresAt: string | null;
};

export const STAFF_HUB_CALENDAR_ID =
  "c_9ebfb87e322a0337c45664a545ed09ab877983d3fd73dbceaf8af5f76b270122@group.calendar.google.com";
export const CASE_MANAGEMENT_CALENDAR_ID = "casemanagement@bethleheminn.org";
export const APPROVAL_PREFIX = "[STAFF HUB]";
type CalendarSource = "hub" | "caseManagement";
const calendarIds = { hub: STAFF_HUB_CALENDAR_ID, caseManagement: CASE_MANAGEMENT_CALENDAR_ID };
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.readonly";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALENDAR_ENDPOINT = "https://www.googleapis.com/calendar/v3/calendars";

const jsonHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: jsonHeaders });
}

function base64Url(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToDer(pem: string): ArrayBuffer {
  const encoded = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

async function serviceAccountAccessToken(secret: string): Promise<string> {
  const credentials = JSON.parse(secret) as {
    client_email?: unknown;
    private_key?: unknown;
    token_uri?: unknown;
  };
  if (typeof credentials.client_email !== "string" || typeof credentials.private_key !== "string") {
    throw new Error("Calendar service identity is incomplete");
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: CALENDAR_SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: issuedAt,
    exp: issuedAt + 3600,
  }));
  const unsignedToken = `${header}.${claim}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(credentials.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );

  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    signal: AbortSignal.timeout(8000),
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedToken}.${base64Url(new Uint8Array(signature))}`,
    }),
  });
  if (!tokenResponse.ok) throw new Error(`Calendar token request failed (${tokenResponse.status})`);
  const token = await tokenResponse.json() as { access_token?: unknown };
  if (typeof token.access_token !== "string" || !token.access_token) {
    throw new Error("Calendar token response was incomplete");
  }
  return token.access_token;
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function calendarDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return Number.isFinite(Date.parse(value)) && new Date(value).toISOString().startsWith(value) ? value : null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function normalizeCalendarEvents(
  items: GoogleCalendarEvent[],
  publishedAt = new Date().toISOString(),
  source: CalendarSource = "hub",
): EventItem[] {
  return items.flatMap((item) => {
    if (!item || typeof item !== "object" || item.status === "cancelled" || typeof item.id !== "string" || !item.id) return [];
    const restricted = source === "caseManagement";
    // Check the untouched title: leading whitespace, case variants and embedded markers are not approval.
    if (restricted && (typeof item.summary !== "string" || !item.summary.startsWith(APPROVAL_PREFIX))) return [];
    if (restricted && item.status !== "confirmed" && item.status !== "tentative") return [];
    if (restricted && (!item.start || !item.end ||
      (item.start.date !== undefined && item.start.dateTime !== undefined) ||
      (item.end.date !== undefined && item.end.dateTime !== undefined))) return [];
    if (restricted && item.start?.dateTime !== undefined) {
      const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
      if (typeof item.start.dateTime !== "string" || typeof item.end?.dateTime !== "string" ||
        !timestamp.test(item.start.dateTime) || !timestamp.test(item.end.dateTime) ||
        !calendarDate(item.start.dateTime.slice(0, 10)) || !calendarDate(item.end.dateTime.slice(0, 10))) return [];
    }
    const startAt = calendarDate(item.start?.dateTime ?? item.start?.date);
    if (!startAt) return [];
    const allDay = !item.start?.dateTime && typeof item.start?.date === "string";
    if (restricted && allDay && (!/^\d{4}-\d{2}-\d{2}$/.test(item.start!.date as string) ||
      typeof item.end?.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(item.end.date))) return [];
    const endAt = calendarDate(allDay ? item.end?.date : item.end?.dateTime);
    if (restricted && !endAt) return [];
    if (endAt && endAt <= startAt) return [];
    const title = cleanText(restricted ? (item.summary as string).slice(APPROVAL_PREFIX.length) : item.summary, 200);
    if (restricted && !title) return [];
    const description = restricted ? "" : cleanText(item.description, 1000);
    const location = restricted ? "" : cleanText(item.location, 200) || "Bethlehem Inn";
    return [{
      id: `calendar-${item.id}`,
      allDay,
      title: title || "Staff Hub event",
      startAt,
      endAt,
      category: "Calendar",
      department: "administration",
      location,
      description,
      link: null,
      priority: "standard",
      status: "published",
      publishedAt,
      expiresAt: endAt,
    }];
  });
}

export async function fetchCalendarPages(accessToken: string, range: CalendarRange, source: CalendarSource = "hub"): Promise<EventItem[]> {
  const signal = AbortSignal.timeout(15000);
  // Pad UTC month boundaries by one day; display filtering uses Pacific calendar dates.
  const params = new URLSearchParams({ singleEvents: "true", orderBy: "startTime", showDeleted: "false", timeZone: "America/Los_Angeles",
    timeMin: new Date(Date.parse(range.start) - 86400000).toISOString(),
    timeMax: new Date(Date.parse(range.end) + 86400000).toISOString(),
    maxResults: "250", fields: source === "caseManagement"
      ? "nextPageToken,items(id,summary,status,start,end)"
      : "nextPageToken,items(id,summary,description,location,status,start,end)" });
  const events = new Map<string, EventItem>();
  const seenPages = new Set<string>();
  for (let page = 0; page < 20; page += 1) {
    const response = await fetch(`${CALENDAR_ENDPOINT}/${encodeURIComponent(calendarIds[source])}/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` }, signal,
    });
    if (!response.ok) throw new Error("Calendar upstream failure");
    const payload = await response.json() as { items?: unknown; nextPageToken?: unknown };
    if (!payload || typeof payload !== "object" || (payload.items !== undefined && !Array.isArray(payload.items))) throw new Error("Invalid Calendar response");
    for (const event of normalizeCalendarEvents((payload.items ?? []) as GoogleCalendarEvent[], undefined, source)) events.set(event.id, event);
    if (!payload.nextPageToken) {
      // Stable opaque public IDs, not Google's source record IDs.
      return Promise.all([...events.values()].map(async (event) => {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${calendarIds[source]}\n${event.id}`));
        return { ...event, id: `calendar-${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}` };
      }));
    }
    if (typeof payload.nextPageToken !== "string" || seenPages.has(payload.nextPageToken)) throw new Error("Invalid Calendar pagination");
    seenPages.add(payload.nextPageToken);
    params.set("pageToken", payload.nextPageToken);
  }
  throw new Error("Calendar page limit exceeded");
}

export async function fetchMergedCalendarEvents(accessToken: string, range: CalendarRange) {
  const results = await Promise.allSettled([
    fetchCalendarPages(accessToken, range, "hub"),
    fetchCalendarPages(accessToken, range, "caseManagement"),
  ]);
  const successes = results.filter((result) => result.status === "fulfilled");
  if (!successes.length) throw new Error("Calendar feed unavailable");
  return {
    events: successes.flatMap((result) => result.value).sort((a, b) => a.startAt.localeCompare(b.startAt) || a.id.localeCompare(b.id)),
    availability: successes.length === results.length ? "complete" as const : "partial" as const,
  };
}

export async function onRequestGet(context: CalendarContext): Promise<Response> {
  const secret = context.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON?.trim();
  if (!secret) return json({ events: [], source: "unavailable" }, 503);
  try {
    const range = calendarRange();
    const accessToken = await serviceAccountAccessToken(secret);
    const feed = await fetchMergedCalendarEvents(accessToken, range);
    return json({ ...feed, source: "calendar", range, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Staff Hub Calendar feed unavailable");
    return json({ events: [], source: "unavailable" }, 503);
  }
}
