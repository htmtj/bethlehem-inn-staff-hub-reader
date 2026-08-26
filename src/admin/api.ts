import eventsJson from "../content/events.json";
import newsJson from "../content/news.json";
import resourcesJson from "../content/resources.json";
import type { EventItem, NewsItem, ResourceItem } from "../types/content";
import type { AdminBootstrap, MutationPayload, MutationResult } from "./types";

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({ message: "Publishing is temporarily unavailable." }));
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "message" in data && typeof data.message === "string"
        ? data.message
        : "Publishing is temporarily unavailable.";
    throw new Error(message);
  }
  return data as T;
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

  const response = await fetch("/admin/api/content", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
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

  const response = await fetch("/admin/api/content", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  return readJson<MutationResult>(response);
}
