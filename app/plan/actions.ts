"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { isAllowedAuthEmail } from "@/lib/auth";
import { getOrderHistoryRows } from "@/lib/order-history";
import { getRecipes } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import { generateWeeklyPlanDraft } from "@/lib/weekly-generation";

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

function encodeError(message: string) {
  return encodeURIComponent(message);
}

function redirectWithError(message: string) {
  redirect(`/?error=${encodeError(message)}`);
}

export async function generateNextWeeklyPlan() {
  if (!hasSupabaseConfig()) {
    redirectWithError("Supabase is not configured.");
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?error=${encodeError("Please sign in first.")}`);
  }

  if (!isAllowedAuthEmail(user.email)) {
    redirect("/unauthorized");
  }

  const [latestPlanResult, recipesResult, historyRows] = await Promise.all([
    supabase
      .from("weekly_plans")
      .select("order_date")
      .order("order_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getRecipes(),
    getOrderHistoryRows(1000)
  ]);

  if (latestPlanResult.error) {
    redirectWithError(latestPlanResult.error.message);
  }

  if (recipesResult.recipes.length === 0) {
    redirectWithError("No recipes are available yet.");
  }

  const draft = generateWeeklyPlanDraft({
    latestPlanDate: latestPlanResult.data?.order_date ?? null,
    historyRows,
    recipes: recipesResult.recipes
  });

  const existingPlan = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("order_date", draft.orderDate)
    .maybeSingle();

  if (existingPlan.error) {
    redirectWithError(existingPlan.error.message);
  }

  if (existingPlan.data?.id) {
    const deleted = await supabase.from("weekly_plans").delete().eq("id", existingPlan.data.id);
    if (deleted.error) {
      redirectWithError(deleted.error.message);
    }
  }

  const insertedPlan = await supabase
    .from("weekly_plans")
    .insert({
      order_date: draft.orderDate,
      analysis_window: draft.analysisWindow
    })
    .select("id")
    .single();

  if (insertedPlan.error) {
    redirectWithError(insertedPlan.error.message);
  }

  const weeklyPlanId = insertedPlan.data?.id;

  if (!weeklyPlanId) {
    redirectWithError("Failed to create the weekly plan.");
  }

  const meals = draft.meals.map((meal, index) => ({
    weekly_plan_id: weeklyPlanId,
    position: index,
    name: meal.name,
    type: meal.type,
    note: meal.note,
    recipe_url: meal.url ?? null
  }));

  const cadenceItems = Object.entries(draft.cadence).flatMap(([cadence, items]) =>
    items.map((item, index) => ({
      weekly_plan_id: weeklyPlanId,
      position: index,
      cadence,
      name: item.name,
      qty: item.qty,
      note: item.note
    }))
  );

  const shoppingItems = draft.items.map((item, index) => ({
    weekly_plan_id: weeklyPlanId,
    position: index,
    name: item.name,
    qty: item.qty,
    reason: item.reason,
    meal: item.meal,
    group: item.group
  }));

  for (const [label, rows, table] of [
    ["meals", meals, "weekly_plan_meals"],
    ["cadence items", cadenceItems, "weekly_plan_cadence_items"],
    ["shopping items", shoppingItems, "weekly_plan_items"]
  ] as const) {
    const result = await supabase.from(table).insert(rows as any);
    if (result.error) {
      redirectWithError(`Failed to save ${label}: ${result.error.message}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/history");
  redirect(`/?generated=1`);
}
