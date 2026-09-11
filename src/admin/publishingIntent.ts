export function publishingIntent(status: "draft" | "scheduled" | "published") {
  return { status, label: status === "draft" ? "Save Draft" : status === "scheduled" ? "Schedule" : "Publish now" };
}
