"use client";

// UI prototype: three greenfield login compositions, switchable via ?variant= on /prototype/login.

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  type FormEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import styles from "./login-prototype.module.css";

const variants = ["A", "B", "C"] as const;
type VariantKey = (typeof variants)[number];

const variantNames: Record<VariantKey, string> = {
  A: "Split rail",
  B: "Quiet ledger",
  C: "Kitchen story",
};

type LoginPrototypeProps = {
  initialVariant: VariantKey;
};

type LoginFieldsProps = {
  idPrefix: string;
  usernameRef: RefObject<HTMLInputElement | null>;
  username: string;
  password: string;
  passwordVisible: boolean;
  usernameError: boolean;
  passwordError: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  disabled?: boolean;
};

type LoginFormProps = LoginFieldsProps & {
  buttonLabel: string;
  successMessage: string;
  isSubmitting: boolean;
  isSignedIn: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className={cn(styles.brandMark, inverted && styles.brandMarkInverted)}>
      <span className={styles.brandGlyph} aria-hidden="true">
        M
      </span>
      <span className={styles.brandWords}>
        <strong>MASANAO</strong>
        <small>Municipal operations</small>
      </span>
    </div>
  );
}

function LoginFields({
  idPrefix,
  usernameRef,
  username,
  password,
  passwordVisible,
  usernameError,
  passwordError,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  disabled = false,
}: LoginFieldsProps) {
  return (
    <FieldGroup className={styles.formFields}>
      <Field
        className={styles.field}
        data-invalid={usernameError || undefined}
        data-disabled={disabled || undefined}
      >
        <FieldLabel className={styles.fieldLabel} htmlFor={`${idPrefix}-username`}>
          Username
        </FieldLabel>
        <InputGroup className={styles.inputGroup}>
          <InputGroupInput
            id={`${idPrefix}-username`}
            ref={usernameRef}
            name="username"
            type="text"
            autoComplete="username"
            spellCheck={false}
            placeholder="Enter your assigned username"
            value={username}
            disabled={disabled}
            aria-invalid={usernameError || undefined}
            aria-describedby={usernameError ? `${idPrefix}-username-error` : `${idPrefix}-username-note`}
            onChange={(event) => onUsernameChange(event.target.value)}
          />
          <InputGroupAddon className={styles.inputAddon} align="inline-start">
            <UserRound aria-hidden="true" />
          </InputGroupAddon>
        </InputGroup>
        {usernameError ? (
          <FieldError className={styles.fieldError} id={`${idPrefix}-username-error`}>
            Enter your username.
          </FieldError>
        ) : (
          <FieldDescription className={styles.fieldDescription} id={`${idPrefix}-username-note`}>
            Assigned by a system administrator.
          </FieldDescription>
        )}
      </Field>

      <Field
        className={styles.field}
        data-invalid={passwordError || undefined}
        data-disabled={disabled || undefined}
      >
        <FieldLabel className={styles.fieldLabel} htmlFor={`${idPrefix}-password`}>
          Password
        </FieldLabel>
        <InputGroup className={styles.inputGroup}>
          <InputGroupInput
            id={`${idPrefix}-password`}
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            disabled={disabled}
            aria-invalid={passwordError || undefined}
            aria-describedby={passwordError ? `${idPrefix}-password-error` : `${idPrefix}-password-note`}
            onChange={(event) => onPasswordChange(event.target.value)}
          />
          <InputGroupAddon className={styles.inputAddon} align="inline-start">
            <LockKeyhole aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupAddon className={styles.inputAction} align="inline-end">
            <InputGroupButton
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              aria-pressed={passwordVisible}
              size="icon-sm"
              onClick={onTogglePassword}
              disabled={disabled}
            >
              {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {passwordError ? (
          <FieldError className={styles.fieldError} id={`${idPrefix}-password-error`}>
            Enter your password.
          </FieldError>
        ) : (
          <FieldDescription className={styles.fieldDescription} id={`${idPrefix}-password-note`}>
            Use the password assigned to your local account.
          </FieldDescription>
        )}
      </Field>
    </FieldGroup>
  );
}

function LoginForm({
  buttonLabel,
  successMessage,
  isSubmitting,
  isSignedIn,
  onSubmit,
  ...fieldProps
}: LoginFormProps) {
  const submitLabel = isSubmitting ? "Checking access" : isSignedIn ? "Access granted" : buttonLabel;

  return (
    <form
      className={styles.loginForm}
      onSubmit={onSubmit}
      noValidate
      aria-busy={isSubmitting}
      data-state={isSignedIn ? "success" : isSubmitting ? "loading" : "idle"}
    >
      <LoginFields {...fieldProps} disabled={isSubmitting || isSignedIn} />

      {successMessage ? (
        <p className={styles.successMessage} role="status" aria-live="polite">
          <CheckCircle2 aria-hidden="true" />
          <span>{successMessage}</span>
        </p>
      ) : null}

      <Button className={styles.submitButton} type="submit" size="lg" disabled={isSubmitting || isSignedIn}>
        <span>{submitLabel}</span>
        {isSubmitting ? (
          <LoaderCircle className={styles.loadingIcon} data-icon="inline-end" aria-hidden="true" />
        ) : (
          <ArrowRight data-icon="inline-end" aria-hidden="true" />
        )}
      </Button>
    </form>
  );
}

function VariantA(props: LoginFormProps) {
  return (
    <section className={cn(styles.variant, styles.variantA)} aria-labelledby="variant-a-title">
      <aside className={styles.aRail}>
        <div className={styles.aRailTop}>
          <BrandMark inverted />
          <span className={styles.railLabel}>STAFF ACCESS</span>
        </div>

        <div className={styles.aCopy}>
          <p className={styles.eyebrowLight}>MASANAO MUNICIPAL KITCHEN</p>
          <h1>Start the service day with a clear handoff.</h1>
          <p>Access the local workspace for activities, supplies, and accountable records.</p>
        </div>

        <div className={styles.aRailFooter}>
          <div className={styles.aSignal}>
            <ShieldCheck aria-hidden="true" />
            <span>Administrator-managed accounts</span>
          </div>
          <Separator className={styles.aSeparator} />
          <p>Need access? Contact your system administrator.</p>
        </div>
      </aside>

      <div className={styles.aFormPanel}>
        <div className={styles.aFormContent}>
          <div className={styles.aFormHeader}>
            <div>
              <p className={styles.eyebrow}>LOCAL ACCOUNT</p>
              <h2 id="variant-a-title">Welcome back.</h2>
              <p>Sign in with the username assigned to your local account.</p>
            </div>
            <div className={styles.secureBadge}>
              <ShieldCheck aria-hidden="true" />
              <span>Secure access</span>
            </div>
          </div>

          <LoginForm {...props} buttonLabel="Sign in" />

          <div className={styles.aFormFooter}>
            <div className={styles.footerNote}>
              <CheckCircle2 aria-hidden="true" />
              <span>No email or external sign-in required.</span>
            </div>
            <p>Masanao keeps daily work close to the people doing it.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function VariantB(props: LoginFormProps) {
  return (
    <section className={cn(styles.variant, styles.variantB)} aria-labelledby="variant-b-title">
      <header className={styles.bHeader}>
        <BrandMark />
        <span className={styles.bHeaderMeta}>LOCAL DEPLOYMENT / STAFF ONLY</span>
      </header>

      <main className={styles.bMain}>
        <div className={styles.bContext}>
          <p className={styles.eyebrow}>YOUR DAILY WORKSPACE</p>
          <h1 id="variant-b-title">Good work needs a shared starting point.</h1>
          <p>Sign in to see the work that keeps service moving across Masanao.</p>
        </div>

        <div className={styles.bSheet}>
          <div className={styles.bSheetTop}>
            <div>
              <p className={styles.eyebrow}>SIGN IN</p>
              <h2>Access your workspace</h2>
            </div>
            <KeyRound aria-hidden="true" />
          </div>
          <LoginForm {...props} buttonLabel="Continue" />
          <p className={styles.bSheetNote}>There is no self-registration or password recovery on this screen.</p>
        </div>

        <aside className={styles.bAside}>
          <Separator className={styles.bAsideSeparator} />
          <p className={styles.eyebrow}>KEEP IT LOCAL</p>
          <p>One account connects the people coordinating food, supplies, and service records.</p>
          <div className={styles.bAsideList}>
            <div>
              <span>01</span>
              <strong>Activities</strong>
            </div>
            <div>
              <span>02</span>
              <strong>Supplies</strong>
            </div>
            <div>
              <span>03</span>
              <strong>Records</strong>
            </div>
          </div>
        </aside>
      </main>

      <footer className={styles.bFooter}>
        <span>Municipal operations system</span>
        <span>Accounts are assigned by an administrator.</span>
      </footer>
    </section>
  );
}

function VariantC(props: LoginFormProps) {
  return (
    <section className={cn(styles.variant, styles.variantC)} aria-labelledby="variant-c-title">
      <div className={styles.cImageStage}>
        <Image
          src="/images/municipal-kitchen-login-v2.png"
          alt="A municipal kitchen worker preparing leafy vegetables beside a large cooking pot."
          fill
          priority
          sizes="(max-width: 768px) 100vw, 58vw"
          className={styles.cImage}
        />
        <div className={styles.cImageScrim} aria-hidden="true" />

        <div className={styles.cStageContent}>
          <div className={styles.cBrandBar}>
            <BrandMark inverted />
            <span className={styles.railLabel}>COMMUNITY SERVICE</span>
          </div>

          <div className={styles.cCopy}>
            <p className={styles.eyebrowLight}>THE PEOPLE BEHIND SERVICE</p>
            <h1 id="variant-c-title">
              Make the next <span>handoff count.</span>
            </h1>
            <p>Plan service, track supplies, and keep accountable movement in one place.</p>
          </div>

          <div className={styles.cPromise}>
            <ClipboardCheck aria-hidden="true" />
            <div>
              <strong>Ready for the next handoff</strong>
              <span>Assigned work and service records stay together.</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.cFormPanel}>
        <div className={styles.cFormContent}>
          <div className={styles.cFormHeader}>
            <p className={styles.eyebrow}>LOCAL ACCOUNT</p>
            <h2>Welcome back.</h2>
            <p>Enter the account assigned to you by the municipal administrator.</p>
          </div>

          <LoginForm {...props} buttonLabel="Enter workspace" />

          <div className={styles.cAccessNote}>
            <UserRoundCog aria-hidden="true" />
            <span>Need access or a password reset? Contact your administrator.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrototypeSwitcher({
  current,
  onChange,
}: {
  current: VariantKey;
  onChange: (key: VariantKey) => void;
}) {
  if (process.env.NODE_ENV === "production") return null;

  const currentIndex = variants.indexOf(current);
  const previous = variants[(currentIndex - 1 + variants.length) % variants.length];
  const next = variants[(currentIndex + 1) % variants.length];

  return (
    <nav className={styles.switcher} aria-label="Login prototype variants">
      <Button
        aria-label={`Previous variant: ${previous}`}
        size="icon"
        variant="outline"
        onClick={() => onChange(previous)}
      >
        <ArrowLeft aria-hidden="true" />
      </Button>
      <div className={styles.switcherLabel}>
        <span>LOGIN PROTOTYPE</span>
        <strong>
          {current}: {variantNames[current]}
        </strong>
      </div>
      <Button
        aria-label={`Next variant: ${next}`}
        size="icon"
        variant="outline"
        onClick={() => onChange(next)}
      >
        <ArrowRight aria-hidden="true" />
      </Button>
      <span className={styles.switcherHint}>Use left and right arrows</span>
    </nav>
  );
}

export default function LoginPrototype({ initialVariant }: LoginPrototypeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [variant, setVariant] = useState<VariantKey>(initialVariant);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorFields, setErrorFields] = useState({ username: false, password: false });
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success">("idle");
  const usernameRef = useRef<HTMLInputElement>(null);
  const submitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimerRef.current !== null) window.clearTimeout(submitTimerRef.current);
    };
  }, []);

  const changeVariant = useCallback(
    (nextVariant: VariantKey) => {
      setVariant(nextVariant);
      const params = new URLSearchParams(window.location.search);
      params.set("variant", nextVariant);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, [contenteditable='true']") ||
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
      ) {
        return;
      }

      const currentIndex = variants.indexOf(variant);
      const offset = event.key === "ArrowLeft" ? -1 : 1;
      const nextVariant = variants[(currentIndex + offset + variants.length) % variants.length];
      event.preventDefault();
      changeVariant(nextVariant);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [changeVariant, variant]);

  function resetFieldError(field: "username" | "password") {
    setErrorFields((current) => ({ ...current, [field]: false }));
    if (submitState !== "idle") setSubmitState("idle");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = {
      username: !username.trim(),
      password: !password,
    };
    setErrorFields(nextErrors);

    if (nextErrors.username || nextErrors.password) {
      setSubmitState("idle");
      usernameRef.current?.focus();
      return;
    }

    setSubmitState("submitting");
    submitTimerRef.current = window.setTimeout(() => setSubmitState("success"), 520);
  }

  const formProps: LoginFormProps = {
    idPrefix: variant.toLowerCase(),
    usernameRef,
    username,
    password,
    passwordVisible,
    usernameError: errorFields.username,
    passwordError: errorFields.password,
    onUsernameChange: (value) => {
      setUsername(value);
      resetFieldError("username");
    },
    onPasswordChange: (value) => {
      setPassword(value);
      resetFieldError("password");
    },
    onTogglePassword: () => setPasswordVisible((visible) => !visible),
    buttonLabel: "Sign in",
    successMessage: submitState === "success" ? `Local session ready for ${username.trim()}.` : "",
    isSubmitting: submitState === "submitting",
    isSignedIn: submitState === "success",
    onSubmit: handleSubmit,
  };

  return (
    <main className={styles.prototypeShell}>
      <a className={styles.skipLink} href={`#${variant.toLowerCase()}-username`}>
        Skip to sign-in form
      </a>
      {variant === "A" ? <VariantA {...formProps} /> : null}
      {variant === "B" ? <VariantB {...formProps} /> : null}
      {variant === "C" ? <VariantC {...formProps} /> : null}
      <PrototypeSwitcher current={variant} onChange={changeVariant} />
    </main>
  );
}
