import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Access Restricted</p>
        <h1>Not On The Allowlist</h1>
        <p className="hero-copy">
          You signed in successfully, but this account is not approved for the grocery planner.
        </p>
        <p className="hero-copy">
          If this should be allowed, add the Google email to the allowlist and try again.
        </p>
        <Link className="login-link" href="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
