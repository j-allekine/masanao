import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/separator", () => ({
  Separator: () => createElement("span", { "data-testid": "separator" }),
}));

vi.mock("@/components/ui/sidebar", () => ({
  SidebarTrigger: () =>
    createElement("button", {
      type: "button",
      "aria-label": "Open sidebar",
    }),
}));

vi.mock("@/features/activity-planning/components/activity-designs-workspace", () => ({
  default: () =>
    createElement("div", { "data-testid": "activity-designs-workspace" }),
}));

import ActivityDesignsContent from "@/features/activity-planning/components/activity-designs-content";

function renderActivityDesignsContent() {
  return renderToStaticMarkup(
    createElement(ActivityDesignsContent, { initialActivityDesigns: [] }),
  );
}

describe("Activity Designs header", () => {
  it("does not expose a page-level Notifications control or unread marker", () => {
    const markup = renderActivityDesignsContent();

    expect(markup).not.toContain("Notifications");
    expect(markup).not.toContain("Unread notifications");
    expect(markup.match(/<button/g) ?? []).toHaveLength(1);
  });

  it("retains the sidebar trigger and Planning identity", () => {
    const markup = renderActivityDesignsContent();

    expect(markup).toContain('aria-label="Open sidebar"');
    expect(markup).toContain("Planning");
    expect(markup).toContain(
      "Plan upcoming municipal activities.",
    );
  });
});
