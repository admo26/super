import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="page-kicker">Almost There</p>
        <h1>This account doesn&apos;t have access yet</h1>
        <p className="page-summary">
          You signed in successfully, but this Google account hasn&apos;t been approved for Super yet.
        </p>
        <p className="page-summary">
          If it should have access, add the email to the allowlist and then try again.
        </p>
        <Link className="login-link" href="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}
