import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadAdminBootstrap, mutateContent, PublishingSessionError } from "./api";

beforeEach(() => vi.stubEnv("DEV", false));
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const mutation = { contentType: "news" as const, operation: "create" as const, expectedSha: "current-sha", item: { title: "Local fixture", status: "draft" } };

describe("publishing client Access/session boundary", () => {
  it("loads server truth without following Access login redirects or caching role data", async () => {
    const bootstrap = { actor: { role: "publisher", department: "programs" }, content: {} };
    const fetchMock = vi.fn(async () => Response.json(bootstrap));
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadAdminBootstrap()).resolves.toEqual(bootstrap);
    expect(fetchMock).toHaveBeenCalledWith("/admin/api/content", expect.objectContaining({ redirect: "manual", cache: "no-store", credentials: "same-origin", signal: expect.any(AbortSignal) }));
  });

  it.each(["bootstrap", "save"])("recognizes an opaque Access redirect during %s without retrying", async mode => {
    const response = new Response(null);
    Object.defineProperty(response, "type", { value: "opaqueredirect" });
    const fetchMock = vi.fn(async () => response);
    vi.stubGlobal("fetch", fetchMock);
    await expect(mode === "save" ? mutateContent(mutation) : loadAdminBootstrap()).rejects.toBeInstanceOf(PublishingSessionError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves actual authorization denial instead of treating it as success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "Not authorized for this department." }, { status: 403 })));
    await expect(mutateContent(mutation)).rejects.toThrow("Not authorized for this department.");
  });

  it("preserves stale-write conflict errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ message: "Content changed. Refresh before saving." }, { status: 409 })));
    await expect(mutateContent(mutation)).rejects.toThrow("Content changed.");
  });

  it("does not accept a successful HTML login page as a save receipt", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<h1>Sign in</h1>", { headers: { "Content-Type": "text/html" } })));
    await expect(mutateContent(mutation)).rejects.toThrow("unexpected response");
  });

  it("does not accept malformed JSON as success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not JSON", { headers: { "Content-Type": "application/json" } })));
    await expect(mutateContent(mutation)).rejects.toThrow("invalid response");
  });

  it("does not replay an ambiguous network-failed write or claim it was saved", async () => {
    const fetchMock = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    vi.stubGlobal("fetch", fetchMock);
    await expect(mutateContent(mutation)).rejects.toThrow("save could not be confirmed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("explains bootstrap network failure without leaking the browser's raw error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    await expect(loadAdminBootstrap()).rejects.toThrow("Check your connection or sign in again");
  });

  it("returns a successful write receipt unchanged and sends the original SHA once", async () => {
    const receipt = { item: { id: "created", status: "draft" }, sha: "new-sha", commitUrl: null, message: "Draft saved" };
    const fetchMock = vi.fn(async () => Response.json(receipt));
    vi.stubGlobal("fetch", fetchMock);
    await expect(mutateContent(mutation)).resolves.toEqual(receipt);
    expect(fetchMock).toHaveBeenCalledWith("/admin/api/content", expect.objectContaining({ method: "POST", redirect: "manual", body: JSON.stringify(mutation) }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
