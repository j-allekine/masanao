"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  Eye,
  EyeOff,
  FileCheck2,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import styles from "./government-login-prototype.module.css";

const variants = ["A", "B", "C"] as const;
type VariantKey = (typeof variants)[number];

const variantNames: Record<VariantKey, string> = {
  A: "Municipal portal",
  B: "Service desk",
  C: "Operations office",
};

type GovernmentLoginPrototypeProps = {
  initialVariant: VariantKey;
};

type LoginFieldsProps = {
  idPrefix: string;
  dark?: boolean;
  username: string;
  password: string;
  passwordVisible: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
};

type LoginFormProps = LoginFieldsProps & {
  buttonLabel: string;
  feedback: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function MunicipalMark({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <div className={`${styles.municipalMark} ${inverted ? styles.municipalMarkInverted : ""} ${compact ? styles.municipalMarkCompact : ""}`}>
      <span className={styles.seal} aria-hidden="true">
        <span>M</span>
      </span>
      <span className={styles.municipalWords}>
        <strong>MASANAO</strong>
        <span>Municipal Operations</span>
      </span>
    </div>
  );
}

function LoginFields({
  idPrefix,
  dark = false,
  username,
  password,
  passwordVisible,
  onUsernameChange,
  onPasswordChange,
  onTogglePassword,
}: LoginFieldsProps) {
  return (
    <div className={`${styles.govFields} ${dark ? styles.govFieldsDark : ""}`}>
      <label className={styles.govLabel} htmlFor={`${idPrefix}-username`}>
        <span>Username</span>
      </label>
      <div className={styles.govInputShell}>
        <UserRound className={styles.govInputIcon} aria-hidden="true" />
        <input
          id={`${idPrefix}-username`}
          className={styles.govInput}
          name="username"
          autoComplete="username"
          placeholder="Enter assigned username"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
        />
      </div>

      <label className={styles.govLabel} htmlFor={`${idPrefix}-password`}>
        <span>Password</span>
      </label>
      <div className={styles.govInputShell}>
        <LockKeyhole className={styles.govInputIcon} aria-hidden="true" />
        <input
          id={`${idPrefix}-password`}
          className={`${styles.govInput} ${styles.govPasswordInput}`}
          name="password"
          type={passwordVisible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Enter assigned password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
        <button
          className={styles.govVisibilityButton}
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

function LoginForm({
  buttonLabel,
  feedback,
  onSubmit,
  ...fieldProps
}: LoginFormProps) {
  return (
    <form className={styles.govForm} onSubmit={onSubmit} noValidate>
      <LoginFields {...fieldProps} />
      {feedback && (
        <p className={styles.govError} role="alert">
          <span aria-hidden="true" />
          The username or password is incorrect.
        </p>
      )}
      <button className={styles.govSubmit} type="submit">
        <span>{buttonLabel}</span>
        <ArrowRight aria-hidden="true" />
      </button>
    </form>
  );
}

function VariantA(props: LoginFormProps) {
  return (
    <section className={`${styles.govVariant} ${styles.govVariantA}`} aria-labelledby="gov-a-title">
      <header className={styles.aHeader}>
        <MunicipalMark />
        <div className={styles.aHeaderMeta}>
          <span>LOCAL GOVERNMENT OPERATIONS</span>
          <span className={styles.headerDivider} aria-hidden="true" />
          <span>OFFICIAL SYSTEM ACCESS</span>
        </div>
      </header>

      <div className={styles.aBody}>
        <div className={styles.aIntro}>
          <div className={styles.aSealLarge} aria-hidden="true">
            <Landmark />
            <span>MO</span>
          </div>
          <p className={styles.govOverline}>MASANAO MUNICIPAL OPERATIONS</p>
          <h1 id="gov-a-title">
            Public service,
            <br />
            <strong>organized.</strong>
          </h1>
          <p className={styles.aDescription}>
            The internal workspace for coordinating municipal supplies, people, and service.
          </p>
          <div className={styles.aNotice}>
            <ShieldCheck aria-hidden="true" />
            <span>Authorized personnel only. Access is managed by your administrator.</span>
          </div>
        </div>

        <div className={styles.aCard}>
          <div className={styles.cardTopline}>
            <span>STAFF SIGN-IN</span>
            <span>01 / 03</span>
          </div>
          <h2>Welcome back</h2>
          <p>Use your assigned username and password to continue.</p>
          <LoginForm {...props} buttonLabel="Sign in to Masanao" />
          <div className={styles.cardRule} aria-hidden="true" />
          <div className={styles.cardFoot}>
            <BadgeCheck aria-hidden="true" />
            <span>Municipal account · Internal use</span>
          </div>
        </div>
      </div>

      <footer className={styles.aFooter}>
        <span>Masanao, Lanao del Sur</span>
        <span>Masanao Municipal Operations System</span>
      </footer>
    </section>
  );
}

function VariantB(props: LoginFormProps) {
  return (
    <section className={`${styles.govVariant} ${styles.govVariantB}`} aria-labelledby="gov-b-title">
      <aside className={styles.bRail}>
        <MunicipalMark inverted />
        <div className={styles.bOfficeBlock}>
          <p className={styles.bRailOverline}>OFFICE OF THE MUNICIPAL ADMINISTRATOR</p>
          <h1>One office.</h1>
          <h1>One shared record.</h1>
          <p>Tools for the people responsible for keeping municipal work moving.</p>
        </div>
        <div className={styles.bDocumentMeta}>
          <span>PERSONNEL ACCESS</span>
          <strong>FORM MO-01</strong>
          <span>REV. 2026</span>
        </div>
      </aside>

      <div className={styles.bWorkspace}>
        <div className={styles.bBreadcrumb}>
          <span>MASANAO MUNICIPAL OPERATIONS</span>
          <span aria-hidden="true">/</span>
          <strong>SYSTEM ACCESS</strong>
        </div>

        <div className={styles.bSheet}>
          <div className={styles.sheetHeader}>
            <div>
              <p className={styles.govOverline}>AUTHORIZED PERSONNEL</p>
              <h2 id="gov-b-title">Sign in to the operations system</h2>
            </div>
            <FileCheck2 aria-hidden="true" />
          </div>
          <p className={styles.sheetLead}>Enter the credentials issued to you by your administrator.</p>
          <div className={styles.sheetRule} aria-hidden="true" />
          <LoginForm {...props} dark buttonLabel="Access system" />
          <div className={styles.bAssistant}>
            <Check aria-hidden="true" />
            <span>Account creation and password resets are handled by administrators.</span>
          </div>
        </div>

        <div className={styles.bBottomLine}>
          <span>Internal municipal service</span>
          <span>Username and password access</span>
        </div>
      </div>
    </section>
  );
}

function VariantC(props: LoginFormProps) {
  return (
    <section className={`${styles.govVariant} ${styles.govVariantC}`} aria-labelledby="gov-c-title">
      <header className={styles.cHeader}>
        <MunicipalMark compact />
        <div className={styles.cHeaderLabel}>
          <span>LOCAL GOVERNMENT UNIT</span>
          <strong>SECURE PERSONNEL ACCESS</strong>
        </div>
      </header>

      <div className={styles.cBody}>
        <div className={styles.cTitleBlock}>
          <div className={styles.cTitleBadge} aria-hidden="true">
            <Building2 />
          </div>
          <p className={styles.govOverline}>MUNICIPAL OPERATIONS OFFICE</p>
          <h1 id="gov-c-title">Your work matters to the whole municipality.</h1>
          <p>Access the shared system for records, supplies, and daily coordination.</p>
          <div className={styles.cServiceList}>
            <div><span>01</span><strong>Coordinate</strong><small>Keep teams aligned</small></div>
            <div><span>02</span><strong>Account</strong><small>Keep records clear</small></div>
            <div><span>03</span><strong>Serve</strong><small>Keep work moving</small></div>
          </div>
        </div>

        <div className={styles.cFormCard}>
          <div className={styles.cFormHeader}>
            <div>
              <p className={styles.govOverline}>OFFICIAL ACCESS</p>
              <h2>Staff sign-in</h2>
            </div>
            <span className={styles.cFormIndex}>MO / 01</span>
          </div>
          <p className={styles.cFormLead}>Please enter your assigned account details.</p>
          <LoginForm {...props} buttonLabel="Continue to Masanao" />
          <div className={styles.cFormFoot}>
            <LockKeyhole aria-hidden="true" />
            <span>This is a restricted municipal system.</span>
          </div>
        </div>
      </div>

      <footer className={styles.cFooter}>
        <span>Masanao Municipal Operations</span>
        <span>For authorized personnel</span>
      </footer>
    </section>
  );
}

function PrototypeSwitcher({ current, onChange }: { current: VariantKey; onChange: (key: VariantKey) => void }) {
  if (process.env.NODE_ENV === "production") return null;

  const currentIndex = variants.indexOf(current);
  const previous = variants[(currentIndex - 1 + variants.length) % variants.length];
  const next = variants[(currentIndex + 1) % variants.length];

  return (
    <nav className={styles.govSwitcher} aria-label="Government login prototype variants">
      <button type="button" onClick={() => onChange(previous)} aria-label={`Previous variant: ${previous}`}>
        <ArrowLeft aria-hidden="true" />
      </button>
      <div className={styles.govSwitcherLabel}>
        <span>GOVERNMENT STYLE / PROTOTYPE</span>
        <strong>{current} · {variantNames[current]}</strong>
      </div>
      <button type="button" onClick={() => onChange(next)} aria-label={`Next variant: ${next}`}>
        <ArrowRight aria-hidden="true" />
      </button>
      <span className={styles.govSwitcherHint}>← → compare</span>
    </nav>
  );
}

export default function GovernmentLoginPrototype({ initialVariant }: GovernmentLoginPrototypeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [variant, setVariant] = useState<VariantKey>(initialVariant);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [feedback, setFeedback] = useState("");

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
    setFeedback("The username or password is incorrect.");
  }

  const formProps: LoginFormProps = {
    idPrefix: `government-${variant.toLowerCase()}`,
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
    buttonLabel: "Sign in",
    feedback,
    onSubmit: handleSubmit,
  };

  return (
    <main className={styles.govPrototypeShell}>
      {variant === "A" && <VariantA {...formProps} />}
      {variant === "B" && <VariantB {...formProps} />}
      {variant === "C" && <VariantC {...formProps} />}
      <PrototypeSwitcher current={variant} onChange={changeVariant} />
    </main>
  );
}
