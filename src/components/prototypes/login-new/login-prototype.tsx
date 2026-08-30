"use client"

import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Separator } from "@/components/ui/separator"

const variants = [
  { key: "A", name: "Split entry" },
  { key: "B", name: "Quiet desk" },
  { key: "C", name: "Focused gate" },
] as const

type LoginVariant = (typeof variants)[number]["key"]
type LoginStatus = "idle" | "loading" | "success" | "error"

type LoginFormProps = {
  heading: string
  description: string
  headingId?: string
  className?: string
  compact?: boolean
}

function BrandLockup({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={
          inverse
            ? "flex size-10 items-center justify-center rounded-md bg-masanao-primary-soft text-masanao-primary-strong"
            : "flex size-10 items-center justify-center rounded-md bg-masanao-primary text-masanao-on-primary"
        }
      >
        <ShieldCheck aria-hidden="true" size={20} strokeWidth={1.7} />
      </span>
      <span className={inverse ? "text-masanao-on-primary" : "text-masanao-ink"}>
        <span className="block text-sm font-semibold tracking-tight">Masanao</span>
        <span
          className={
            inverse
              ? "block text-xs text-masanao-primary-soft"
              : "block text-xs text-masanao-ink-muted"
          }
        >
          Municipal Kitchen
        </span>
      </span>
    </div>
  )
}

function PrototypeMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span
      className={
        inverse
          ? "rounded-pill border border-masanao-primary-soft/30 px-2.5 py-1 text-xs font-medium text-masanao-primary-soft"
          : "rounded-pill border border-masanao-border bg-masanao-surface px-2.5 py-1 text-xs font-medium text-masanao-ink-muted"
      }
    >
      Prototype
    </span>
  )
}

function LoginForm({ heading, description, headingId, className, compact = false }: LoginFormProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<LoginStatus>("idle")
  const [supportOpen, setSupportOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const usernameInvalid = status === "error" && !username.trim()
  const passwordInvalid = status === "error" && !password
  const isLoading = status === "loading"

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSupportOpen(false)

    if (!username.trim() || !password) {
      setStatus("error")
      return
    }

    setStatus("loading")
    timerRef.current = setTimeout(() => {
      setStatus("success")
    }, 650)
  }

  function resetForm() {
    setUsername("")
    setPassword("")
    setStatus("idle")
    setSupportOpen(false)
  }

  return (
    <form className={className} onSubmit={handleSubmit} aria-busy={isLoading}>
      <div className="flex flex-col gap-2">
        <h2 id={headingId} className="text-masanao-h1 font-semibold tracking-masanao-h1">
          {heading}
        </h2>
        <p className="max-w-[42ch] text-sm leading-6 text-masanao-ink-muted">{description}</p>
      </div>

      <FieldGroup className={compact ? "mt-7 gap-4" : "mt-8 gap-5"}>
        <Field data-invalid={usernameInvalid ? "true" : undefined}>
          <FieldLabel htmlFor="prototype-username">Username</FieldLabel>
          <InputGroup className="h-11 bg-masanao-surface">
            <InputGroupAddon>
              <LockKeyhole aria-hidden="true" size={16} strokeWidth={1.7} />
            </InputGroupAddon>
            <InputGroupInput
              id="prototype-username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="Enter your username"
              value={username}
              aria-invalid={usernameInvalid || undefined}
              onChange={(event) => {
                setUsername(event.target.value)
                if (status === "error") setStatus("idle")
              }}
            />
          </InputGroup>
          {usernameInvalid ? (
            <FieldError>Enter your username.</FieldError>
          ) : (
            <FieldDescription>Use the username issued for your municipal account.</FieldDescription>
          )}
        </Field>

        <Field data-invalid={passwordInvalid ? "true" : undefined}>
          <FieldLabel htmlFor="prototype-password">Password</FieldLabel>
          <InputGroup className="h-11 bg-masanao-surface">
            <InputGroupAddon>
              <LockKeyhole aria-hidden="true" size={16} strokeWidth={1.7} />
            </InputGroupAddon>
            <InputGroupInput
              id="prototype-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              aria-invalid={passwordInvalid || undefined}
              onChange={(event) => {
                setPassword(event.target.value)
                if (status === "error") setStatus("idle")
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <EyeOff aria-hidden="true" strokeWidth={1.7} />
                ) : (
                  <Eye aria-hidden="true" strokeWidth={1.7} />
                )}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {passwordInvalid ? (
            <FieldError>Enter your password.</FieldError>
          ) : (
            <FieldDescription>Keep your account details private.</FieldDescription>
          )}
        </Field>
      </FieldGroup>

      {status === "success" ? (
        <div
          className="mt-6 flex items-start gap-3 rounded-md border border-masanao-success bg-masanao-success-soft p-3 text-sm text-masanao-success-ink"
          role="status"
        >
          <Check aria-hidden="true" className="mt-0.5 shrink-0" size={16} strokeWidth={2} />
          <div className="flex flex-col gap-1">
            <span className="font-semibold">Access preview ready.</span>
            <span>This prototype does not send your entries or create a session.</span>
          </div>
        </div>
      ) : null}

      {supportOpen ? (
        <p
          className="mt-6 flex items-start gap-2 rounded-md border border-masanao-info bg-masanao-info-soft p-3 text-sm leading-5 text-masanao-info-ink"
          role="status"
        >
          <CircleHelp aria-hidden="true" className="mt-0.5 shrink-0" size={16} strokeWidth={1.7} />
          <span>In the product, access help can point staff to their administrator.</span>
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-3">
        <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <LoaderCircle aria-hidden="true" data-icon="inline-start" className="animate-spin" />
          ) : (
            <ArrowRight aria-hidden="true" data-icon="inline-end" />
          )}
          {isLoading ? "Checking access" : status === "success" ? "Continue again" : "Continue"}
        </Button>
        {status === "success" ? (
          <Button type="button" variant="outline" size="lg" className="w-full" onClick={resetForm}>
            Start over
          </Button>
        ) : null}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 text-sm">
        <span className="text-masanao-ink-muted">Need help with access?</span>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 py-0"
          onClick={() => setSupportOpen((open) => !open)}
        >
          Contact an administrator
        </Button>
      </div>
    </form>
  )
}

