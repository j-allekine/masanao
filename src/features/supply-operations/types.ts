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
  unitConversions?: ItemUnitConversionListItem[];
};

export type ItemUnitConversionListItem = {
  id: string;
  alternateUnit: ItemLookupUnit;
  baseUnitQuantity: string;
  label: string;
};

export type ItemUnitConversionField = "alternateUnitId" | "baseUnitQuantity";
export type ItemUnitConversionFieldErrors = Partial<
  Record<ItemUnitConversionField | "form", string[]>
>;

export type ItemUnitConversionCreateResult =
  | { ok: true; conversion: ItemUnitConversionListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate" | "not-found" | "inactive";
      error: string;
      fields: ItemUnitConversionFieldErrors;
    };

export type ItemUnitConversionActionState =
  | { status: "success"; conversion: ItemUnitConversionListItem }
  | {
      status: "error";
      kind: "authentication" | "forbidden" | "validation" | "duplicate" | "not-found" | "inactive" | "server";
      error: string;
      fields: ItemUnitConversionFieldErrors;
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

export type PurchaseOrderListItem = {
  id: string;
  purchaseOrderNo: string;
  vendor: {
    id: string;
    name: string;
    isActive: boolean;
  };
  referenceNumber: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderField =
  | "purchaseOrderNo"
  | "vendorId"
  | "referenceNumber"
  | "note";

export type PurchaseOrderFieldErrors = Partial<
  Record<PurchaseOrderField | "form", string[]>
>;

export type PurchaseOrderVendorOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export type PurchaseOrderCreateResult =
  | { ok: true; purchaseOrder: PurchaseOrderListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate" | "inactive";
      error: string;
      fields: PurchaseOrderFieldErrors;
    };

export type PurchaseOrderUpdateResult =
  | { ok: true; purchaseOrder: PurchaseOrderListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate" | "inactive" | "not-found";
      error: string;
      fields: PurchaseOrderFieldErrors;
    };

export type PurchaseOrderDeleteResult =
  | { ok: true }
  | {
      ok: false;
      kind: "forbidden" | "not-found" | "referenced";
      error: string;
    };

export type PurchaseOrderFormActionState =
  | { status: "success"; purchaseOrder: PurchaseOrderListItem }
  | {
      status: "error";
      kind:
        | "authentication"
        | "forbidden"
        | "validation"
        | "duplicate"
        | "inactive"
        | "not-found"
        | "server";
      error: string;
      fields: PurchaseOrderFieldErrors;
    };

export type PurchaseOrderDeleteActionState =
  | { status: "success" }
  | {
      status: "error";
      kind: "authentication" | "forbidden" | "not-found" | "referenced" | "server";
      error: string;
    };
