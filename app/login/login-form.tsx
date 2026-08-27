"use client";

import { type FormEvent, useRef, useState } from "react";

import styles from "./login.module.css";

type FieldErrors = {
  username?: string;
  password?: string;
};

type Feedback =
  | { kind: "error"; message: string }
  | { kind: "success"; message: string };

const genericSignInError = "We couldn't sign you in. Check your username and password and try again.";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function clearFieldFeedback(field: keyof FieldErrors) {
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
    setFeedback(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    const trimmedUsername = username.trim();
    const nextFieldErrors: FieldErrors = {};

    if (!trimmedUsername) {
      nextFieldErrors.username = "Enter your username.";
    }

    if (!password) {
      nextFieldErrors.password = "Enter your password.";
    }

    if (nextFieldErrors.username || nextFieldErrors.password) {
      setFieldErrors(nextFieldErrors);
      setFeedback(null);

      if (nextFieldErrors.username) {
        usernameRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }

      return;
    }

    setFieldErrors({});
    setFeedback(null);
    setIsSubmitting(true);

    void submitCredentials(trimmedUsername, password);
  }

  async function submitCredentials(trimmedUsername: string, currentPassword: string) {
    try {
      const response = await fetch("/api/auth/sign-in/username", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username: trimmedUsername, password: currentPassword }),
      });

      if (!response.ok) {
        setFeedback({ kind: "error", message: genericSignInError });
        return;
      }

      const protectedResponse = await fetch("/api/operations", {
        credentials: "include",
      });

      if (!protectedResponse.ok) {
        setFeedback({ kind: "error", message: genericSignInError });
        return;
      }

      setFeedback({
        kind: "success",
        message: "You are signed in. Masanao is ready for your work.",
      });
    } catch {
      setFeedback({ kind: "error", message: genericSignInError });
    } finally {
      setIsSubmitting(false);
    }
  }

  const usernameErrorId = "masanao-username-error";
  const passwordErrorId = "masanao-password-error";
  const formErrorId = "masanao-sign-in-error";
  const successId = "masanao-sign-in-success";
  const hasFormError = feedback?.kind === "error";

  const usernameDescribedBy = [
    fieldErrors.username ? usernameErrorId : "",
    hasFormError ? formErrorId : "",
  ]
    .filter(Boolean)
    .join(" ");
  const passwordDescribedBy = [
    fieldErrors.password ? passwordErrorId : "",
    hasFormError ? formErrorId : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <form
      className={styles.loginForm}
      aria-label="Masanao staff sign in"
      aria-busy={isSubmitting}
      noValidate
      onSubmit={handleSubmit}
    >
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor="masanao-username">
          Username
        </label>
        <div className={styles.inputShell}>
          <span className={styles.inputMarker} aria-hidden="true">
            @
          </span>
          <input
            ref={usernameRef}
            id="masanao-username"
            className={styles.input}
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            disabled={isSubmitting}
            value={username}
            aria-invalid={Boolean(fieldErrors.username)}
            aria-describedby={usernameDescribedBy || undefined}
            onChange={(event) => {
              setUsername(event.target.value);
              clearFieldFeedback("username");
            }}
          />
        </div>
        {fieldErrors.username ? (
          <p id={usernameErrorId} className={styles.fieldError} role="alert">
            {fieldErrors.username}
          </p>
        ) : null}
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel} htmlFor="masanao-password">
          Password
        </label>
        <div className={styles.inputShell}>
          <span className={`${styles.inputMarker} ${styles.lockMarker}`} aria-hidden="true">
            •
          </span>
          <input
            ref={passwordRef}
            id="masanao-password"
            className={`${styles.input} ${styles.passwordInput}`}
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={isSubmitting}
            value={password}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={passwordDescribedBy || undefined}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldFeedback("password");
            }}
          />
          <button
            className={styles.visibilityButton}
            type="button"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
            aria-controls="masanao-password"
            disabled={isSubmitting}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            <span className={styles.eyeMarker} aria-hidden="true" />
          </button>
        </div>
        {fieldErrors.password ? (
          <p id={passwordErrorId} className={styles.fieldError} role="alert">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      {feedback?.kind === "error" ? (
        <p id={formErrorId} className={styles.formMessageError} role="alert">
          <span className={styles.messageMarker} aria-hidden="true">
            !
          </span>
          {feedback.message}
        </p>
      ) : null}

      {feedback?.kind === "success" ? (
        <p id={successId} className={styles.formMessageSuccess} role="status" aria-live="polite">
          <span className={styles.messageMarker} aria-hidden="true">
            ✓
          </span>
          {feedback.message}
        </p>
      ) : null}

      <button className={styles.submitButton} type="submit" disabled={isSubmitting}>
        <span>{isSubmitting ? "Signing in…" : "Sign in"}</span>
        <span className={styles.submitArrow} aria-hidden="true">
          →
        </span>
      </button>
    </form>
  );
}
