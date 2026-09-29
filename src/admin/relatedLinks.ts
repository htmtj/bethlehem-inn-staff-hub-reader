type RelatedLink = { label: string; url: string | null };

/** The editor exposes the first link; an unrelated edit must preserve the others. */
export function updatePrimaryLink(existing: RelatedLink[], label: string, url: string): RelatedLink[] {
  return [
    ...(url ? [{ label: label || "Open resource", url }] : []),
    ...existing.slice(1),
  ];
}
