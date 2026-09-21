"use client";

import SharedLocalDatePicker from "@/components/workspace/local-date-picker";

export default function LocalDatePicker({
  id,
  value,
  error,
  required = false,
  onChange,
}: {
  id: string;
  value: string;
  error?: string[];
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return <SharedLocalDatePicker id={id} name="scheduledDate" label="Scheduled date" emptyLabel="Select scheduled date" value={value} error={error} required={required} onChange={onChange} />;
}
