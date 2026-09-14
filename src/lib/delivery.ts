import { lifecycleState } from "./lifecycle";
import type { ContentStatus } from "../types/content";

export type DeliveryItem = { id: string; status: ContentStatus; updatedAt?: string | null; publishedAt?: string | null; expiresAt?: string | null; startAt?: string | null; endAt?: string | null; sample?: boolean };
export type ReaderReceipt = { buildId: string; items: DeliveryItem[] };

export async function loadReaderReceipt(): Promise<ReaderReceipt> {
  const response = await fetch(`/reader-status.json?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("Reader delivery could not be checked. Try again shortly.");
  const data = await response.json() as ReaderReceipt;
  if (!data || typeof data.buildId !== "string" || !Number.isFinite(Date.parse(data.buildId)) || !Array.isArray(data.items) ||
      data.items.some(item => !item || typeof item.id !== "string" || typeof item.status !== "string")) throw new Error("Reader delivery could not be checked. Try again shortly.");
  return data;
}

export function deliveryState(receipt: ReaderReceipt, expected: DeliveryItem, now = Date.now()): string {
  const actual = receipt.items.find(item => item.id === expected.id);
  if (!actual || !expected.updatedAt || actual.updatedAt !== expected.updatedAt || actual.status !== expected.status ||
      actual.publishedAt !== expected.publishedAt || actual.expiresAt !== expected.expiresAt) return "Saved; deployment is still pending. Check again shortly.";
  const state = lifecycleState(actual, now);
  if (state === "scheduled") return "Deployed and scheduled. It will appear at its publish time.";
  if (state === "archived") return "Deployed; this item is no longer in active Reader views.";
  if (actual.sample) return "Deployed; this sample event is intentionally excluded from the Reader calendar.";
  if (actual.startAt && Date.parse(actual.endAt ?? actual.startAt) < now) return "Deployed; this event has already ended. Check its dates in Calendar.";
  return "Verified live: this saved revision is eligible in the Reader. Open the Reader to view it.";
}

/** One automatic navigation per target release; preserve the route, query and selected Calendar date. */
export function freshReaderUrl(href: string, loadedBuild: string, availableBuild: string): string | null {
  const url = new URL(href);
  if (!Number.isFinite(Date.parse(availableBuild)) || availableBuild === loadedBuild ||
      url.searchParams.get("_release") === availableBuild || url.pathname === "/admin" || url.pathname.startsWith("/admin/")) return null;
  url.searchParams.set("_release", availableBuild);
  return url.href;
}
