import CallbackClient from "@/app/auth/callback/callback-client";

type CallbackPageProps = {
  searchParams?: {
    code?: string;
    next?: string;
  };
};

export default function CallbackPage({ searchParams }: CallbackPageProps) {
  const code = searchParams?.code ?? null;
  const nextPath = searchParams?.next && searchParams.next.startsWith("/") ? searchParams.next : "/";

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
