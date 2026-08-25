import departmentsJson from "../content/departments.json";
import eventsJson from "../content/events.json";
import newsJson from "../content/news.json";
import resourcesJson from "../content/resources.json";
import type {
  Department,
  EventItem,
  NewsItem,
  ResourceItem,
  SearchResult,
} from "../types/content";

export const departments = (departmentsJson as Department[])
  .filter((department) => department.active)
  .sort((a, b) => a.displayOrder - b.displayOrder);

export const news = newsJson as NewsItem[];
export const events = eventsJson as EventItem[];
export const resources = resourcesJson as ResourceItem[];

const asTime = (value: string) => new Date(value).getTime();

export function isNewsActiveAt(item: NewsItem, timestamp: number): boolean {
  return (
    (item.status === "published" || item.status === "scheduled") &&
    asTime(item.publishedAt) <= timestamp &&
    (!item.expiresAt || asTime(item.expiresAt) > timestamp)
  );
}

export function getActiveNews(now = new Date()): NewsItem[] {
  const timestamp = now.getTime();
  return news
    .filter((item) => isNewsActiveAt(item, timestamp))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      return asTime(b.publishedAt) - asTime(a.publishedAt);
    });
}

export function getArchivedNews(now = new Date()): NewsItem[] {
  const timestamp = now.getTime();
  return news
    .filter(
      (item) =>
        item.status === "archived" ||
        item.status === "expired" ||
        Boolean(item.expiresAt && asTime(item.expiresAt) <= timestamp),
    )
    .sort((a, b) => asTime(b.publishedAt) - asTime(a.publishedAt));
}

export function getImportantNews(now = new Date()): NewsItem[] {
  return getActiveNews(now)
    .filter((item) => item.pinned || item.priority === "urgent" || item.priority === "high")
    .slice(0, 3);
}

export function getActiveEvents(now = new Date()): EventItem[] {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  return events
    .filter(
      (item) =>
        item.status === "published" &&
        asTime(item.endAt ?? item.startAt) >= dayStart.getTime(),
    )
    .sort((a, b) => asTime(a.startAt) - asTime(b.startAt));
}

export function getActiveResources(): ResourceItem[] {
  return resources.filter((item) => item.status === "published");
}

export function getDepartment(id: string | undefined): Department | undefined {
  return departments.find((department) => department.id === id);
}

export function getDepartmentName(id: string): string {
  return getDepartment(id)?.displayName ?? "Organization-wide";
}

export function searchHub(query: string, now = new Date()): SearchResult[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [];

  const matches = (values: Array<string | null | undefined>) =>
    values.some((value) => value?.toLocaleLowerCase().includes(normalized));

  const newsResults: SearchResult[] = getActiveNews(now)
    .filter((item) =>
      matches([
        item.title,
        item.summary,
        item.body.join(" "),
        item.category,
        getDepartmentName(item.department),
      ]),
    )
    .map((item) => ({
      id: item.id,
      type: "News",
      title: item.title,
      description: item.summary,
      meta: `${getDepartmentName(item.department)} · ${item.category}`,
      href: `/news/${item.slug}`,
    }));

  const eventResults: SearchResult[] = getActiveEvents(now)
    .filter((item) =>
      matches([
        item.title,
        item.description,
        item.category,
        item.location,
        getDepartmentName(item.department),
      ]),
    )
    .map((item) => ({
      id: item.id,
      type: "Upcoming",
      title: item.title,
      description: item.description,
      meta: `${getDepartmentName(item.department)} · ${item.location}`,
      href: "/upcoming",
    }));

  const departmentResults: SearchResult[] = departments
    .filter((department) =>
      matches([department.name, department.displayName, department.description]),
    )
    .map((department) => ({
      id: department.id,
      type: "Department",
      title: department.displayName,
      description: department.description,
      meta: "Department space",
      href: `/departments/${department.id}`,
    }));

  const resourceResults: SearchResult[] = getActiveResources()
    .filter((item) =>
      matches([
        item.title,
        item.description,
        item.category,
        item.resourceType,
        getDepartmentName(item.department),
      ]),
    )
    .map((item) => ({
      id: item.id,
      type: "Resource",
      title: item.title,
      description: item.description,
      meta: `${item.category}${item.destinationUrl ? "" : " · Sample resource"}`,
      href: `/resources?focus=${item.id}`,
    }));

  return [...newsResults, ...eventResults, ...departmentResults, ...resourceResults];
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function formatTimeRange(startAt: string, endAt: string | null): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const start = formatter.format(new Date(startAt));
  if (!endAt) return "All day";
  return `${start}–${formatter.format(new Date(endAt))}`;
}

export function getDateParts(value: string): { month: string; day: string } {
  const date = new Date(value);
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date),
    day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date),
  };
}
