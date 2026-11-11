import type { FormFeedback } from "@/components/workspace/form-feedback";

type IdentityField = "name" | "abbreviation";

export function duplicateIdentityFeedback(
  error: string,
  fields: Partial<Record<IdentityField, string[]>>,
): FormFeedback<IdentityField> {
  const conflictField = fields.name?.length ? "name" : fields.abbreviation?.length ? "abbreviation" : undefined;
  return {
    message: `${error} Enter a different ${conflictField ?? "name or abbreviation"}.`,
    fields: conflictField ? [conflictField] : undefined,
  };
}
