import { describe, expect, it } from "vitest";
import {
  RequestError,
  applyMutation,
  filterItemsForActor,
  parseMutationRequest,
  parseRoleRecord,
  ED_MESSAGE_LANE,
  type Actor,
} from "../../functions/admin/api/_lib";

const NOW = new Date("2026-09-01T12:00:00.000Z");
const programsPublisher: Actor = {
  email: "publisher.programs@example.invalid",
  role: "publisher",
  department: "programs",
};
const administrator: Actor = {
  email: "admin@example.invalid",
  role: "admin",
  department: "administration",
};
const facilitiesPublisher: Actor = {
  email: "publisher.facilities@example.invalid",
  role: "publisher",
  department: "facilities",
};
const executiveDirectorPublisher: Actor = {
  email: "michael@bethleheminn.org",
  role: "ed_publisher",
  department: "administration",
};

const news = (department = "programs") => ({
  id: `news-${department}`,
  slug: `news-${department}`,
  title: `${department} update`,
  summary: "Sample summary",
  body: ["Sample details"],
  department,
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
});

const createNewsRequest = (overrides: Record<string, unknown> = {}) => ({
  contentType: "news" as const,
  operation: "create" as const,
  expectedSha: "sha-current",
  item: {
    title: "New sample update",
    summary: "A sample summary",
    body: ["Sample details for staff."],
    department: "programs",
    category: "Department update",
    status: "published",
    priority: "standard",
    actionNeeded: false,
    contact: "Sample contact",
    ...overrides,
  },
});

function expectRequestError(action: () => unknown, status: number) {
  try {
    action();
    throw new Error("Expected RequestError");
  } catch (error) {
    expect(error).toBeInstanceOf(RequestError);
    expect((error as RequestError).status).toBe(status);
  }
}

describe("publisher role resolution", () => {
  it("normalizes approved role email addresses", () => {
    expect(parseRoleRecord({ role: "publisher", department: "programs" }, " Publisher.Programs@Example.Invalid ")).toEqual({
      email: "publisher.programs@example.invalid",
      role: "publisher",
      department: "programs",
    });
  });

  it("rejects missing and invalid role records", () => {
    expectRequestError(() => parseRoleRecord(null, "nobody@example.invalid"), 403);
    expectRequestError(() => parseRoleRecord({ role: "viewer", department: "programs" }, "viewer@example.invalid"), 403);
    expectRequestError(() => parseRoleRecord({ role: "publisher", department: "other" }, "publisher@example.invalid"), 403);
    expectRequestError(() => parseRoleRecord({ role: "publisher", department: "administration" }, "publisher@example.invalid"), 403);
    expect(parseRoleRecord({ role: "ed_publisher", department: "administration" }, " Michael@Bethleheminn.org ")).toEqual(executiveDirectorPublisher);
    expectRequestError(() => parseRoleRecord({ role: "ed_publisher", department: "programs" }, "michael@bethleheminn.org"), 403);
  });

  it("filters publisher reads to the assigned department while admins see all", () => {
    const items = [news("programs"), news("facilities")];
    expect(filterItemsForActor(programsPublisher, items, "news").map((item) => item.department)).toEqual(["programs"]);
    expect(filterItemsForActor(administrator, items, "news")).toHaveLength(2);
  });

  it("filters the Executive Director publisher to the ED Message lane", () => {
    const items = [
      { ...news("administration"), lane: ED_MESSAGE_LANE },
      news("administration"),
      news("programs"),
    ];
    expect(filterItemsForActor(executiveDirectorPublisher, items, "news")).toEqual([items[0]]);
  });
});

