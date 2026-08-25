export type ContentStatus = "draft" | "published" | "scheduled" | "expired" | "archived";
export type Priority = "standard" | "high" | "urgent";

export type ResourceLink = {
  label: string;
  url: string | null;
};

export type NewsItem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  department: string;
  category: string;
  publishedAt: string;
  effectiveAt: string | null;
  expiresAt: string | null;
  status: ContentStatus;
  priority: Priority;
  pinned: boolean;
  actionNeeded: boolean;
  actionText: string | null;
  contact: string;
  resourceLinks: ResourceLink[];
  image: string | null;
  imageAlt: string | null;
};

export type EventItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  category: string;
  department: string;
  location: string;
  description: string;
  link: string | null;
  priority: Priority;
  status: ContentStatus;
};

export type ResourceItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  department: string;
  destinationUrl: string | null;
  featured: boolean;
  resourceType: string;
  status: ContentStatus;
};

export type Department = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  ownerLabel: string;
  active: boolean;
  displayOrder: number;
  accent: string;
};

export type SearchResult = {
  id: string;
  type: "News" | "Upcoming" | "Department" | "Resource";
  title: string;
  description: string;
  meta: string;
  href: string;
};
