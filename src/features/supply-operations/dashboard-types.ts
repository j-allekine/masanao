export type DashboardPeriod = { start: string; end: string };
export type DashboardBudgetActivity = {
  id: string; name: string; office: string; date: string; href: string;
  budget: string | null; cost: string | null; variance: string | null; used: string | null;
  pendingMeals: number; reconstructed: boolean; mealCount: number;
};
export type DashboardBudgets = {
  search: string;
  rows: DashboardBudgetActivity[]; page: number; pageCount: number; pageSize: number; total: number;
  summary: { budget: string; cost: string; variance: string; comparable: number; excluded: number; reconstructed: boolean };
};
export type DashboardReport = {
  period: DashboardPeriod; generatedAt: string; sampleData: boolean;
  budgets: DashboardBudgets;
};
export type DashboardResult =
  | { ok: true; report: DashboardReport }
  | { ok: false; kind: "forbidden" | "validation"; error: string; period: DashboardPeriod };
