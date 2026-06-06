"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type LoginClientProps = {
  nextPath: string;
};

export default function LoginClient({ nextPath }: LoginClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleSignIn() {
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { data, error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent"
        }
      }
    });

    setIsSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    if (data?.url) {
      window.location.assign(data.url);
    }
  }

  return (
    <div className="auth-form">
      <button type="button" onClick={handleGoogleSignIn} disabled={isSubmitting}>
        {isSubmitting ? "Opening Google..." : "Continue with Google"}
      </button>

      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
