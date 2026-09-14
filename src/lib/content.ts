import departmentsJson from "../content/departments.json";
import eventsJson from "../content/events.json";
import newsJson from "../content/news.json";
import resourcesJson from "../content/resources.json";
import { hubDateKey } from "./eventDates";
import { lifecycleState } from "./lifecycle";
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
  return Boolean(item.publishedAt) && lifecycleState(item, timestamp) === "published";
}

export function getActiveNews(now = new Date(), items = news): NewsItem[] {
  const timestamp = now.getTime();
  return items
    .filter((item) => isNewsActiveAt(item, timestamp))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
      return asTime(b.publishedAt) - asTime(a.publishedAt);
    });
}

export function getArchivedNews(now = new Date(), items = news): NewsItem[] {
  const timestamp = now.getTime();
  return items
    .filter(
      (item) =>
        item.status !== "draft" && lifecycleState(item, timestamp) === "archived" &&
        asTime(item.publishedAt) <= timestamp,
    )
    .sort((a, b) => asTime(b.publishedAt) - asTime(a.publishedAt));
}

export function isImportantNews(item: NewsItem): boolean {
  return item.pinned || item.actionNeeded || item.priority === "urgent" || item.priority === "high";
}

export function getImportantNews(now = new Date(), items = news): NewsItem[] {
  return getActiveNews(now, items).filter(isImportantNews);
}

export function filterNews(items: NewsItem[], query = "", department = "all", importantOnly = false): NewsItem[] {
  const normalized = query.trim().toLocaleLowerCase();
  return items.filter(item => (department === "all" || item.department === department) &&
    (!importantOnly || isImportantNews(item)) && (!normalized ||
      [item.title, item.summary, ...item.body, item.category].join(" ").toLocaleLowerCase().includes(normalized)));
}

export function getActiveEvents(now = new Date()): EventItem[] {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const timestamp = now.getTime();
  return events
    .filter(
      (item) =>
        lifecycleState(item, timestamp) === "published" &&
        asTime(item.endAt ?? item.startAt) >= dayStart.getTime(),
    )
    .sort((a, b) => asTime(a.startAt) - asTime(b.startAt));
}

export function getActiveResources(now = new Date()): ResourceItem[] {
  const timestamp = now.getTime();
  return resources.filter(
    (item) =>
      lifecycleState(item, timestamp) === "published",
  );
}

export function getDepartment(id: string | undefined): Department | undefined {
  return departments.find((department) => department.id === id);
}

export function getDepartmentName(id: string): string {
  return getDepartment(id)?.displayName ?? "Organization-wide";
}

export function searchHub(query: string, now = new Date(), calendarEvents?: EventItem[]): SearchResult[] {
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

  const eventResults: SearchResult[] = (calendarEvents ?? getActiveEvents(now))
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
      href: `/upcoming?date=${hubDateKey(item.startAt)}`,
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

  const resourceResults: SearchResult[] = getActiveResources(now)
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
      meta: `${item.category}${item.destinationUrl ? "" : " · Link pending approval"}`,
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
