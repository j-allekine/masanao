export type ActivityDesignField =
  | "activityDesignNo"
  | "fiscalYear"
  | "title"
  | "officeName"
  | "aipReferenceCode";

export type FieldErrors = Partial<Record<ActivityDesignField | "form", string[]>>;

export type ActivityField =
  | "name"
  | "particulars"
  | "scheduledDate"
  | "venue"
  | "plannedParticipantCount"
  | "plannedBudgetCentavos";

export type ActivityFieldErrors = Partial<
  Record<ActivityField | "form", string[]>
>;

export type ActivityDesignListItem = {
  id: string;
  activityDesignNo: string;
  fiscalYear: number;
  title: string;
  officeName: string;
  aipReferenceCode: string | null;
  activityCount: number;
};

export type ActivityListItem = {
  id: string;
  activityDesignId: string;
  name: string;
  particulars: string | null;
  scheduledDate: string;
  venue: string | null;
  plannedParticipantCount: number | null;
  plannedBudgetCentavos: number | null;
  mealScheduleCount: number;
};

export type ActivityDesignDetail = ActivityDesignListItem & {
  activities: ActivityListItem[];
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

export type ActivityDesignUpdateResult =
  | {
      ok: true;
      activityDesign: ActivityDesignListItem;
    }
  | {
      ok: false;
      kind: "validation" | "duplicate" | "not-found";
      error: string;
      fields: FieldErrors;
    };

export type ActivityDesignDeleteResult =
  | { ok: true }
  | {
      ok: false;
      kind: "not-found" | "has-activities";
      error: string;
      activityCount?: number;
    };

export type ActivityCreateResult =
  | {
      ok: true;
      activity: ActivityListItem;
    }
  | {
      ok: false;
      kind: "validation" | "not-found";
      error: string;
      fields: ActivityFieldErrors;
    };

export type ActivityDesignUpdateActionState =
  | { status: "success"; activityDesign: ActivityDesignListItem }
  | {
      status: "error";
      error: string;
      fields: FieldErrors;
    };

export type ActivityDesignDeleteActionState =
  | { status: "success" }
  | { status: "error"; error: string };

export type ActivityDesignActionState =
  | { status: "idle" }
  | { status: "success" }
  | {
      status: "error";
      error: string;
      fields: FieldErrors;
    };

export type ActivityActionState =
  | { status: "success"; activity: ActivityListItem }
  | {
      status: "error";
      error: string;
      fields: ActivityFieldErrors;
    };
