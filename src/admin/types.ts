import type { EventItem, NewsItem, ResourceItem } from "../types/content";

export type AdminRole = "publisher" | "admin";
export type AdminContentType = "news" | "events" | "resources";

export type AdminActor = {
  email: string;
  role: AdminRole;
  department: string;
};

export type ContentCollection<T> = {
  sha: string;
  items: T[];
};

export type AdminContent = {
  news: ContentCollection<NewsItem>;
  events: ContentCollection<EventItem>;
  resources: ContentCollection<ResourceItem>;
};

export type AdminBootstrap = {
  actor: AdminActor;
  content: AdminContent;
};

export type ManagedContent =
  | { contentType: "news"; item: NewsItem }
  | { contentType: "events"; item: EventItem }
  | { contentType: "resources"; item: ResourceItem };

export type MutationOperation = "create" | "update" | "archive";

export type MutationPayload = {
  contentType: AdminContentType;
  operation: MutationOperation;
  expectedSha: string;
  item: Record<string, unknown>;
};

export type MutationResult = {
  item: Record<string, unknown>;
  sha: string | null;
  commitUrl: string | null;
  message: string;
};