describe("server-side content authorization", () => {
  it("allows a publisher to create and archive content in the assigned department", () => {
    const created = applyMutation({
      actor: programsPublisher,
      items: [],
      request: createNewsRequest(),
      now: NOW,
      idFactory: () => "fixed-id",
    });
    expect(created.item.department).toBe("programs");
    expect(created.item.status).toBe("published");

    const archived = applyMutation({
      actor: programsPublisher,
      items: created.items,
      request: {
        contentType: "news",
        operation: "archive",
        expectedSha: "sha-next",
        item: { id: created.item.id },
      },
      now: NOW,
    });
    expect(archived.item.status).toBe("archived");
    expect(archived.item.pinned).toBe(false);
  });

  it("allows department-scoped upcoming items and resources without broadening scope", () => {
    const upcoming = applyMutation({
      actor: programsPublisher,
      items: [],
      request: {
        contentType: "events",
        operation: "create",
        expectedSha: "sha-events",
        item: {
          title: "Programs sample meeting",
          description: "A synthetic meeting for authorization testing.",
          startAt: "2026-09-10T16:00:00.000Z",
          department: "programs",
          status: "published",
          category: "Meeting",
        },
      },
      now: NOW,
      idFactory: () => "event-id",
    });
    expect(upcoming.item.department).toBe("programs");

    const resource = applyMutation({
      actor: programsPublisher,
      items: [],
      request: {
        contentType: "resources",
        operation: "create",
        expectedSha: "sha-resources",
        item: {
          title: "Programs sample resource",
          description: "A synthetic resource for authorization testing.",
          destinationUrl: "https://example.invalid/programs-resource",
          department: "programs",
          status: "published",
          category: "Department Resources",
          resourceType: "Guide",
        },
      },
      now: NOW,
      idFactory: () => "resource-id",
    });
    expect(resource.item.department).toBe("programs");
  });

  it("allows the Executive Director publisher to manage only ED Message news", () => {
    const created = applyMutation({
      actor: executiveDirectorPublisher,
      items: [],
      request: {
        contentType: "news",
        operation: "create",
        expectedSha: "sha-ed",
        item: {
          title: "Executive Director sample message",
          summary: "A synthetic ED message for authorization testing.",
          body: ["Synthetic details only."],
          department: "administration",
          status: "published",
          category: "Executive Director Message",
        },
      },
      now: NOW,
      idFactory: () => "ed-id",
    });
    expect(created.item.lane).toBe(ED_MESSAGE_LANE);
    expect(created.item.department).toBe("administration");
    expectRequestError(
      () => applyMutation({
        actor: executiveDirectorPublisher,
        items: [],
        request: { contentType: "events", operation: "create", expectedSha: "sha-events", item: { title: "No", status: "draft" } },
        now: NOW,
      }),
      403,
    );
    expectRequestError(
      () => applyMutation({
        actor: executiveDirectorPublisher,
        items: [news("administration")],
        request: { contentType: "news", operation: "archive", expectedSha: "sha-ed", item: { id: "news-administration" } },
        now: NOW,
      }),
      403,
    );
    const archived = applyMutation({
      actor: executiveDirectorPublisher,
      items: created.items,
      request: { contentType: "news", operation: "archive", expectedSha: "sha-ed", item: { id: created.item.id } },
      now: NOW,
    });
    expect(archived.item.status).toBe("archived");
  });

  it("prevents a normal publisher from forging the ED Message lane", () => {
    expectRequestError(
      () => applyMutation({
        actor: programsPublisher,
        items: [],
        request: createNewsRequest({ department: "administration", category: "Executive Director Message", lane: ED_MESSAGE_LANE }),
        now: NOW,
      }),
      403,
    );
  });

  it("applies the same ownership boundary to a Facilities publisher", () => {
    const created = applyMutation({
      actor: facilitiesPublisher,
      items: [],
      request: createNewsRequest({ department: "facilities" }),
      now: NOW,
      idFactory: () => "facilities-id",
    });
    expect(created.item.department).toBe("facilities");
    expectRequestError(
      () => applyMutation({
        actor: facilitiesPublisher,
        items: [],
        request: createNewsRequest({ department: "kitchen" }),
        now: NOW,
      }),
      403,
    );
  });

  it("denies cross-department create, update, and archive attempts", () => {
    expectRequestError(
      () => applyMutation({
        actor: programsPublisher,
        items: [],
        request: createNewsRequest({ department: "facilities" }),
        now: NOW,
      }),
      403,
    );

    const facilities = news("facilities");
    for (const operation of ["update", "archive"] as const) {
      expectRequestError(
        () => applyMutation({
          actor: programsPublisher,
          items: [facilities],
          request: {
            ...createNewsRequest(),
            operation,
            item: operation === "archive" ? { id: facilities.id } : { ...facilities, title: "Unauthorized change" },
          },
          now: NOW,
        }),
        403,
      );
    }
  });

  it("rejects client-supplied IDs on create across every content collection", () => {
    for (const contentType of ["news", "events", "resources"] as const) {
      const victimId = `${contentType}-facilities`;
      expectRequestError(
        () => applyMutation({
          actor: programsPublisher,
          items: [{ id: victimId, department: "facilities", title: "Facilities sample" }],
          request: {
            contentType,
            operation: "create",
            expectedSha: `sha-${contentType}`,
            item: {
              id: `  ${victimId}  `,
              title: "Unauthorized Programs replacement",
              department: "programs",
              status: "draft",
            },
          },
          now: NOW,
        }),
        400,
      );
    }
  });

  it("denies urgent priority to publishers but allows administrators across departments", () => {
    expectRequestError(
      () => applyMutation({
        actor: programsPublisher,
        items: [],
        request: createNewsRequest({ priority: "urgent" }),
        now: NOW,
      }),
      403,
    );

    const created = applyMutation({
      actor: administrator,
      items: [],
      request: createNewsRequest({ department: "facilities", priority: "urgent", pinned: true }),
      now: NOW,
      idFactory: () => "admin-id",
    });
    expect(created.item.department).toBe("facilities");
    expect(created.item.priority).toBe("urgent");
    expect(created.item.pinned).toBe(true);
  });

  it("requires future dates for scheduled publishing", () => {
    expectRequestError(
      () => applyMutation({
        actor: programsPublisher,
        items: [],
        request: createNewsRequest({ status: "scheduled", publishedAt: NOW.toISOString() }),
        now: NOW,
      }),
      400,
    );
  });

  it("accepts only the allowlisted mutation contract", () => {
    expect(parseMutationRequest(createNewsRequest()).contentType).toBe("news");
    expectRequestError(
      () => parseMutationRequest({ ...createNewsRequest(), contentType: "../../secrets" }),
      400,
    );
  });
});
