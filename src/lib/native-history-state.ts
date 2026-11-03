/** Let Next integrate a native URL write while preserving other history owners. */
export function getNativeHistoryState(state: unknown): Record<string, unknown> {
  const data = state && typeof state === "object" ? { ...state } as Record<string, unknown> : {};
  delete data.__NA;
  delete data._N;
  return data;
}
