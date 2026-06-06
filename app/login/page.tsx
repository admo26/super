import LoginClient from "@/app/login/login-client";

type LoginPageProps = {
  searchParams?: {
    next?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = searchParams?.next ?? "/";

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Household Access</p>
        <h1>Sign In To Super</h1>
        <p className="hero-copy">
          Sign in with Google so the grocery planner and the AI-powered import tools stay behind one household account.
        </p>

        <LoginClient nextPath={nextPath} />
      </section>
    </main>
  );
}
