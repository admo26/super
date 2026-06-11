import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="page-kicker">Access Restricted</p>
        <h1>Not on the allowlist</h1>
        <p className="page-summary">
          You signed in successfully, but this account is not approved for the grocery planner.
        </p>
        <p className="page-summary">
          If this should be allowed, add the Google email to the allowlist and try again.
        </p>
        <Link className="login-link" href="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
