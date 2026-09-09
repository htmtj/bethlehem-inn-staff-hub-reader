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
    aud: typeof credentials.token_uri === "string" ? credentials.token_uri : TOKEN_ENDPOINT,
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

  const tokenResponse = await fetch(typeof credentials.token_uri === "string" ? credentials.token_uri : TOKEN_ENDPOINT, {
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function normalizeCalendarEvents(
  items: GoogleCalendarEvent[],
  publishedAt = new Date().toISOString(),
): EventItem[] {
  return items.flatMap((item) => {
    if (item.status === "cancelled" || typeof item.id !== "string") return [];
    const startAt = calendarDate(item.start?.dateTime ?? item.start?.date);
    if (!startAt) return [];
    const endAt = item.end?.dateTime ? calendarDate(item.end.dateTime) : null;
    const title = cleanText(item.summary, 200) || "Staff Hub event";
    const description = cleanText(item.description, 1000);
    const location = cleanText(item.location, 200) || "Bethlehem Inn";
    return [{
      id: `calendar-${item.id}`,
      title,
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

async function fetchCalendarEvents(secret: string): Promise<EventItem[]> {
  const accessToken = await serviceAccountAccessToken(secret);
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    timeMin: new Date().toISOString(),
    maxResults: "50",
    fields: "items(id,summary,description,location,status,start,end)",
  });
  const response = await fetch(
    `${CALENDAR_ENDPOINT}/${encodeURIComponent(STAFF_HUB_CALENDAR_ID)}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) throw new Error(`Calendar event request failed (${response.status})`);
  const payload = await response.json() as { items?: unknown };
  return normalizeCalendarEvents(Array.isArray(payload.items) ? payload.items as GoogleCalendarEvent[] : []);
}

export async function onRequestGet(context: CalendarContext): Promise<Response> {
  const secret = context.env.GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON?.trim();
  if (!secret) return json({ events: [], source: "unavailable" }, 503);
  try {
    const events = await fetchCalendarEvents(secret);
    return json({ events, source: "calendar" });
  } catch (error) {
    console.error("Staff Hub Calendar feed unavailable", error instanceof Error ? error.message : "Unknown error");
    return json({ events: [], source: "unavailable" }, 503);
  }
}
