import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LinksPage, staffLinks } from "./LinksPage";

describe("official Links destination", () => {
  it("contains only the three approved authoritative destinations", () => {
    expect(staffLinks.map(item => item.href)).toEqual([
      "https://bethleheminn.org/",
      "https://www.youtube.com/@BethlehemInnBend",
      "https://bionboarding.netlify.app/",
    ]);
  });
  it("renders named, described external links with safe new-tab behavior", () => {
    const html = renderToStaticMarkup(<LinksPage />);
    expect(html).toContain("<h1>Links</h1>");
    expect(html.match(/target="_blank"/g)).toHaveLength(3);
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(3);
    expect(html.match(/Opens in a new tab/g)).toHaveLength(3);
    for (const item of staffLinks) {
      expect(html).toContain(item.title);
      expect(html).toContain(item.description);
    }
  });
});
