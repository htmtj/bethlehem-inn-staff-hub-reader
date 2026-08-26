import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "../../functions/admin/api/[[path]]";

type RoleValue = { role: "publisher" | "admin"; department: string } | null;

const programsNews = {
  id: "news-programs",
  slug: "news-programs",
  title: "Programs update",
  summary: "Sample summary",
  body: ["Sample details"],
  department: "programs",
  category: "Department update",
  publishedAt: "2026-08-20T12:00:00.000Z",
  effectiveAt: null,
  expiresAt: null,
  status: "published",
  priority: "standard",
  pinned: false,
  actionNeeded: false,
  actionText: null,
  contact: "Sample contact",
  resourceLinks: [],
  image: null,
  imageAlt: null,
};

const facilitiesNews = { ...programsNews, id: "news-facilities", department: "facilities", title: "Facilities update" };

function githubFile(items: unknown[], sha = "sha-current"): Response {
  return Response.json({
    content: btoa(JSON.stringify(items)),
    encoding: "base64",
    path: "src/content/news.json",
    sha,
  });
}

function context(options: {
  method?: string;
  path?: string;
  body?: unknown;
  role?: RoleValue;
  sha?: string;
}) {
  const url = `https://staff-hub.example.invalid/admin/api/${options.path ?? "content"}`;
  return {
    request: new Request(url, {
      method: options.method ?? "GET",
      headers: options.method === "POST" ? { "Content-Type": "application/json", Origin: "https://staff-hub.example.invalid" } : undefined,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    }),
    env: {
      STAFF_HUB_ROLES: { get: vi.fn(async () => options.role ?? null) },
      GITHUB_TOKEN: "test-token",
    },
    data: {
      cloudflareAccess: {
        JWT: { payload: { email: "publisher.programs@example.invalid" } },
      },
    },
    params: { path: options.path ?? "content" },
  } as never;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("protected publisher API", () => {
  it("rejects an authenticated email with no role before reading GitHub", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await onRequest(context({ role: null }));
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns only the publisher department from all three server-side collections", async () => {
    const fetchMock = vi.fn(async () => githubFile([programsNews, facilitiesNews]));
    vi.stubGlobal("fetch", fetchMock);
    const response = await onRequest(context({ role: { role: "publisher", department: "programs" } }));
    const body = await response.json() as { content: Record<string, { items: Array<{ department: string }> }> };
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(Object.values(body.content).every((collection) => collection.items.every((item) => item.department === "programs"))).toBe(true);
  });

  it("rejects a stale SHA before any GitHub write", async () => {
    const fetchMock = vi.fn(async () => githubFile([programsNews], "sha-newer"));
    vi.stubGlobal("fetch", fetchMock);
    const response = await onRequest(context({
      method: "POST",
      role: { role: "publisher", department: "programs" },
      body: {
        contentType: "news",
        operation: "archive",
        expectedSha: "sha-stale",
        item: { id: programsNews.id },
      },
    }));
    expect(response.status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit?]>;
    expect(calls.some((call) => call[1]?.method === "PUT")).toBe(false);
  });

  it("rejects cross-department writes before the GitHub PUT", async () => {
    const fetchMock = vi.fn(async () => githubFile([facilitiesNews]));
    vi.stubGlobal("fetch", fetchMock);
    const response = await onRequest(context({
      method: "POST",
      role: { role: "publisher", department: "programs" },
      body: {
        contentType: "news",
        operation: "archive",
        expectedSha: "sha-current",
        item: { id: facilitiesNews.id },
      },
    }));
    expect(response.status).toBe(403);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit?]>;
    expect(calls.some((call) => call[1]?.method === "PUT")).toBe(false);
  });

  it("rejects create ID collisions before the GitHub PUT", async () => {
    const fetchMock = vi.fn(async () => githubFile([facilitiesNews]));
    vi.stubGlobal("fetch", fetchMock);
    const response = await onRequest(context({
      method: "POST",
      role: { role: "publisher", department: "programs" },
      body: {
        contentType: "news",
        operation: "create",
        expectedSha: "sha-current",
        item: {
          id: facilitiesNews.id,
          title: "Unauthorized Programs replacement",
          department: "programs",
          status: "draft",
        },
      },
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "New content cannot include an existing content ID.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calls = fetchMock.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit?]>;
    expect(calls.some((call) => call[1]?.method === "PUT")).toBe(false);
  });

  it("rejects cross-origin mutation requests before loading content", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const requestContext = context({
      method: "POST",
      role: { role: "admin", department: "administration" },
      body: {
        contentType: "news",
        operation: "archive",
        expectedSha: "sha-current",
        item: { id: programsNews.id },
      },
    }) as { request: Request };
    requestContext.request = new Request("https://staff-hub.example.invalid/admin/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://other.example.invalid" },
      body: JSON.stringify({ contentType: "news", operation: "archive", expectedSha: "sha-current", item: { id: programsNews.id } }),
    });
    const response = await onRequest(requestContext as never);
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
