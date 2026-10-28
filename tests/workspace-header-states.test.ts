import { createElement, Fragment, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/sidebar", () => ({ SidebarTrigger: () => createElement("button", { "aria-label": "Toggle Sidebar" }) }));
vi.mock("@/components/workspace/workspace-shell", () => ({ default: ({ children }: { children: ReactNode }) => createElement(Fragment, null, children) }));
import WorkspaceRouteLoading from "@/components/workspace/workspace-route-loading";
import WorkspaceRouteError from "@/components/workspace/workspace-route-error";
import type { WorkspaceSectionId } from "@/lib/workspace-navigation";

const sections: [WorkspaceSectionId, string][] = [["overview", "Dashboard"], ["activity-designs", "Planning"], ["items", "Supply Operations"], ["recipes", "Supply Operations"], ["purchase-orders", "Supply Operations"], ["master-data", "Master Data"]];
describe("workspace orientation during route transitions", () => {
  it.each(sections)("keeps %s loading and error identity consistent", (activeSection, label) => {
    const loading = renderToStaticMarkup(createElement(WorkspaceRouteLoading, { activeSection }));
    const failed = renderToStaticMarkup(createElement(WorkspaceRouteError, { activeSection, error: new Error("Unavailable"), reset: () => {} }));
    for (const markup of [loading, failed]) {
      expect(markup.match(/data-slot="workspace-header"/g)).toHaveLength(1);
      expect(markup).toContain(`>${label}</p>`);
      expect(markup.match(/aria-label="Toggle Sidebar"/g)).toHaveLength(1);
    }
    expect(failed).toContain("Retry");
  });
});
