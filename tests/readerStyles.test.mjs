import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("defines the Calendar indicator and selected-date color tokens", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  for (const token of ["gold-600", "gold-050"]) {
    expect(css).toMatch(new RegExp(`--${token}:\\s*#[0-9a-f]{6}`, "i"));
  }
});
