"use client";

import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  UserRoundCog,
  UserRound,
} from "lucide-react";
import {
  type FormEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import { prototypeTokenStyle } from "./login-prototype.tokens";
import styles from "./login-prototype.module.css";

const variants = ["A", "B", "C"] as const;
type VariantKey = (typeof variants)[number];

const variantNames: Record<VariantKey, string> = {
  A: "Civic desk",
  B: "Field brief",
  C: "Counter window",
};

type LoginPrototypeProps = {
  initialVariant: VariantKey;
};

type LoginFieldsProps = {
  idPrefix: string;
  theme: "light" | "dark" | "quiet";
  usernameRef: RefObject<HTMLInputElement | null>;
  hasError: boolean;
  username: string;
  password: string;
  passwordVisible: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  showFieldHints?: boolean;
  disabled?: boolean;
};

function BrandMark({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className={`${styles.brandMark} ${inverted ? styles.brandMarkInverted : ""}`}>
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
  theme,
  usernameRef,
  hasError,
  username,
  password,
  passwordVisible,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
  showFieldHints = true,
  disabled = false,
}: LoginFieldsProps) {
  const fieldClass = `${styles.formFields} ${
    theme === "dark"
      ? styles.formFieldsDark
      : theme === "quiet"
        ? styles.formFieldsQuiet
        : styles.formFieldsLight
  }`;

  return (
    <div className={fieldClass}>
      <label className={styles.fieldLabel} htmlFor={`${idPrefix}-username`}>
        <span>Username</span>
        {showFieldHints ? <span className={styles.fieldHint}>Assigned by an administrator</span> : null}
      </label>
      <div className={styles.inputShell}>
        <UserRound className={styles.inputIcon} aria-hidden="true" />
        <input
          id={`${idPrefix}-username`}
          ref={usernameRef}
          className={styles.input}
          name="username"
          type="text"
          autoComplete="username"
          spellCheck={false}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${idPrefix}-error` : undefined}
          disabled={disabled}
          placeholder="e.g. m.alvarez…"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
        />
      </div>

      <label className={styles.fieldLabel} htmlFor={`${idPrefix}-password`}>
        <span>Password</span>
        {showFieldHints ? <span className={styles.fieldHint}>Your permanent account password</span> : null}
      </label>
      <div className={styles.inputShell}>
        <LockKeyhole className={styles.inputIcon} aria-hidden="true" />
        <input
          id={`${idPrefix}-password`}
          className={`${styles.input} ${styles.passwordInput}`}
          name="password"
          type={passwordVisible ? "text" : "password"}
          autoComplete="current-password"
          spellCheck={false}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${idPrefix}-error` : undefined}
          disabled={disabled}
          placeholder="Enter your password…"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        <button
          className={styles.visibilityButton}
          type="button"
          onClick={onTogglePassword}
          disabled={disabled}
          aria-label={passwordVisible ? "Hide password" : "Show password"}
          aria-pressed={passwordVisible}
        >
          {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

function Feedback({ id, message, kind = "error" }: { id: string; message: string; kind?: "error" | "success" }) {
  if (!message) return null;

  return (
    <p
      id={id}
      className={kind === "success" ? styles.successMessage : styles.errorMessage}
      role={kind === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      {kind === "success" ? <CircleCheck aria-hidden="true" /> : <span className={styles.errorDot} aria-hidden="true" />}
      {message}
    </p>
  );
}

type FormProps = Omit<LoginFieldsProps, "theme"> & {
  theme: LoginFieldsProps["theme"];
  buttonLabel: string;
  feedback: string;
  successMessage: string;
  isSubmitting: boolean;
  isSignedIn: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function LoginForm({
  theme,
  buttonLabel,
  feedback,
  successMessage,
  isSubmitting,
  isSignedIn,
  onSubmit,
  ...fieldProps
}: FormProps) {
  const submitLabel = isSubmitting
    ? "Checking local access"
    : isSignedIn
      ? "Access granted"
      : buttonLabel;

  return (
    <form
      id={`${fieldProps.idPrefix}-login-form`}
      className={styles.loginForm}
      onSubmit={onSubmit}
      noValidate
      aria-busy={isSubmitting}
    >
      <LoginFields theme={theme} {...fieldProps} disabled={isSubmitting || isSignedIn} />
      <Feedback id={`${fieldProps.idPrefix}-error`} message={feedback} />
      <Feedback id={`${fieldProps.idPrefix}-success`} kind="success" message={successMessage} />
      <button className={styles.submitButton} type="submit" disabled={isSubmitting || isSignedIn}>
        <span>{submitLabel}</span>
        {isSubmitting ? <span className={styles.submitSpinner} aria-hidden="true" /> : null}
        <ArrowRight aria-hidden="true" />
      </button>
    </form>
  );
}

function VariantA(props: FormProps) {
  return (
    <section className={`${styles.variant} ${styles.variantA}`} aria-labelledby="variant-a-title">
      <aside className={styles.aRail}>
        <div className={styles.aRailTop}>
          <BrandMark inverted />
          <span className={styles.prototypePill}>PROTOTYPE / A</span>
        </div>

        <div className={styles.aMessage}>
          <p className={styles.eyebrow}>A calmer start to the day</p>
          <h1>Keep the municipality moving.</h1>
          <p>
            One local account for the people coordinating food, supplies, and service across
            Masanao.
          </p>
        </div>

        <div className={styles.aRailBottom}>
          <div className={styles.locationLine}>
            <MapPin aria-hidden="true" />
            <span>Masanao, Lanao del Sur</span>
          </div>
          <p className={styles.railNote}>Access is assigned and managed by trusted administrators.</p>
        </div>
      </aside>

      <div className={styles.aFormPanel}>
        <div className={styles.aFormHeader}>
          <div>
            <p className={styles.eyebrow}>STAFF ACCESS</p>
            <h2 id="variant-a-title">Welcome back.</h2>
            <p>Sign in with the username assigned to your local account.</p>
          </div>
          <div className={styles.secureBadge}>
            <ShieldCheck aria-hidden="true" />
            <span>Local &amp; secure</span>
          </div>
        </div>

        <LoginForm {...props} />

        <div className={styles.aFooter}>
          <div className={styles.footerCheck}>
            <CircleCheck aria-hidden="true" />
            <span>No email or external sign-in required</span>
          </div>
          <p>Need access? Ask your Masanao system administrator.</p>
        </div>
      </div>
    </section>
  );
}

function VariantB(props: FormProps) {
  return (
    <section className={`${styles.variant} ${styles.variantB}`} aria-labelledby="variant-b-title">
      <header className={styles.bTopbar}>
        <BrandMark />
        <div className={styles.bTopbarMeta}>
          <span>LOCAL DEPLOYMENT</span>
          <span className={styles.bTopbarRule} aria-hidden="true" />
          <span>STAFF ONLY</span>
        </div>
      </header>

      <div className={styles.bContent}>
        <div className={styles.bStatement}>
          <span className={styles.prototypePillDark}>PROTOTYPE / B</span>
          <p className={styles.bKicker}>Your daily field brief starts here</p>
          <h1 id="variant-b-title">
            Sign In.
            <br />
            See What <span>Needs Doing.</span>
          </h1>
          <p className={styles.bDescription}>
            Masanao gives local teams a shared view of the work happening now. Use your assigned
            credentials to continue.
          </p>
          <div className={styles.bPrinciples}>
            <div>
              <span className={styles.bPrincipleNumber}>01</span>
              <span>Simple local access</span>
            </div>
            <div>
              <span className={styles.bPrincipleNumber}>02</span>
              <span>Managed by administrators</span>
            </div>
          </div>
        </div>

        <div className={styles.bFormColumn}>
          <div className={styles.bFormHeading}>
            <div className={styles.bFormIcon}>
              <KeyRound aria-hidden="true" />
            </div>
            <div>
              <p className={styles.eyebrow}>ENTER CREDENTIALS</p>
              <h2>Access Your Workspace</h2>
            </div>
          </div>
          <LoginForm {...props} theme="quiet" buttonLabel="Sign In" />
          <p className={styles.bPrivacyNote}>
            Your username is the only identifier used to sign in. There is no self-registration or
            password recovery on this screen.
          </p>
        </div>
      </div>

      <footer className={styles.bFooter}>
        <span>Masanao / Municipal operations system</span>
        <span>Administrator-managed accounts</span>
      </footer>
    </section>
  );
}

function VariantC(props: FormProps) {
  return (
    <section className={`${styles.variant} ${styles.variantC}`} aria-labelledby="variant-c-title">
      <div className={styles.cFrame}>
        <div className={styles.cWelcomePanel}>
          <div className={styles.cVisual}>
            <Image
              src="/images/municipal-kitchen-login-v2.png"
              alt="A municipal kitchen worker preparing leafy vegetables beside a large cooking pot."
              fill
              priority
              sizes="(max-width: 720px) 100vw, 32vw"
              className={styles.cVisualImage}
            />
            <div className={styles.cVisualShade} aria-hidden="true" />
            <div className={styles.cVisualCaption} aria-hidden="true">
              <span>COMMUNITY KITCHEN</span>
              <span>DAILY SERVICE / 01</span>
            </div>
          </div>
          <div className={styles.cWelcomeCopy}>
            <p className={styles.eyebrow}>COMMUNITY KITCHEN · DAILY SERVICE</p>
            <h1 id="variant-c-title">
              Make the next <span>handoff count.</span>
            </h1>
            <p>Plan service, track supplies, and keep every accountable movement moving.</p>
          </div>
          <div className={styles.cTrustBlock}>
            <div className={styles.cTrustIcon}>
              <ClipboardCheck aria-hidden="true" />
            </div>
            <div>
              <strong>Ready for the next handoff</strong>
              <span>Assigned work, supplies, and service records stay in one place.</span>
            </div>
          </div>
        </div>

        <div className={styles.cFormPanel}>
          <div
            className={`${styles.cFormContent} ${
              props.isSubmitting ? styles.cFormContentSubmitting : ""
            } ${props.isSignedIn ? styles.cFormContentSignedIn : ""}`}
          >
            <div className={styles.cFormHeading}>
              <p className={styles.eyebrow}>LOCAL ACCOUNT ACCESS</p>
              <h2>Your work starts here.</h2>
              <p>Enter the account assigned to you by the municipal administrator.</p>
            </div>
            <LoginForm {...props} showFieldHints={false} theme="dark" buttonLabel="Sign in" />
            <div className={styles.cAccessNote}>
              <div className={styles.cAccessIcon} aria-hidden="true">
                <UserRoundCog />
              </div>
              <span>Need access or a password reset? Contact your administrator.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrototypeSwitcher({ current, onChange }: { current: VariantKey; onChange: (key: VariantKey) => void }) {
  if (process.env.NODE_ENV === "production") return null;

  const currentIndex = variants.indexOf(current);
  const previous = variants[(currentIndex - 1 + variants.length) % variants.length];
  const next = variants[(currentIndex + 1) % variants.length];

  return (
    <nav className={styles.switcher} aria-label="Login prototype variants">
      <button type="button" onClick={() => onChange(previous)} aria-label={`Previous variant: ${previous}`}>
        <ArrowLeft aria-hidden="true" />
      </button>
      <div className={styles.switcherLabel}>
        <span>LOGIN PROTOTYPE</span>
        <strong>
          {current} <i aria-hidden="true">·</i> {variantNames[current]}
        </strong>
      </div>
      <button type="button" onClick={() => onChange(next)} aria-label={`Next variant: ${next}`}>
        <ArrowRight aria-hidden="true" />
      </button>
      <span className={styles.switcherHint}>← → compare</span>
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
  const [feedback, setFeedback] = useState("");
  const [submitState, setSubmitState] = useState<"idle" | "submitting" | "success">("idle");
  const usernameRef = useRef<HTMLInputElement>(null);
  const submitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (submitTimerRef.current !== null) window.clearTimeout(submitTimerRef.current);
    };
  }, []);

  const changeVariant = useCallback((nextVariant: VariantKey) => {
    setVariant(nextVariant);
    const params = new URLSearchParams(window.location.search);
    params.set("variant", nextVariant);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router]);

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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setSubmitState("idle");
      setFeedback("Enter your username and password to continue.");
      usernameRef.current?.focus();
      return;
    }

    setFeedback("");
    setSubmitState("submitting");
    submitTimerRef.current = window.setTimeout(() => setSubmitState("success"), 480);
  }

  const formProps: FormProps = {
    idPrefix: variant.toLowerCase(),
    theme: variant === "C" ? "dark" : variant === "B" ? "quiet" : "light",
    usernameRef,
    hasError: Boolean(feedback),
    username,
    password,
    passwordVisible,
    onUsernameChange: (value) => {
      setUsername(value);
      setFeedback("");
      setSubmitState("idle");
    },
    onPasswordChange: (value) => {
      setPassword(value);
      setFeedback("");
      setSubmitState("idle");
    },
    onTogglePassword: () => setPasswordVisible((visible) => !visible),
    buttonLabel: variant === "A" ? "Sign In" : variant === "B" ? "Sign In" : "Enter Workspace",
    feedback,
    successMessage: submitState === "success" ? `Local session ready for ${username.trim()}.` : "",
    isSubmitting: submitState === "submitting",
    isSignedIn: submitState === "success",
    onSubmit: handleSubmit,
  };

  return (
    <main className={styles.prototypeShell} style={prototypeTokenStyle}>
      <a className={styles.skipLink} href={`#${variant.toLowerCase()}-login-form`}>
        Skip to sign-in form
      </a>
      {variant === "A" && <VariantA {...formProps} />}
      {variant === "B" && <VariantB {...formProps} />}
      {variant === "C" && <VariantC {...formProps} />}
      <PrototypeSwitcher current={variant} onChange={changeVariant} />
    </main>
  );
}
