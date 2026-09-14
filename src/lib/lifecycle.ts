import type { ContentStatus } from "../types/content";

type LifecycleItem = { status: ContentStatus; publishedAt?: string | null; expiresAt?: string | null };

/** One publication clock for Reader eligibility and publishing-workspace labels. */
export function lifecycleState(item: LifecycleItem, now = Date.now()): "draft" | "scheduled" | "published" | "archived" {
  if (!["draft", "published", "scheduled", "expired", "archived"].includes(item.status)) return "draft";
  if (item.status === "draft") return "draft";
  if (item.status === "archived" || item.status === "expired") return "archived";
  const published = item.publishedAt ? Date.parse(item.publishedAt) : null;
  if ((published !== null && (!Number.isFinite(published) || published > now)) ||
      (item.status === "scheduled" && published === null)) return "scheduled";
  if (item.expiresAt && (!Number.isFinite(Date.parse(item.expiresAt)) || Date.parse(item.expiresAt) <= now)) return "archived";
  return "published";
}

export function lifecycleLabel(item: LifecycleItem, now = Date.now()): string {
  const state = lifecycleState(item, now);
  if (state === "archived" && item.status !== "archived") return "Expired";
  return state === "published" ? "Published / active" : state[0].toUpperCase() + state.slice(1);
}

export function publicationMessage(status: ContentStatus): string {
  if (status === "draft") return "Draft saved. It is not visible in the Reader.";
  if (status === "scheduled") return "Schedule saved. It will become visible at its publish time after deployment.";
  if (status === "archived" || status === "expired") return "Archive saved. Removal from active Reader views is pending deployment.";
  return "Published record saved. Reader delivery is pending deployment; use Check Reader to verify it.";
}
