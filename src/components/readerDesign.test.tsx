import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";
import { HomePage } from "../pages/HomePage";
import { DepartmentsPage } from "../pages/DepartmentsPage";

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
  it("removes the resource directory and previews from Home", () => {
    const html = renderToStaticMarkup(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(html).not.toMatch(/resources|resource-preview/i);
    expect(html).toContain('href="/links"');
    expect(html).toContain("Onboarding");
  });
  it("does not advertise resources or placeholder contacts in Departments", () => {
    const html = renderToStaticMarkup(<MemoryRouter><DepartmentsPage /></MemoryRouter>);
    expect(html).not.toMatch(/resources|Sample .* contact/i);
    expect(html).toContain("Programs");
  });
});
