import { describe, expect, it } from "vitest";
import {
  getActiveNews,
  getActiveResources,
  getArchivedNews,
  getImportantNews,
  isNewsActiveAt,
  searchHub,
} from "./content";
import type { NewsItem } from "../types/content";

const betaDate = new Date("2026-08-25T12:00:00-07:00");
const NOW = new Date("2026-09-01T12:00:00.000Z").getTime();
const ONE_MS_BEFORE = NOW - 1;
const EXACTLY_NOW = NOW;
const ONE_MS_AFTER = NOW + 1;

const makeNewsItem = (overrides: Partial<NewsItem> = {}): NewsItem => ({
  id: "test-news",
  slug: "test-news",
  title: "Test news",
  summary: "Test summary",
  body: ["Test body"],
  department: "programs",
  category: "Test",
  publishedAt: new Date(NOW).toISOString(),
  effectiveAt: null,
  expiresAt: null,
  status: "published",
  priority: "standard",
  pinned: false,
  actionNeeded: false,
  actionText: null,
  contact: "Test contact",
  resourceLinks: [],
  image: null,
  imageAlt: null,
  ...overrides,
});

describe("news publication boundaries", () => {
  it("never exposes drafts across the publication boundary", () => {
    const draft = makeNewsItem({ status: "draft" });
    const pastDraft = makeNewsItem({
      status: "draft",
      publishedAt: new Date(NOW - 1_000).toISOString(),
    });

    expect(isNewsActiveAt(pastDraft, EXACTLY_NOW)).toBe(false);
    expect(isNewsActiveAt(draft, ONE_MS_BEFORE)).toBe(false);
    expect(isNewsActiveAt(draft, EXACTLY_NOW)).toBe(false);
    expect(isNewsActiveAt(draft, ONE_MS_AFTER)).toBe(false);
  });

  it("exposes scheduled news exactly at its publish time", () => {
    const scheduled = makeNewsItem({ status: "scheduled" });

    expect(isNewsActiveAt(scheduled, ONE_MS_BEFORE)).toBe(false);
    expect(isNewsActiveAt(scheduled, EXACTLY_NOW)).toBe(true);
    expect(isNewsActiveAt(scheduled, ONE_MS_AFTER)).toBe(true);
  });

  it("exposes published news exactly at its publish time", () => {
    const published = makeNewsItem({ status: "published" });

    expect(isNewsActiveAt(published, ONE_MS_BEFORE)).toBe(false);
    expect(isNewsActiveAt(published, EXACTLY_NOW)).toBe(true);
    expect(isNewsActiveAt(published, ONE_MS_AFTER)).toBe(true);
  });

  it("does not use the effective date as the publication clock", () => {
    const visibleBeforeEffectiveDate = makeNewsItem({
      effectiveAt: new Date(NOW + 86_400_000).toISOString(),
    });

    expect(isNewsActiveAt(visibleBeforeEffectiveDate, EXACTLY_NOW)).toBe(true);
  });

  it("keeps expired and archived news inactive", () => {
    const expiredStatus = makeNewsItem({
      status: "expired",
      expiresAt: new Date(NOW + 1_000).toISOString(),
    });
    const expiredPublished = makeNewsItem({
      status: "published",
      expiresAt: new Date(NOW).toISOString(),
    });
    const expiredScheduled = makeNewsItem({
      status: "scheduled",
      expiresAt: new Date(NOW).toISOString(),
    });
    const archived = makeNewsItem({ status: "archived" });

    expect(isNewsActiveAt(expiredStatus, EXACTLY_NOW)).toBe(false);
    expect(isNewsActiveAt(expiredPublished, ONE_MS_AFTER)).toBe(false);
    expect(isNewsActiveAt(expiredScheduled, ONE_MS_AFTER)).toBe(false);
    expect(isNewsActiveAt(archived, EXACTLY_NOW)).toBe(false);
  });
});

describe("content lifecycle", () => {
  it("keeps future scheduled and archived content out of active feeds", () => {
    const active = getActiveNews(betaDate);
    expect(active.some((item) => item.status === "scheduled")).toBe(false);
    expect(active.some((item) => item.status === "archived")).toBe(false);
  });

  it("shows real scheduled content at its publish time despite a future effective date", () => {
    const active = getActiveNews(new Date("2026-08-27T09:00:00-07:00"));
    const scheduled = active.find((item) => item.slug === "policy-review-window-opens");

    expect(scheduled?.status).toBe("scheduled");
    expect(new Date(scheduled!.effectiveAt!).getTime()).toBeGreaterThan(
      new Date(scheduled!.publishedAt).getTime(),
    );
  });

  it("keeps a pinned urgent item at the top of Important News", () => {
    const important = getImportantNews(betaDate);
    expect(important[0].slug).toBe("annual-emergency-drill-updated-arrival-plan");
  });

  it("keeps expired content available through archive history", () => {
    const archive = getArchivedNews(betaDate);
    expect(archive.some((item) => item.slug === "archived-sample-campaign")).toBe(true);
  });

  it("removes archived resources from the active directory", () => {
    expect(getActiveResources().some((item) => item.status === "archived")).toBe(false);
  });
});

describe("search", () => {
  it("searches news content, departments, upcoming items, and resources", () => {
    expect(searchHub("handoff", betaDate).some((result) => result.type === "News")).toBe(true);
    expect(searchHub("Programs", betaDate).some((result) => result.type === "Department")).toBe(true);
    expect(searchHub("meeting", betaDate).some((result) => result.type === "Upcoming")).toBe(true);
    expect(searchHub("incident", betaDate).some((result) => result.type === "Resource")).toBe(true);
  });

  it("distinguishes approved resource destinations from sample placeholders", () => {
    const onboarding = searchHub("Onboarding", betaDate).find(
      (result) => result.id === "resource-013",
    );
    const placeholder = searchHub("incident", betaDate).find(
      (result) => result.id === "resource-002",
    );

    expect(onboarding?.meta).toBe("Onboarding");
    expect(onboarding?.href).toBe("/resources?focus=resource-013");
    expect(placeholder?.meta).toContain("Sample resource");
  });
});
