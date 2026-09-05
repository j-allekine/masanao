export type UnitField = "name" | "abbreviation";

export type UnitFieldErrors = Partial<Record<UnitField | "form", string[]>>;

export type OfficeField =
  | "name"
  | "abbreviation"
  | "headName"
  | "headDesignation"
  | "officialEmail"
  | "contactNumber";

export type OfficeFieldErrors = Partial<Record<OfficeField | "form", string[]>>;

export type UnitListItem = {
  id: string;
  name: string;
  abbreviation: string;
  active: boolean;
};

export type OfficeListItem = {
  id: string;
  name: string;
  abbreviation: string | null;
  headName: string | null;
  headDesignation: string | null;
  officialEmail: string | null;
  contactNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OfficeCreateResult =
  | { ok: true; office: OfficeListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate";
      error: string;
      fields: OfficeFieldErrors;
    };

export type OfficeUpdateResult =
  | { ok: true; office: OfficeListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate" | "not-found";
      error: string;
      fields: OfficeFieldErrors;
    };

export type OfficeFormActionState =
  | { status: "success"; office: OfficeListItem }
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
      fields: OfficeFieldErrors;
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
