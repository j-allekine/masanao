import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  WorkspacePrimaryAction,
  WorkspacePrimaryLink,
} from "@/components/workspace/catalog-controls";
import { WorkspaceFormActionButtons } from "@/components/workspace/form-actions";

describe("workspace action controls", () => {
  it("uses the shared large primary treatment for buttons and links", () => {
    const button = renderToStaticMarkup(
      createElement(WorkspacePrimaryAction, { onClick: vi.fn() }, "Create Item"),
    );
    const link = renderToStaticMarkup(
      createElement(
        WorkspacePrimaryLink,
        {
          href: "/recipes/new",
          fullWidth: true,
          icon: createElement("span", { "data-icon": "inline-start" }),
        },
        "Create Recipe",
      ),
    );

    expect(button).toContain('type="button"');
    expect(button).toContain("h-9");
    expect(button).toContain("w-full sm:w-auto");
    expect(link).toContain('href="/recipes/new"');
    expect(link).toContain("h-9");
    expect(link).toContain("w-full sm:w-auto");
    expect(link).toContain('data-icon="inline-start"');
  });

  it("keeps cancel and submit states consistent while work is pending", () => {
    const markup = renderToStaticMarkup(
      createElement(WorkspaceFormActionButtons, {
        onCancel: vi.fn(),
        isPending: true,
        submitLabel: "Save changes",
        pendingLabel: "Saving…",
      }),
    );

    expect(markup).toContain("Cancel");
    expect(markup).toContain("Saving…");
    expect(markup.match(/<button[^>]*disabled=""/g)).toHaveLength(2);
    expect(markup).not.toContain("Save changes");
  });
});
