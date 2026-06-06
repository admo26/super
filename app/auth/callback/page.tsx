import CallbackClient from "@/app/auth/callback/callback-client";

type CallbackPageProps = {
  searchParams?: Promise<{
    code?: string;
    next?: string;
  }>;
};

export default async function CallbackPage({ searchParams }: CallbackPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const code = resolvedSearchParams.code ?? null;
  const nextPath =
    resolvedSearchParams.next && resolvedSearchParams.next.startsWith("/")
      ? resolvedSearchParams.next
      : "/";

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Signing In</p>
        <h1>Just A Moment</h1>
        <CallbackClient code={code} nextPath={nextPath} />
      </section>
    </main>
  );
}
