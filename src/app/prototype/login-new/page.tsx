import LoginPrototype from "./login-prototype"

const validVariants = ["A", "B", "C"] as const
type LoginVariant = (typeof validVariants)[number]

function getVariant(value: string | string[] | undefined): LoginVariant {
  const candidate = Array.isArray(value) ? value[0] : value
  return validVariants.includes(candidate as LoginVariant)
    ? (candidate as LoginVariant)
    : "A"
}

export const metadata = {
  title: "Login prototype | Masanao",
  description: "Throwaway login page concepts for Masanao Municipal Kitchen.",
}

export default async function LoginPrototypePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams

  return <LoginPrototype initialVariant={getVariant(params.variant)} />
}
