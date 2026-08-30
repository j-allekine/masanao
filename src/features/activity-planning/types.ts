export type ActivityDesignField =
  | "activityDesignNo"
  | "fiscalYear"
  | "title"
  | "officeName"
  | "aipReferenceCode";

export type FieldErrors = Partial<Record<ActivityDesignField | "form", string[]>>;

export type ActivityDesignListItem = {
  id: string;
  activityDesignNo: string;
  fiscalYear: number;
  title: string;
  officeName: string;
  aipReferenceCode: string | null;
  activityCount: number;
};

export type ActivityDesignCreateResult =
  | {
      ok: true;
      activityDesign: ActivityDesignListItem;
    }
  | {
      ok: false;
      kind: "validation" | "duplicate";
      error: string;
      fields: FieldErrors;
    };

export type ActivityDesignActionState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      error: string;
      fields: FieldErrors;
    };
