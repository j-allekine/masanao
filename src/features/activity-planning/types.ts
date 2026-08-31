export type ActivityDesignField =
  | "activityDesignNo"
  | "fiscalYear"
  | "title"
  | "aipReferenceCode";

export type FieldErrors = Partial<Record<ActivityDesignField | "form", string[]>>;

export type ActivityField =
  | "name"
  | "officeName"
  | "particulars"
  | "scheduledDate"
  | "venue"
  | "plannedParticipantCount"
  | "plannedBudgetPesos";

export type ActivityFieldErrors = Partial<
  Record<ActivityField | "form", string[]>
>;

export type MealScheduleField = "label" | "mealTime" | "plannedServings";

export type MealScheduleFieldErrors = Partial<
  Record<MealScheduleField | "form", string[]>
>;

export type ActivityDesignListItem = {
  id: string;
  activityDesignNo: string;
  fiscalYear: number;
  title: string;
  aipReferenceCode: string | null;
  activityCount: number;
};

export type MealScheduleListItem = {
  id: string;
  activityId: string;
  label: string;
  mealTime: string;
  plannedServings: number | null;
};

export type ActivityListItem = {
  id: string;
  activityDesignId: string;
  name: string;
  officeName: string;
  particulars: string | null;
  scheduledDate: string;
  venue: string | null;
  plannedParticipantCount: number | null;
  plannedBudgetCentavos: string | null;
  mealScheduleCount: number;
  mealSchedules: MealScheduleListItem[];
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

export type ActivityUpdateResult =
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

export type ActivityDeleteResult =
  | { ok: true }
  | {
      ok: false;
      kind: "not-found" | "has-meal-schedules";
      error: string;
      mealScheduleCount?: number;
    };

export type MealScheduleCreateResult =
  | {
      ok: true;
      mealSchedule: MealScheduleListItem;
    }
  | {
      ok: false;
      kind: "validation" | "not-found";
      error: string;
      fields: MealScheduleFieldErrors;
    };

export type MealScheduleUpdateResult =
  | {
      ok: true;
      mealSchedule: MealScheduleListItem;
    }
  | {
      ok: false;
      kind: "validation" | "not-found";
      error: string;
      fields: MealScheduleFieldErrors;
    };

export type MealScheduleDeleteResult =
  | { ok: true }
  | {
      ok: false;
      kind: "not-found" | "has-issuance-record";
      error: string;
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
  | {
      status: "error";
      kind: "not-found" | "has-activities";
      error: string;
      activityCount?: number;
    };

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

export type ActivityUpdateActionState =
  | { status: "success"; activity: ActivityListItem }
  | {
      status: "error";
      error: string;
      fields: ActivityFieldErrors;
    };

export type ActivityDeleteActionState =
  | { status: "success" }
  | { status: "error"; error: string };

export type MealScheduleActionState =
  | { status: "success"; mealSchedule: MealScheduleListItem }
  | {
      status: "error";
      error: string;
      fields: MealScheduleFieldErrors;
    };

export type MealScheduleDeleteActionState =
  | { status: "success" }
  | { status: "error"; error: string };
