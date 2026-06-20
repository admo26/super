"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isAllowedAuthEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { generateAndStoreNextWeeklyPlan } from "@/lib/weekly-plan-generation";

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

function encodeError(message: string) {
  return encodeURIComponent(message);
}

function redirectWithError(message: string, returnTo = "/") {
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}error=${encodeError(message)}`);
}

export async function generateNextWeeklyPlan(formData?: FormData) {
  const returnToValue = formData?.get("returnTo");
  const returnTo =
    typeof returnToValue === "string" && returnToValue.startsWith("/") && !returnToValue.startsWith("//")
      ? returnToValue
      : "/";

  if (!hasSupabaseConfig()) {
    redirectWithError("Supabase is not configured.", returnTo);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?error=${encodeError("Please sign in first.")}&next=${encodeURIComponent(returnTo)}`);
  }

  if (!isAllowedAuthEmail(user.email)) {
    redirect("/unauthorized");
  }

  try {
    await generateAndStoreNextWeeklyPlan();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate the weekly plan.";
    redirectWithError(message, returnTo);
  }

  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/cadence");
  const separator = returnTo.includes("?") ? "&" : "?";
  redirect(`${returnTo}${separator}generated=1`);
}

export async function deleteShoppingListItem(formData: FormData) {
  if (!hasSupabaseConfig()) {
    redirectWithError("Supabase is not configured.");
  }

  const itemId = formData.get("itemId");

  if (typeof itemId !== "string" || itemId.length === 0) {
    redirectWithError("Missing shopping list item id.");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?error=${encodeError("Please sign in first.")}&next=${encodeURIComponent("/")}`);
  }

  if (!isAllowedAuthEmail(user.email)) {
    redirect("/unauthorized");
  }

  const deleteResult = await supabase.from("weekly_plan_items").delete().eq("id", itemId);

  if (deleteResult.error) {
    redirectWithError(deleteResult.error.message);
  }

  revalidatePath("/");
  redirect("/");
}
