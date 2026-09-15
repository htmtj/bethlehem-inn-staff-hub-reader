import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { ResourcesPage } from "../pages/ResourcesPage";

describe("Reader design compatibility", () => {
  it("keeps the five primary destinations and preserves the Admin utility", () => {
    const html = renderToStaticMarkup(<MemoryRouter><AppShell><p>Reader</p></AppShell></MemoryRouter>);
    const nav = html.match(/<nav[\s\S]*?<\/nav>/)?.[0] ?? "";
    for (const [label, href] of [["Home", "/"], ["Updates", "/news"], ["Calendar", "/upcoming"], ["Departments", "/departments"], ["Links", "/links"]]) {
      expect(nav).toContain(`href="${href}"`);
      expect(nav).toContain(`>${label}</a>`);
    }
    expect(nav).not.toContain('href="/resources"');
    expect(html).toContain('href="/admin"');
    expect(html).toContain('aria-controls="primary-navigation"');
  });
  it("retains deep-linked resources in a named native dialog", () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={["/resources?focus=resource-013"]}><ResourcesPage /></MemoryRouter>);
    expect(html).toContain('<dialog aria-labelledby="resource-preview-heading"');
    expect(html).toContain('aria-label="Close resource details"');
    expect(html).toContain('href="https://bionboarding.netlify.app/"');
  });
  it("does not open a preview on the ordinary resource directory", () => {
    const html = renderToStaticMarkup(<MemoryRouter initialEntries={["/resources"]}><ResourcesPage /></MemoryRouter>);
    expect(html).not.toContain("<dialog");
    expect(html).toContain("Resource directory");
  });
});
