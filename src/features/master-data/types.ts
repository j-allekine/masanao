export type UnitField = "name" | "abbreviation";

export type UnitFieldErrors = Partial<Record<UnitField | "form", string[]>>;

export type UnitListItem = {
  id: string;
  name: string;
  abbreviation: string;
  active: boolean;
};

export type UnitCreateResult =
  | { ok: true; unit: UnitListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate";
      error: string;
      fields: UnitFieldErrors;
    };

export type UnitUpdateResult =
  | { ok: true; unit: UnitListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate" | "not-found";
      error: string;
      fields: UnitFieldErrors;
    };

export type UnitLifecycleResult =
  | { ok: true; unit: UnitListItem }
  | {
      ok: false;
      kind: "forbidden" | "not-found";
      error: string;
    };

export type UnitDeleteResult =
  | { ok: true }
  | {
      ok: false;
      kind: "forbidden" | "not-found" | "referenced";
      error: string;
    };

export type UnitFormActionState =
  | { status: "success"; unit: UnitListItem }
  | {
      status: "error";
      kind:
        | "authentication"
        | "forbidden"
        | "validation"
        | "duplicate"
        | "not-found"
        | "server";
      error: string;
      fields: UnitFieldErrors;
    };

export type UnitLifecycleActionState =
  | { status: "success"; unit: UnitListItem }
  | {
      status: "error";
      kind: "authentication" | "forbidden" | "not-found" | "server";
      error: string;
    };

export type UnitDeleteActionState =
  | { status: "success" }
  | {
      status: "error";
      kind:
        | "authentication"
        | "forbidden"
        | "not-found"
        | "referenced"
        | "server";
      error: string;
    };

export type CategoryField = "name" | "description";

export type CategoryFieldErrors = Partial<
  Record<CategoryField | "form", string[]>
>;

export type CategoryListItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategoryCreateResult =
  | { ok: true; category: CategoryListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate";
      error: string;
      fields: CategoryFieldErrors;
    };

export type CategoryUpdateResult =
  | { ok: true; category: CategoryListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate" | "not-found";
      error: string;
      fields: CategoryFieldErrors;
    };

export type CategoryLifecycleResult =
  | { ok: true; category: CategoryListItem }
  | {
      ok: false;
      kind: "forbidden" | "not-found";
      error: string;
    };

export type CategoryDeleteResult =
  | { ok: true }
  | {
      ok: false;
      kind: "forbidden" | "not-found" | "referenced";
      error: string;
    };

export type CategoryFormActionState =
  | { status: "success"; category: CategoryListItem }
  | {
      status: "error";
      kind:
        | "authentication"
        | "forbidden"
        | "validation"
        | "duplicate"
        | "not-found"
        | "server";
      error: string;
      fields: CategoryFieldErrors;
    };

export type CategoryLifecycleActionState =
  | { status: "success"; category: CategoryListItem }
  | {
      status: "error";
      kind: "authentication" | "forbidden" | "not-found" | "server";
      error: string;
    };

export type CategoryDeleteActionState =
  | { status: "success" }
  | {
      status: "error";
      kind:
        | "authentication"
        | "forbidden"
        | "not-found"
        | "referenced"
        | "server";
      error: string;
    };
