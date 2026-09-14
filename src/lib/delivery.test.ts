import { describe, expect, it } from "vitest";
import { applyMutation, filterItemsForActor, type Actor } from "../../functions/admin/api/_lib";
import { filterNews, getActiveNews, getArchivedNews, getImportantNews } from "./content";
import { lifecycleLabel, lifecycleState, publicationMessage } from "./lifecycle";
import { deliveryState, freshReaderUrl } from "./delivery";
import type { NewsItem } from "../types/content";

const now = new Date("2026-09-14T17:00:00Z");
const admin: Actor = { email: "admin@example.invalid", role: "admin", department: "administration" };
const publisher: Actor = { email: "publisher@example.invalid", role: "publisher", department: "kitchen" };
const input = { title: "Delivery fixture", summary: "Non-sensitive fixture", body: ["Fixture body"], status: "published", priority: "standard", department: "kitchen" };
describe("safe Reader refresh and truthful lifecycle labels", () => {
  const oldBuild = "2026-09-14T10:00:00Z";
  const newBuild = "2026-09-14T11:00:00Z";
  it("preserves route, Calendar date, filters and hash", () => {
    const url = new URL(freshReaderUrl("https://example.invalid/upcoming?date=2026-09-15#agenda", oldBuild, newBuild)!);
    expect(url.pathname).toBe("/upcoming");
    expect(url.searchParams.get("date")).toBe("2026-09-15");
    expect(url.hash).toBe("#agenda");
    expect(freshReaderUrl(url.href, oldBuild, newBuild)).toBeNull();
  });
  it("never auto-refreshes Admin or the same/invalid release", () => {
    for (const route of ["/admin", "/admin/api/content"]) expect(freshReaderUrl(`https://example.invalid${route}`, oldBuild, newBuild)).toBeNull();
    expect(freshReaderUrl("https://example.invalid/", oldBuild, oldBuild)).toBeNull();
    expect(freshReaderUrl("https://example.invalid/", oldBuild, "invalid")).toBeNull();
  });
  it.each([
    ["draft", null, null, "Draft"],
    ["published", "2026-09-14T09:00:00-07:00", null, "Published / active"],
    ["published", "2026-09-14T09:00:00-07:00", "2026-09-14T11:00:00-07:00", "Published / active"],
    ["scheduled", "2026-09-15T09:00:00-07:00", null, "Scheduled"],
    ["published", "2026-09-11T14:27:00-07:00", "2026-09-11T18:56:00-07:00", "Expired"],
    ["archived", "2026-09-11T14:27:00-07:00", null, "Archived"],
  ] as const)("labels %s with Pacific/UTC timestamps truthfully", (status, publishedAt, expiresAt, label) => {
    expect(lifecycleLabel({ status, publishedAt, expiresAt }, now.getTime())).toBe(label);
  });
});
function publish(actor = admin, overrides: Record<string, unknown> = {}) {
  return applyMutation({ actor, items: [], now, idFactory: () => "fixture-id", request: {
    contentType: "news", operation: "create", expectedSha: "fixture-sha", item: { ...input, ...overrides },
  } }).item as unknown as NewsItem;
}

describe("persisted publication to real Reader selectors", () => {
  it("delivers organization-wide Administrator content", () => {
    const item = publish(admin, { department: "administration" });
    expect(filterNews(getActiveNews(now, [item]), "delivery", "administration")).toEqual([item]);
  });
  it.each(["programs", "facilities", "kitchen", "development"])("preserves canonical %s publisher scope through Reader rendering", department => {
    const actor = { ...publisher, department } as Actor;
    const item = publish(actor, { department });
    expect(filterNews(getActiveNews(now, [item]), "", department)).toEqual([item]);
    expect(filterItemsForActor({ ...publisher, department: "administration" } as Actor, [item], "news")).toEqual([]);
  });
  it("rejects a publisher creating or editing another department's content", () => {
    expect(() => publish(publisher, { department: "facilities" })).toThrow("another department");
    const item = publish(admin, { department: "facilities" });
    expect(() => applyMutation({ actor: publisher, items: [item as unknown as Record<string, unknown>], now,
      request: { contentType: "news", operation: "update", expectedSha: "sha", item: { ...item, department: "kitchen" } } })).toThrow();
  });
  it.each([
    { pinned: true }, { priority: "high" }, { priority: "urgent" }, { actionNeeded: true, actionText: "Fixture action" },
  ])("never subtracts a flagged item from query/department/Important results: %o", flags => {
    const item = publish(admin, flags);
    const active = getActiveNews(now, [item]);
    expect(filterNews(active, "delivery", "kitchen", true)).toEqual([item]);
    expect(getImportantNews(now, [item])).toEqual([item]);
  });
  it("does not cap the Important collection at three", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ ...publish(admin, { pinned: true }), id: String(i) }));
    expect(getImportantNews(now, items)).toHaveLength(5);
  });
  it("keeps drafts and future schedules out of active feeds and archive, even with past expiration", () => {
    const item = publish();
    for (const status of ["draft", "scheduled"] as const) {
      const hidden = { ...item, status, publishedAt: "2026-10-01T17:00:00Z", expiresAt: "2026-09-01T17:00:00Z" };
      expect(getActiveNews(now, [hidden])).toEqual([]);
      expect(getArchivedNews(now, [hidden])).toEqual([]);
    }
  });
  it("uses one effective status for expired Admin labels and Reader exclusion", () => {
    const item = { ...publish(), expiresAt: now.toISOString() };
    expect(lifecycleState(item, now.getTime())).toBe("archived");
    expect(getActiveNews(now, [item])).toEqual([]);
    expect(getArchivedNews(now, [item])).toEqual([item]);
  });
  it("rejects already-expired publication and schedules expiring before publication", () => {
    expect(() => publish(admin, { expiresAt: now.toISOString() })).toThrow("Expiration must");
    expect(() => publish(admin, { status: "scheduled", publishedAt: "2026-10-02T00:00:00Z", expiresAt: "2026-10-01T00:00:00Z" })).toThrow("Expiration must");
    expect(() => publish(admin, { publishedAt: "2026-10-02T00:00:00Z" })).toThrow("Use Schedule");
  });
  it("does not mistake a future effective date for a future publication", () => {
    const item = publish(admin, { effectiveAt: "2026-10-02T00:00:00Z" });
    expect(getActiveNews(now, [item])).toEqual([item]);
  });
  it("distinguishes persisted, deployed, scheduled and stale revisions", () => {
    const item = publish();
    expect(publicationMessage("scheduled")).not.toContain("Published");
    expect(publicationMessage("published")).toContain("pending deployment");
    expect(deliveryState({ buildId: "new", items: [] }, item)).toContain("pending");
    expect(deliveryState({ buildId: "new", items: [{ ...item, updatedAt: "older" }] }, item)).toContain("pending");
    expect(deliveryState({ buildId: "new", items: [item] }, item, now.getTime())).toContain("Verified live");
  });
});
