export type FormFeedback<Field extends string> = {
  message: string;
  fields?: readonly Field[];
};

export function clearFeedbackForField<Field extends string>(
  feedback: FormFeedback<Field> | null,
  field: Field,
): FormFeedback<Field> | null {
  if (!feedback?.fields) return null;
  if (!feedback.fields.includes(field)) return feedback;

  const remaining = feedback.fields.filter((affectedField) => affectedField !== field);
  return remaining.length ? { ...feedback, fields: remaining } : null;
}
