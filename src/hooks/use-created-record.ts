"use client";

import { useMemo, useState } from "react";

/** Keep a successful creation visible while the server refresh is in flight. */
export function useCreatedRecord<T extends { id: string }>(serverRecords: T[]) {
  const [createdRecord, setCreatedRecord] = useState<T | null>(null);
  const records = useMemo(
    () => createdRecord && !serverRecords.some((record) => record.id === createdRecord.id)
      ? [...serverRecords, createdRecord]
      : serverRecords,
    [createdRecord, serverRecords],
  );

  // Retire the bridge once acknowledged; later deletion must not resurrect it.
  if (createdRecord && serverRecords.some((record) => record.id === createdRecord.id)) {
    setCreatedRecord(null);
  }

  return { records, setCreatedRecord };
}
