import { describe, expect, it } from "vitest";
import {
  getActiveNews,
  getActiveResources,
  getArchivedNews,
  getImportantNews,
  searchHub,
} from "./content";

const betaDate = new Date("2026-08-25T12:00:00-07:00");

describe("content lifecycle", () => {
  it("keeps scheduled and archived content out of active feeds", () => {
    const active = getActiveNews(betaDate);
    expect(active.some((item) => item.status === "scheduled")).toBe(false);
    expect(active.some((item) => item.status === "archived")).toBe(false);
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
});
