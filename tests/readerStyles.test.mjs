import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("defines the Calendar indicator and selected-date color tokens", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  for (const token of ["gold-600", "gold-050"]) {
    expect(css).toMatch(new RegExp(`--${token}:\\s*#[0-9a-f]{6}`, "i"));
  }
});

it("enters the Access-protected Admin via document navigation on desktop and mobile", () => {
  const source = readFileSync(new URL("../src/components/AppShell.tsx", import.meta.url), "utf8");
  expect(source.match(/<a\b[^>]*href="\/admin"/g)).toHaveLength(2);
  expect(source).not.toMatch(/<(?:Link|NavLink)\b[^>]*to="\/admin"/);
});
