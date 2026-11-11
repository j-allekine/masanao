import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

import { KEEP_SAVED_OFFICE, type ActivityOfficeOption } from "../../types";

export default function ActivityOfficePicker({
  offices,
  savedOfficeName,
  value,
  error,
  onChange,
}: {
  offices: ActivityOfficeOption[];
  savedOfficeName?: string;
  value: string;
  error?: string[];
  onChange: (id: string) => void;
}) {
  const hasError = Boolean(error?.length);
  const errorId = "officeId-error";
  const emptyId = "officeId-empty";
  const hasOffices = offices.length > 0;
  const options = savedOfficeName === undefined
    ? offices
    : [{ id: KEEP_SAVED_OFFICE, name: savedOfficeName }, ...offices];
  const selected = options.find((office) => office.id === value) ?? null;
  const describedBy = [
    hasError ? errorId : null,
    hasOffices ? null : emptyId,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <Field data-invalid={hasError}>
      <FieldLabel htmlFor="officeId" required>
        Office
      </FieldLabel>
      <Combobox
        items={options}
        value={selected}
        itemToStringLabel={(office) => office.name}
        itemToStringValue={(office) => office.id}
        isItemEqualToValue={(office, selection) => office.id === selection.id}
        onValueChange={(office) => {
          if (office) onChange(office.id);
        }}
      >
        <ComboboxInput
          id="officeId"
          aria-label="Office"
          aria-required="true"
          aria-invalid={hasError}
          aria-describedby={describedBy}
          placeholder="Search active Offices"
        />
        <ComboboxContent>
          <ComboboxEmpty>
            {hasOffices ? "No active Offices match your search." : "No active Offices available."}
          </ComboboxEmpty>
          <ComboboxList>
            {(office: ActivityOfficeOption) => (
              <ComboboxItem key={office.id} value={office} className="wrap-anywhere">
                {office.id === KEEP_SAVED_OFFICE ? `Keep saved Office · ${office.name}` : office.name}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {!hasOffices ? (
        <FieldDescription id={emptyId}>
          No active Offices are available. Ask an administrator to add or reactivate an Office in Master Data.
        </FieldDescription>
      ) : null}
      {hasError ? (
        <FieldError
          id={errorId}
          visuallyHidden={value === ""}
          errors={error?.map((message) => ({ message }))}
        />
      ) : null}
    </Field>
  );
}