function VariantA() {
  return (
    <main className="min-h-[100dvh] bg-masanao-canvas text-masanao-ink">
      <div className="grid min-h-[100dvh] lg:grid-cols-[minmax(0,1.1fr)_minmax(28rem,0.9fr)]">
        <section className="relative min-h-[20rem] overflow-hidden bg-masanao-primary-strong sm:min-h-[24rem] lg:min-h-[100dvh]">
          <Image
            src="/images/login-prototype-kitchen.png"
            alt="A municipal kitchen worktable prepared for the day"
            fill
            priority
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover object-center opacity-60"
          />
          <div className="absolute inset-0 bg-masanao-primary-strong/75" aria-hidden="true" />
          <div className="relative flex min-h-[20rem] flex-col justify-between gap-6 p-6 sm:min-h-[24rem] sm:gap-12 sm:p-10 lg:min-h-[100dvh] lg:p-12">
            <div className="flex items-start justify-between gap-6">
              <BrandLockup inverse />
              <PrototypeMark inverse />
            </div>
            <div className="max-w-xl text-masanao-on-primary">
              <p className="max-w-[18ch] text-4xl font-medium leading-[1.05] tracking-[-0.06em] sm:text-5xl">
                Start with a clear view of today.
              </p>
              <p className="mt-5 max-w-[38ch] text-base leading-7 text-masanao-primary-soft">
                Activities, supplies, deliveries, and issuances stay close to the work.
              </p>
              <div className="mt-10 grid max-w-sm grid-cols-2 gap-5 border-t border-masanao-primary-soft/30 pt-5">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-masanao-primary-soft">For</span>
                  <span className="text-sm font-medium">Municipal kitchen staff</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-masanao-primary-soft">Access</span>
                  <span className="text-sm font-medium">Assigned accounts</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-masanao-primary-soft">Masanao Municipal Kitchen</p>
          </div>
        </section>

        <section className="flex items-center bg-masanao-surface px-6 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <LoginForm
              heading="Sign in to Masanao"
              description="Use your assigned account to continue to municipal operations."
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function VariantB() {
  return (
    <main className="min-h-[100dvh] bg-masanao-canvas text-masanao-ink">
      <div className="mx-auto flex min-h-[100dvh] max-w-6xl flex-col px-6 py-6 sm:px-10 sm:py-8">
        <header className="flex items-center justify-between border-b border-masanao-border pb-5">
          <BrandLockup />
          <PrototypeMark />
        </header>

        <div className="grid flex-1 grid-cols-1 gap-12 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,28rem)] lg:items-start lg:gap-24 lg:py-10">
          <section className="max-w-xl lg:pt-6" aria-labelledby="quiet-desk-heading">
            <h1
              id="quiet-desk-heading"
              className="max-w-[12ch] text-4xl font-medium leading-[1.05] tracking-[-0.06em] sm:text-5xl"
            >
              Start with today&apos;s work.
            </h1>
            <p className="mt-6 max-w-[42ch] text-base leading-7 text-masanao-ink-muted">
              One account for the daily records that keep a municipal kitchen moving.
            </p>

            <div className="mt-10 max-w-md" aria-label="What staff can access">
              <div className="flex items-start gap-4 py-3">
                <span className="font-mono text-xs text-masanao-secondary-ink">01</span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">Today&apos;s activities</span>
                  <span className="text-sm leading-6 text-masanao-ink-muted">See what needs attention now.</span>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-4 py-3">
                <span className="font-mono text-xs text-masanao-secondary-ink">02</span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">Supply records</span>
                  <span className="text-sm leading-6 text-masanao-ink-muted">Review deliveries and current stock.</span>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-4 py-3">
                <span className="font-mono text-xs text-masanao-secondary-ink">03</span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-semibold">Accountability</span>
                  <span className="text-sm leading-6 text-masanao-ink-muted">Keep posted records easy to trace.</span>
                </div>
              </div>
            </div>
          </section>

          <section className="border-l border-masanao-border pl-0 lg:pl-12" aria-labelledby="desk-form-heading">
            <LoginForm
              heading="Welcome back"
              description="Sign in with the account assigned to your role."
              headingId="desk-form-heading"
              compact
            />
          </section>
        </div>

        <footer className="flex flex-col gap-2 border-t border-masanao-border pt-5 text-xs text-masanao-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Access is limited to assigned municipal accounts.</span>
          <span className="font-mono">Local operations access</span>
        </footer>
      </div>
    </main>
  )
}

function VariantC() {
  return (
    <main className="min-h-[100dvh] bg-masanao-primary-strong p-4 text-masanao-ink sm:p-8 lg:p-12">
      <div className="grid min-h-[calc(100dvh-2rem)] overflow-hidden rounded-lg bg-masanao-surface lg:min-h-[calc(100dvh-6rem)] lg:grid-cols-[minmax(15rem,0.68fr)_minmax(26rem,1fr)]">
        <section className="flex flex-col justify-between gap-12 bg-masanao-primary-strong p-6 text-masanao-on-primary sm:p-10 lg:p-12">
          <div className="flex items-start justify-between gap-6">
            <BrandLockup inverse />
            <PrototypeMark inverse />
          </div>
          <div>
            <LockKeyhole aria-hidden="true" size={28} strokeWidth={1.5} className="text-masanao-primary-soft" />
            <h1 className="mt-7 max-w-[12ch] text-4xl font-medium leading-[1.05] tracking-[-0.06em]">
              Sign in to keep work moving.
            </h1>
            <p className="mt-5 max-w-[31ch] text-base leading-7 text-masanao-primary-soft">
              A focused entry point for the people who plan, receive, issue, and account for food supplies.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-masanao-primary-soft">
            <Check aria-hidden="true" size={15} strokeWidth={2} />
            <span>Secure account access</span>
          </div>
        </section>

        <section className="flex items-center px-6 py-12 sm:px-12 lg:px-20" aria-labelledby="gate-form-heading">
          <div className="mx-auto w-full max-w-md">
            <LoginForm
              heading="Enter your account"
              description="Your role determines the records and actions available after sign in."
              headingId="gate-form-heading"
            />
          </div>
        </section>
      </div>
    </main>
  )
}

function PrototypeSwitcher({ current }: { current: LoginVariant }) {
  const router = useRouter()
  const pathname = usePathname()
  const currentIndex = Math.max(
    variants.findIndex((variant) => variant.key === current),
    0,
  )

  const move = useCallback(
    (direction: -1 | 1) => {
      const nextIndex = (currentIndex + direction + variants.length) % variants.length
      const params = new URLSearchParams(window.location.search)
      params.set("variant", variants[nextIndex].key)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [currentIndex, pathname, router],
  )

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault()
        move(-1)
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        move(1)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [move])

  if (process.env.NODE_ENV === "production") {
    return null
  }

  const activeVariant = variants[currentIndex]

  return (
    <nav
      aria-label="Login prototype variants"
      className="fixed bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-pill border border-masanao-primary-strong bg-masanao-surface-raised p-1.5 text-masanao-ink shadow-[0_10px_30px_rgba(22,69,56,0.16)]"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Show previous login variant"
        onClick={() => move(-1)}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <span className="min-w-32 px-2 text-center text-xs font-medium">
        {activeVariant.key} <span className="text-masanao-ink-muted">{activeVariant.name}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Show next login variant"
        onClick={() => move(1)}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </nav>
  )
}

export default function LoginPrototype({ initialVariant }: { initialVariant: LoginVariant }) {
  return (
    <>
      {initialVariant === "A" ? <VariantA /> : null}
      {initialVariant === "B" ? <VariantB /> : null}
      {initialVariant === "C" ? <VariantC /> : null}
      <PrototypeSwitcher current={initialVariant} />
    </>
  )
}
