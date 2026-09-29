import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("keeps small muted text above 4.5:1 on the Reader light surfaces", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const luminance = (token) => {
    const hex = css.match(new RegExp(`--${token}:\\s*#([0-9a-f]{6})`, "i"))[1];
    return hex.match(/../g).map(part => parseInt(part, 16) / 255)
      .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
  };
  for (const background of ["paper", "canvas", "teal-050", "teal-100", "gold-050"]) {
    expect((luminance(background) + 0.05) / (luminance("muted") + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});

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
