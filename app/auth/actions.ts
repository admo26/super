"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function sanitizeNextPath(value: FormDataEntryValue | null) {
  const nextPath = typeof value === "string" ? value : "/";
  return nextPath.startsWith("/") ? nextPath : "/";
}

async function getRequestOrigin() {
  const headerStore = await headers();
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost ?? headerStore.get("host");
  const forwardedProto = headerStore.get("x-forwarded-proto") ?? "https";

  if (!host) {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  }

  return `${forwardedProto}://${host}`;
}

export async function signInWithGoogle(formData: FormData) {
  const nextPath = sanitizeNextPath(formData.get("next"));
  const origin = await getRequestOrigin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      queryParams: {
        access_type: "offline",
        prompt: "consent"
      }
    }
  });

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in could not be started.")}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
