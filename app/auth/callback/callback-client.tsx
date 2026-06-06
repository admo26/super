"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { isAllowedAuthEmail } from "@/lib/auth";

type CallbackClientProps = {
  code: string | null;
  nextPath: string;
};

export default function CallbackClient({ code, nextPath }: CallbackClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState("Finishing sign-in...");

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      if (!code) {
        setMessage("Google did not return a sign-in code. Check the Supabase redirect URL configuration.");
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (cancelled) return;

      if (error) {
        setMessage(`Sign-in failed: ${error.message}`);
        return;
      }

      const user = data.session?.user ?? data.user ?? null;

      if (!isAllowedAuthEmail(user?.email)) {
        await supabase.auth.signOut();
        router.replace("/unauthorized");
        return;
      }

      setMessage("Signed in. Redirecting...");
      router.replace(nextPath);
      router.refresh();
    }

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [code, nextPath, router]);

  return <p className="hero-copy">{message}</p>;
}
