export type ItemLookupCategory = {
  id: string;
  name: string;
  isActive: boolean;
};

export type ItemLookupUnit = {
  id: string;
  name: string;
  abbreviation: string;
  active: boolean;
};

// These aliases describe lookup data as it is consumed by Items; the owning
// Master Data feature remains responsible for maintaining the records.
export type CategoryListItem = ItemLookupCategory & {
  description: string | null;
  createdAt: string;
  updatedAt: string;
};
export type UnitListItem = ItemLookupUnit;

export type ItemListItem = {
  id: string;
  name: string;
  category: ItemLookupCategory;
  baseUnit: ItemLookupUnit;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ItemField = "name" | "categoryId" | "baseUnitId" | "note";
export type ItemFieldErrors = Partial<Record<ItemField | "form", string[]>>;

export type ItemCreateResult =
  | { ok: true; item: ItemListItem }
  | { ok: false; kind: "forbidden" | "validation" | "duplicate"; error: string; fields: ItemFieldErrors };

export type ItemUpdateResult =
  | { ok: true; item: ItemListItem }
  | { ok: false; kind: "forbidden" | "validation" | "duplicate" | "not-found"; error: string; fields: ItemFieldErrors };

export type ItemLifecycleResult =
  | { ok: true; item: ItemListItem }
  | { ok: false; kind: "forbidden" | "not-found"; error: string };

export type ItemDeleteResult =
  | { ok: true }
  | { ok: false; kind: "forbidden" | "not-found" | "referenced"; error: string };

export type ItemFormActionState =
  | { status: "success"; item: ItemListItem }
  | {
      status: "error";
      kind: "authentication" | "forbidden" | "validation" | "duplicate" | "not-found" | "server";
      error: string;
      fields: ItemFieldErrors;
    };

export type ItemLifecycleActionState =
  | { status: "success"; item: ItemListItem }
  | { status: "error"; kind: "authentication" | "forbidden" | "not-found" | "server"; error: string };

export type ItemDeleteActionState =
  | { status: "success" }
  | { status: "error"; kind: "authentication" | "forbidden" | "not-found" | "referenced" | "server"; error: string };
