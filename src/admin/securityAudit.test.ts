import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "../../functions/admin/api/[[path]]";
import { applyMutation, type Actor } from "../../functions/admin/api/_lib";

afterEach(() => vi.unstubAllGlobals());
const roles = ["programs", "facilities", "kitchen", "development"];
const record = (department: string, lane?: string) => ({ id: `${department}-${lane ?? "news"}`, department, lane,
  title: "Synthetic update", summary: "Summary", body: ["Details"], status: "published", publishedAt: "2026-01-01T00:00:00Z", priority: "standard" });
const items = [...roles.map(d => record(d)), record("administration"), record("administration", "executive-director-message")];
function setup(role: unknown, body?: unknown, origin = "https://hub.example.invalid") {
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => init?.method === "PUT"
    ? Response.json({ content: { sha: "updated" }, commit: { html_url: "https://example.invalid/commit" } })
    : Response.json({ sha: "current", encoding: "base64", content: btoa(JSON.stringify(items)) }));
  vi.stubGlobal("fetch", fetchMock);
  const context = { request: new Request("https://hub.example.invalid/admin/api/content", { method: body ? "POST" : "GET",
    headers: { Origin: origin, "Content-Type": "application/json", "X-Role": "admin", "X-Department": "administration" }, body: body ? JSON.stringify(body) : undefined }),
    env: { GITHUB_TOKEN: "synthetic-only", STAFF_HUB_ROLES: { get: async () => role } },
    data: { cloudflareAccess: { JWT: { payload: { email: "synthetic@example.invalid" } } } }, params: { path: "content" } };
  return { context, fetchMock };
}

describe("full publishing handler authorization audit", () => {
  it.each(roles)("%s publisher: own read/write allowed; cross-scope, ED, pin and forged role denied", async department => {
    const role = { role: "publisher", department };
    const read = setup(role);
    const payload = await (await onRequest(read.context as never)).json() as { content: Record<string, { items: { department: string }[] }> };
    expect(Object.values(payload.content).every(c => c.items.every(i => i.department === department))).toBe(true);
    for (const target of items) {
      const { context, fetchMock } = setup(role, { contentType: "news", operation: "archive", expectedSha: "current", role: "admin", item: { id: target.id, department } });
      const response = await onRequest(context as never);
      expect(response.status).toBe(target.department === department ? 200 : 403);
      expect(fetchMock.mock.calls.some(c => c[1]?.method === "PUT")).toBe(target.department === department);
    }
    const created = applyMutation({ actor: { ...role, email: "synthetic@example.invalid" } as Actor, items: [], request: { contentType: "news", operation: "create", expectedSha: "current", item: { ...record(department), id: undefined, pinned: true } } });
    expect(created.item.pinned).toBe(false);
  });
  it("ED publisher reads and mutates only its lane, including direct API requests", async () => {
    const role = { role: "ed_publisher", department: "administration" };
    const { context, fetchMock } = setup(role);
    const data = await (await onRequest(context as never)).json() as { content: Record<string, { items: { lane?: string }[] }> };
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(data.content.news.items).toHaveLength(1);
    expect(data.content.news.items[0].lane).toBe("executive-director-message");
    expect(data.content.events.items).toEqual([]); expect(data.content.resources.items).toEqual([]);
    for (const contentType of ["events", "resources"]) {
      const attempt = setup(role, { contentType, operation: "create", expectedSha: "current", item: { title: "No", status: "draft" } });
      expect((await onRequest(attempt.context as never)).status).toBe(403);
      expect(attempt.fetchMock).not.toHaveBeenCalled();
    }
    for (const target of items) {
      const attempt = setup(role, { contentType: "news", operation: "archive", expectedSha: "current", item: { id: target.id } });
      expect((await onRequest(attempt.context as never)).status).toBe(target.lane ? 200 : 403);
      expect(attempt.fetchMock.mock.calls.some(c => c[1]?.method === "PUT")).toBe(Boolean(target.lane));
    }
  });
  it.each([null, { role: "owner", department: "programs" }, { role: "admin", department: "unknown" }])("invalid server grant %j cannot use forged client admin headers", async role => {
    const { context, fetchMock } = setup(role);
    expect((await onRequest(context as never)).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("admin retains cross-department authority; missing Origin and stale versions do not write", async () => {
    const role = { role: "admin", department: "administration" };
    const request = { contentType: "news", operation: "archive", expectedSha: "current", item: { id: items[0].id } };
    const allowed = setup(role, request);
    expect((await onRequest(allowed.context as never)).status).toBe(200);
    const denied = setup(role, request, "");
    expect((await onRequest(denied.context as never)).status).toBe(403); expect(denied.fetchMock).not.toHaveBeenCalled();
    const stale = setup(role, { ...request, expectedSha: "old" });
    expect((await onRequest(stale.context as never)).status).toBe(409);
    expect(stale.fetchMock.mock.calls.some(c => c[1]?.method === "PUT")).toBe(false);
  });
  it.each(["javascript:alert(1)", "data:text/html,evil", "//evil.example.invalid", "file:///tmp/example"])("rejects unsafe related-link scheme %s", url => {
    expect(() => applyMutation({ actor: { role: "admin", department: "administration", email: "synthetic@example.invalid" }, items: [],
      request: { contentType: "news", operation: "create", expectedSha: "current", item: { ...record("programs"), id: undefined, resourceLinks: [{ label: "Unsafe", url }] } } })).toThrow();
  });
});
