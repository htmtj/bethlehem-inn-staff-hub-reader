import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchDialog } from "./SearchDialog";

const effects = vi.hoisted(() => [] as Array<() => void | (() => void)>);
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useEffect: (effect: () => void | (() => void)) => effects.push(effect),
}));
vi.mock("../hooks/useCalendarEvents", () => ({ useCalendarEvents: () => ({ events: [], state: "ready" }) }));
afterEach(() => { effects.length = 0; vi.unstubAllGlobals(); });

describe("Search dialog lifecycle", () => {
  it.each(["", "auto"])("restores the original page scrolling (%s) and focus after closing", (overflow) => {
    const opener = { isConnected: true, focus: vi.fn() };
    const body = { style: { overflow } };
    vi.stubGlobal("document", { body, activeElement: opener, addEventListener: vi.fn(), removeEventListener: vi.fn() });
    vi.stubGlobal("window", { setTimeout: vi.fn(), clearTimeout: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() });
    renderToStaticMarkup(<SearchDialog open onClose={() => {}} />);
    const cleanup = effects.map(effect => effect());
    expect(body.style.overflow).toBe("hidden");
    cleanup.forEach(fn => fn?.());
    expect(body.style.overflow).toBe(overflow);
    expect(opener.focus).toHaveBeenCalledOnce();
  });
});
