"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState, useSyncExternalStore } from "react";
import {
  CircleHelpIcon,
  EyeIcon,
  EyeOffIcon,
  KeyRoundIcon,
  UserRoundIcon,
} from "lucide-react";

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
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type FieldErrors = {
  username?: string;
  password?: string;
};

type LoginFormProps = React.ComponentProps<"form"> & {
  headingId?: string;
};

const genericSignInError =
  "We couldn't sign you in. Check your username and password and try again.";

export function LoginForm({ className, headingId, ...props }: LoginFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFormError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const trimmedUsername = username.trim();
    const nextErrors: FieldErrors = {};

    if (!trimmedUsername) nextErrors.username = "Enter your username.";
    if (!password) nextErrors.password = "Enter your password.";

    if (nextErrors.username || nextErrors.password) {
      setFieldErrors(nextErrors);
      setFormError(null);

      if (nextErrors.username) usernameRef.current?.focus();
      else passwordRef.current?.focus();

      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);
    void submitCredentials(trimmedUsername, password);
  }

  async function submitCredentials(trimmedUsername: string, currentPassword: string) {
    try {
      const response = await fetch("/api/auth/sign-in/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: trimmedUsername, password: currentPassword }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          setFormError(
            "Your account is not authorized to use this workspace. Contact your system administrator.",
          );
        } else if (response.status >= 500) {
          setFormError(
            "The sign-in service is unavailable. Try again in a moment.",
          );
        } else {
          setFormError(genericSignInError);
        }
        return;
      }

      router.replace("/overview");
    } catch {
      setFormError(
        "We couldn't reach the sign-in service. Check your connection and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const usernameErrorId = "masanao-username-error";
  const passwordErrorId = "masanao-password-error";
  const formErrorId = "masanao-sign-in-error";

  return (
    <form
      className={cn("flex flex-col gap-6", className)}
      aria-label="Masanao staff sign in"
      aria-busy={isSubmitting}
      data-client-ready={isHydrated ? "true" : undefined}
      noValidate
      onSubmit={handleSubmit}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col gap-2">
          <h1
            id={headingId}
            className="text-heading-1 font-semibold tracking-heading-1 text-balance"
          >
            Welcome back
          </h1>
          <p className="text-body text-muted-foreground text-pretty">
            Sign in with the account assigned by your municipal administrator.
          </p>
        </div>

        <Field data-invalid={fieldErrors.username ? "true" : undefined}>
          <FieldLabel htmlFor="masanao-username">Username</FieldLabel>
          <InputGroup className="h-10">
            <InputGroupAddon>
              <UserRoundIcon aria-hidden="true" strokeWidth={1.75} />
            </InputGroupAddon>
            <InputGroupInput
              ref={usernameRef}
              id="masanao-username"
              name="username"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="Enter your username"
              required
              disabled={isSubmitting}
              value={username}
              aria-invalid={fieldErrors.username ? true : undefined}
              aria-describedby={fieldErrors.username ? usernameErrorId : undefined}
              onChange={(event) => {
                setUsername(event.target.value);
                clearFieldError("username");
              }}
            />
          </InputGroup>
          {fieldErrors.username ? (
            <FieldError id={usernameErrorId}>{fieldErrors.username}</FieldError>
          ) : null}
        </Field>

        <Field data-invalid={fieldErrors.password ? "true" : undefined}>
          <FieldLabel htmlFor="masanao-password">Password</FieldLabel>
          <InputGroup className="h-10">
            <InputGroupAddon>
              <KeyRoundIcon aria-hidden="true" strokeWidth={1.75} />
            </InputGroupAddon>
            <InputGroupInput
              ref={passwordRef}
              id="masanao-password"
              name="password"
              type={passwordVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              disabled={isSubmitting}
              value={password}
              aria-invalid={fieldErrors.password ? true : undefined}
              aria-describedby={fieldErrors.password ? passwordErrorId : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
                clearFieldError("password");
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                size="icon-sm"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                aria-controls="masanao-password"
                disabled={isSubmitting}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                {passwordVisible ? (
                  <EyeOffIcon aria-hidden="true" strokeWidth={2} />
                ) : (
                  <EyeIcon aria-hidden="true" strokeWidth={2} />
                )}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {fieldErrors.password ? (
            <FieldError id={passwordErrorId}>{fieldErrors.password}</FieldError>
          ) : null}
        </Field>

        {formError ? <FieldError id={formErrorId}>{formError}</FieldError> : null}

        <Field>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>
        </Field>

        <FieldDescription className="flex items-center justify-center gap-2 text-center">
          <CircleHelpIcon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.75} />
          <span>Need access? Contact your system administrator.</span>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
