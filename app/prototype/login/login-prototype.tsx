"use client";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CircleCheck,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { type FormEvent, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

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
        <span className={styles.fieldHint}>Assigned by an administrator</span>
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
          placeholder="e.g. m.alvarez…"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
        />
      </div>

      <label className={styles.fieldLabel} htmlFor={`${idPrefix}-password`}>
        <span>Password</span>
        <span className={styles.fieldHint}>Your permanent account password</span>
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
          placeholder="Enter your password…"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        <button
          className={styles.visibilityButton}
          type="button"
          onClick={onTogglePassword}
          aria-label={passwordVisible ? "Hide password" : "Show password"}
          aria-pressed={passwordVisible}
        >
          {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}

function Feedback({ id, message }: { id: string; message: string }) {
  if (!message) return null;

  return (
    <p id={id} className={styles.errorMessage} role="status" aria-live="polite">
      <span className={styles.errorDot} aria-hidden="true" />
      {message}
    </p>
  );
}

type FormProps = Omit<LoginFieldsProps, "theme"> & {
  theme: LoginFieldsProps["theme"];
  buttonLabel: string;
  feedback: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function LoginForm({
  theme,
  buttonLabel,
  feedback,
  onSubmit,
  ...fieldProps
}: FormProps) {
  return (
    <form
      id={`${fieldProps.idPrefix}-login-form`}
      className={styles.loginForm}
      onSubmit={onSubmit}
      noValidate
    >
      <LoginFields theme={theme} {...fieldProps} />
      <Feedback id={`${fieldProps.idPrefix}-error`} message={feedback} />
      <button className={styles.submitButton} type="submit">
        <span>{buttonLabel}</span>
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
            See What <em>Needs Doing.</em>
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
        <span>v0.1 local access</span>
      </footer>
    </section>
  );
}

function VariantC(props: FormProps) {
  return (
    <section className={`${styles.variant} ${styles.variantC}`} aria-labelledby="variant-c-title">
      <div className={styles.cFrame}>
        <div className={styles.cWelcomePanel}>
          <div className={styles.cTopline}>
            <span className={styles.prototypePill}>PROTOTYPE / C</span>
            <span className={styles.cStatus}><span aria-hidden="true" />SYSTEM READY</span>
          </div>
          <div className={styles.cWelcomeCopy}>
            <div className={styles.cMark} aria-hidden="true">
              <Building2 />
            </div>
            <p className={styles.eyebrow}>MASANAO OPERATIONS</p>
            <h1 id="variant-c-title">
              Ready when
              <br />
              <span>you are.</span>
            </h1>
            <p>Tools for the people who keep the work moving.</p>
          </div>
          <div className={styles.cTrustBlock}>
            <div className={styles.cTrustIcon}>
              <Check aria-hidden="true" />
            </div>
            <div>
              <strong>Managed local access</strong>
              <span>Accounts are created and maintained by your administrator.</span>
            </div>
          </div>
        </div>

        <div className={styles.cFormPanel}>
          <BrandMark />
          <div className={styles.cFormHeading}>
            <p className={styles.eyebrow}>SIGN IN</p>
            <h2>Welcome to Masanao</h2>
            <p>Use your assigned username and password.</p>
          </div>
          <LoginForm {...props} theme="dark" buttonLabel="Enter workspace" />
          <p className={styles.cBottomNote}>If you need an account change, contact an administrator.</p>
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
  const usernameRef = useRef<HTMLInputElement>(null);

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
    setFeedback("Check your username and password, or contact an administrator.");
    usernameRef.current?.focus();
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
    },
    onPasswordChange: (value) => {
      setPassword(value);
      setFeedback("");
    },
    onTogglePassword: () => setPasswordVisible((visible) => !visible),
    buttonLabel: variant === "A" ? "Sign In" : variant === "B" ? "Sign In" : "Enter Workspace",
    feedback,
    onSubmit: handleSubmit,
  };

  return (
    <main className={styles.prototypeShell}>
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
