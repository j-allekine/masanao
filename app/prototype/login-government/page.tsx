import GovernmentLoginPrototype from "./government-login-prototype";

const variants = ["A", "B", "C"] as const;
type VariantKey = (typeof variants)[number];

function isVariant(value: string | string[] | undefined): value is VariantKey {
  return typeof value === "string" && variants.includes(value as VariantKey);
}

export default async function GovernmentLoginPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string | string[] | undefined }>;
}) {
  const requestedVariant = (await searchParams).variant;
  const initialVariant = isVariant(requestedVariant) ? requestedVariant : "A";

  return <GovernmentLoginPrototype initialVariant={initialVariant} />;
}
