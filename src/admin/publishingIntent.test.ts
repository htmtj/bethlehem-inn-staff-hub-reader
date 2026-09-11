import { expect, it } from "vitest";
import { publishingIntent } from "./publishingIntent";
it("never turns the selected draft timing into a publish action", () => {
  expect(publishingIntent("draft")).toEqual({ status: "draft", label: "Save Draft" });
  expect(publishingIntent("scheduled")).toEqual({ status: "scheduled", label: "Schedule" });
  expect(publishingIntent("published")).toEqual({ status: "published", label: "Publish now" });
});
