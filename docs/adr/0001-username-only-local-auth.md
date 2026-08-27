---
status: accepted
---

# Username-Only Local Authentication

Decision date: 2026-08-27

## Context

Masanao is being developed for simple local use. The first authentication
experience should not depend on Google, email delivery, or user self-service.
Accounts are managed by an administrator.

BetterAuth is already part of the application and provides the authentication
and session foundation. Its username support extends the existing
email-and-password model; the BetterAuth user model still requires an email
field internally. That requirement is not part of the user-facing login
experience.

## Decision

Keep BetterAuth and use username and password as the only login credentials.

- Administrators create accounts.
- Administrators assign usernames and permanent passwords.
- Email is not requested from users and is not shown or used for login.
- Google OAuth is excluded for now.
- Forgot-password and email-based recovery are excluded.
- Administrators handle password resets.
- Administrators can disable accounts.
- BetterAuth's required internal email field will be handled behind the scenes
  during implementation and will not become a user-facing requirement.

## Consequences

This keeps the initial login flow small and suitable for a local deployment,
while retaining BetterAuth's established authentication and session handling.
Administrators remain responsible for account creation, password assignment,
password resets, and account deactivation. Permanent administrator-assigned
passwords increase the importance of protecting the account-management path
and limiting account-management permissions to trusted administrators.

This initial local scope does not include administrative session revocation or
login rate limiting. That keeps the feature smaller but provides less
resistance to brute-force attempts and less immediate control over already
active sessions.

The internal email requirement remains a BetterAuth integration constraint. If
the system later needs email recovery, Google OAuth, or broader self-service,
this decision should be revisited rather than silently expanding the login
scope.

## Alternatives considered

### Google OAuth plus local authentication

Deferred. It would add provider configuration, account-linking rules, and
Google Workspace identity management that are not needed for the initial local
deployment.

### Custom username/password authentication

Rejected for now. It would remove BetterAuth's internal email requirement but
would make the project responsible for implementing and maintaining password
hashing, session management, throttling, account state, and related security
controls.
