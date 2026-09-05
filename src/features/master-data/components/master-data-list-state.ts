export const masterDataTabs = [
  { id: "units", label: "Units", disabled: false },
  { id: "categories", label: "Categories", disabled: true },
  { id: "offices", label: "Offices", disabled: true },
  { id: "vendors", label: "Vendors", disabled: false },
] as const;

export type MasterDataTab = (typeof masterDataTabs)[number]["id"];

export function isEnabledMasterDataTab(value: string): value is MasterDataTab {
  return masterDataTabs.some((tab) => tab.id === value && !tab.disabled);
}

export function parseMasterDataTab(value: string | null): MasterDataTab {
  return (
    masterDataTabs.find((tab) => tab.id === value && !tab.disabled)?.id ??
    "units"
  );
}

export function parseMasterDataPage(value: string | null) {
  if (!value) return 1;

  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getMasterDataListState(initialQuery: string) {
  const params = new URLSearchParams(initialQuery);

  return {
    tab: parseMasterDataTab(params.get("tab")),
    search: params.get("search") ?? "",
    page: parseMasterDataPage(params.get("page")),
  };
}

export function getMasterDataQuery(
  currentQuery: string,
  updates: { tab?: MasterDataTab; search?: string; page?: number },
) {
  const params = new URLSearchParams(currentQuery);

  if (updates.tab !== undefined) {
    params.set("tab", updates.tab);
  }

  if (updates.search !== undefined) {
    if (updates.search === "") {
      params.delete("search");
    } else {
      params.set("search", updates.search);
    }
  }

  if (updates.page !== undefined) {
    if (updates.page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(updates.page));
    }
  }

  return params.toString();
}

export function getMasterDataUrl(
  pathname: string,
  currentQuery: string,
  updates: { tab?: MasterDataTab; search?: string; page?: number },
) {
  const query = getMasterDataQuery(currentQuery, updates);
  return `${pathname}${query ? `?${query}` : ""}`;
}
