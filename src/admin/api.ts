import eventsJson from "../content/events.json";
import newsJson from "../content/news.json";
import resourcesJson from "../content/resources.json";
import type { EventItem, NewsItem, ResourceItem } from "../types/content";
import type { AdminBootstrap, MutationPayload, MutationResult } from "./types";

export class PublishingSessionError extends Error {
  constructor() {
    super("Your publishing session needs to be renewed. Sign in again, then return here and retry. Unsaved edits stay in this tab.");
    this.name = "PublishingSessionError";
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (response.type === "opaqueredirect" || response.redirected || response.status === 401 ||
      (response.status >= 300 && response.status < 400)) throw new PublishingSessionError();
  // A login/error HTML page must never be mistaken for a successful mutation receipt.
  if (!response.headers.get("Content-Type")?.includes("application/json")) {
    throw new Error("Publishing returned an unexpected response. Sign in again if your session expired, then retry.");
  }
  const data = await response.json().catch(() => { throw new Error("Publishing returned an invalid response. Check the content list before retrying a save."); });
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data && typeof data.message === "string"
        ? data.message
        : "Publishing is temporarily unavailable.";
    throw new Error(message);
  }
  return data as T;
}

async function publishingRequest(init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch("/admin/api/content", {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      // Access redirects belong to a top-level navigation, not a cross-origin fetch.
      // Never replay a write automatically after reauthentication or network failure.
      redirect: "manual",
      signal: AbortSignal.timeout(25000),
      headers: { Accept: "application/json", ...init.headers },
    });
  } catch {
    throw new Error(init.method === "POST"
      ? "The save could not be confirmed. Keep this tab open and check the content list in another tab before retrying; the request may have reached the server."
      : "Could not connect to publishing. Check your connection or sign in again, then retry.");
  }
}

export async function loadAdminBootstrap(): Promise<AdminBootstrap> {
  if (import.meta.env.DEV) {
    return {
      actor: {
        email: "admin.test@example.invalid",
        role: "admin",
        department: "administration",
      },
      content: {
        news: { sha: "local-news-preview", items: newsJson as NewsItem[] },
        events: { sha: "local-events-preview", items: eventsJson as EventItem[] },
        resources: { sha: "local-resources-preview", items: resourcesJson as ResourceItem[] },
      },
    };
  }

  const response = await publishingRequest();
  return readJson<AdminBootstrap>(response);
}

export async function mutateContent(payload: MutationPayload): Promise<MutationResult> {
  if (import.meta.env.DEV) {
    return {
      item: payload.item,
      sha: `${payload.contentType}-local-${Date.now()}`,
      commitUrl: null,
      message:
        payload.operation === "archive"
          ? "Archived in this local preview."
          : payload.item.status === "draft"
            ? "Draft saved in this local preview."
            : "Published in this local preview. No repository content was changed.",
    };
  }

  const response = await publishingRequest({
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return readJson<MutationResult>(response);
}
