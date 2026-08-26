import type { PluginData } from "@cloudflare/pages-plugin-cloudflare-access";
import {
  RequestError,
  applyMutation,
  filterItemsForActor,
  parseMutationRequest,
  parseRoleRecord,
  type Actor,
  type ContentType,
} from "./_lib";

type KvNamespace = {
  get<T = unknown>(key: string, type: "json"): Promise<T | null>;
};

type Env = {
  STAFF_HUB_ROLES?: KvNamespace;
  GITHUB_TOKEN?: string;
};

type FunctionContext = {
  request: Request;
  env: Env;
  data: PluginData;
  params: Record<string, string | string[]>;
};

type GitHubFile = {
  content: string;
  encoding: "base64";
  path: string;
  sha: string;
};

const repository = "htmtj/bethlehem-inn-staff-hub-reader";
const branch = "main";
const githubApiVersion = "2022-11-28";
const files: Record<ContentType, string> = {
  news: "src/content/news.json",
  events: "src/content/events.json",
  resources: "src/content/resources.json",
};

const responseHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: responseHeaders });
}

function githubHeaders(token: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "bethlehem-inn-staff-hub",
    "X-GitHub-Api-Version": githubApiVersion,
  };
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary);
}

function tokenFromEnv(env: Env): string {
  const token = env.GITHUB_TOKEN?.trim();
  if (!token) throw new RequestError(503, "Publishing setup is not complete yet.");
  return token;
}

async function readFile(token: string, contentType: ContentType): Promise<{
  items: Array<Record<string, unknown>>;
  sha: string;
}> {
  const path = files[contentType];
  const response = await fetch(
    `https://api.github.com/repos/${repository}/contents/${path}?ref=${encodeURIComponent(branch)}`,
    { headers: githubHeaders(token) },
  );
  if (!response.ok) {
    console.error("GitHub content read failed", contentType, response.status);
    throw new RequestError(503, "Staff Hub content could not be loaded for publishing.");
  }
  const file = await response.json() as GitHubFile;
  if (file.encoding !== "base64" || typeof file.content !== "string" || typeof file.sha !== "string") {
    throw new RequestError(503, "Staff Hub content returned an unexpected format.");
  }
  const parsed = JSON.parse(decodeBase64(file.content));
  if (!Array.isArray(parsed)) throw new RequestError(503, "Staff Hub content is not in the expected format.");
  return { items: parsed, sha: file.sha };
}

async function writeFile(options: {
  actor: Actor;
  contentType: ContentType;
  items: Array<Record<string, unknown>>;
  sha: string;
  token: string;
  title: string;
}): Promise<{ commitUrl: string | null; contentSha: string | null }> {
  const path = files[options.contentType];
  const response = await fetch(`https://api.github.com/repos/${repository}/contents/${path}`, {
    method: "PUT",
    headers: {
      ...githubHeaders(options.token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Staff Hub: update ${options.contentType} — ${options.title.slice(0, 80)}`,
      content: encodeBase64(`${JSON.stringify(options.items, null, 2)}\n`),
      sha: options.sha,
      branch,
    }),
  });

  if (response.status === 409 || response.status === 422) {
    throw new RequestError(
      409,
      "This content changed while you were editing it. Refresh to load the newest version.",
    );
  }
  if (!response.ok) {
    console.error("GitHub content write failed", options.contentType, response.status, options.actor.role);
    throw new RequestError(503, "This content could not be published. Your changes have not been lost.");
  }
  const result = await response.json() as {
    commit?: { html_url?: string };
    content?: { sha?: string };
  };
  return {
    commitUrl: result.commit?.html_url ?? null,
    contentSha: result.content?.sha ?? null,
  };
}

function routeName(params: FunctionContext["params"]): string {
  const path = params.path;
  return Array.isArray(path) ? path.join("/") : path ?? "";
}

async function actorFromContext(context: FunctionContext): Promise<Actor> {
  const email = context.data.cloudflareAccess.JWT.payload.email;
  if (typeof email !== "string" || !email.trim()) {
    throw new RequestError(403, "A verified email address is required for publishing.");
  }
  if (!context.env.STAFF_HUB_ROLES) {
    throw new RequestError(503, "Publishing role lookup is not configured yet.");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const role = await context.env.STAFF_HUB_ROLES.get(normalizedEmail, "json");
  return parseRoleRecord(role, normalizedEmail);
}

function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("Origin");
  if (!origin || origin !== new URL(request.url).origin) {
    throw new RequestError(403, "This publishing request did not come from the Staff Hub.");
  }
}

async function handleRequest(context: FunctionContext): Promise<Response> {
  const actor = await actorFromContext(context);
  const route = routeName(context.params);

  if (context.request.method === "GET" && route === "session") {
    return json({ actor });
  }

  if (context.request.method === "GET" && route === "content") {
    const token = tokenFromEnv(context.env);
    const [news, events, resources] = await Promise.all([
      readFile(token, "news"),
      readFile(token, "events"),
      readFile(token, "resources"),
    ]);
    return json({
      actor,
      content: {
        news: { ...news, items: filterItemsForActor(actor, news.items) },
        events: { ...events, items: filterItemsForActor(actor, events.items) },
        resources: { ...resources, items: filterItemsForActor(actor, resources.items) },
      },
    });
  }

  if (context.request.method === "POST" && route === "content") {
    assertSameOrigin(context.request);
    const token = tokenFromEnv(context.env);
    const mutation = parseMutationRequest(await context.request.json());
    const current = await readFile(token, mutation.contentType);
    if (current.sha !== mutation.expectedSha) {
      throw new RequestError(
        409,
        "This content changed while you were editing it. Refresh to load the newest version.",
      );
    }
    const changed = applyMutation({ actor, items: current.items, request: mutation });
    const write = await writeFile({
      actor,
      contentType: mutation.contentType,
      items: changed.items,
      sha: current.sha,
      token,
      title: typeof changed.item.title === "string" ? changed.item.title : "content",
    });
    return json({
      item: changed.item,
      commitUrl: write.commitUrl,
      sha: write.contentSha,
      message:
        mutation.operation === "archive"
          ? "Archived. Staff Hub is updating now."
          : mutation.item.status === "draft"
            ? "Draft saved."
            : "Published. Staff Hub is updating now.",
    });
  }

  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { Allow: "GET, POST, OPTIONS" } });
  }

  return json({ message: "Not found." }, 404);
}

export const onRequest = async (context: FunctionContext): Promise<Response> => {
  try {
    return await handleRequest(context);
  } catch (error) {
    if (error instanceof RequestError) return json({ message: error.message }, error.status);
    console.error("Staff Hub publishing API failed", error instanceof Error ? error.message : "Unknown error");
    return json({ message: "Publishing is temporarily unavailable. Your changes have not been lost." }, 500);
  }
};
