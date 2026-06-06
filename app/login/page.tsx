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
        <p className="eyebrow">Household Access</p>
        <h1>Sign In To Super</h1>
        <p className="hero-copy">
          Sign in with Google so the grocery planner and the AI-powered import tools stay behind one household account.
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
