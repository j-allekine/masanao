export type UnitField = "name" | "abbreviation";

export type UnitFieldErrors = Partial<Record<UnitField | "form", string[]>>;

export type UnitListItem = {
  id: string;
  name: string;
  abbreviation: string;
  active: boolean;
};

export type VendorListItem = {
  id: string;
  name: string;
  contactPerson: string | null;
  contactNumber: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
};

export type VendorField =
  | "name"
  | "contactPerson"
  | "contactNumber"
  | "email"
  | "address";

export type VendorFieldErrors = Partial<Record<VendorField | "form", string[]>>;

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

export type VendorCreateResult =
  | { ok: true; vendor: VendorListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate";
      error: string;
      fields: VendorFieldErrors;
    };

export type VendorUpdateResult =
  | { ok: true; vendor: VendorListItem }
  | {
      ok: false;
      kind: "forbidden" | "validation" | "duplicate" | "not-found";
      error: string;
      fields: VendorFieldErrors;
    };

export type VendorFormActionState =
  | { status: "success"; vendor: VendorListItem }
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
      fields: VendorFieldErrors;
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
