import { describe, expect, it } from "vitest";
import { updatePrimaryLink } from "./relatedLinks";
describe("editing an update with multiple related links", () => {
  const links = [1, 2, 3, 4, 5].map(n => ({ label: `Link ${n}`, url: `https://example.invalid/${n}` }));
  it("preserves every unedited link and does not mutate the original", () => {
    expect(updatePrimaryLink(links, "Changed", "https://example.invalid/changed")).toEqual([{ label: "Changed", url: "https://example.invalid/changed" }, ...links.slice(1)]);
    expect(links[0].label).toBe("Link 1");
  });
  it("clears only the editable link and supports a new record", () => {
    expect(updatePrimaryLink(links, "", "")).toEqual(links.slice(1));
    expect(updatePrimaryLink([], "", "https://example.invalid/new")).toEqual([{ label: "Open resource", url: "https://example.invalid/new" }]);
  });
});
