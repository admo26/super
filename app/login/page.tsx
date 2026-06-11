import { signInWithGoogle } from "@/app/auth/actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const nextPath = resolvedSearchParams.next ?? "/";
  const error = resolvedSearchParams.error ?? null;

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="page-kicker">Household Access</p>
        <h1>Sign in to Super</h1>
        <p className="page-summary">
          Secure access for the weekly grocery planner and order import tools.
        </p>

        <form className="auth-form" action={signInWithGoogle}>
          <input type="hidden" name="next" value={nextPath} />
          <button type="submit">Continue with Google</button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </section>
    </main>
  );
}
