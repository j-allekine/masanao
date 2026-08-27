import LoginForm from "./login/login-form";
import styles from "./login/login.module.css";

export default function Home() {
  return (
    <main className={styles.loginPage} aria-label="Masanao staff sign-in">
      <aside className={styles.welcomePanel} aria-labelledby="welcome-title">
        <div className={styles.panelTop}>
          <div className={styles.brandMark} aria-label="Masanao Municipal operations">
            <span className={styles.brandGlyph} aria-hidden="true">
              M
            </span>
            <span className={styles.brandWords}>
              <strong>MASANAO</strong>
              <small>Municipal operations</small>
            </span>
          </div>
          <span className={styles.staffPill}>STAFF WORKSPACE</span>
        </div>

        <div className={styles.welcomeCopy}>
          <p className={styles.eyebrow}>A calmer start to the day</p>
          <h1 id="welcome-title">Keep the municipality moving.</h1>
          <p>
            One local account for the people coordinating food, supplies, and service across
            Masanao.
          </p>
        </div>

        <div className={styles.welcomeFooter}>
          <div className={styles.locationLine}>
            <span className={styles.locationMarker} aria-hidden="true" />
            <span>Masanao, Lanao del Sur</span>
          </div>
          <p>Access is assigned and managed by trusted administrators.</p>
        </div>
      </aside>

      <section className={styles.signInPanel} aria-labelledby="sign-in-title">
        <div className={styles.signInContent}>
          <div className={styles.signInHeading}>
            <div>
              <p className={styles.eyebrow}>STAFF ACCESS</p>
              <h2 id="sign-in-title">Welcome back.</h2>
              <p>Sign in with the username assigned to your local account.</p>
            </div>
            <span className={styles.secureBadge}>
              <span className={styles.secureMarker} aria-hidden="true">
                ✓
              </span>
              Local and secure
            </span>
          </div>

          <LoginForm />

          <div className={styles.accessNote}>
            <span className={styles.noteMarker} aria-hidden="true">
              i
            </span>
            <p>Need access or a password reset? Contact your Masanao administrator.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
