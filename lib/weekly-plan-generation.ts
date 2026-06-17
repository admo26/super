import { createClient } from "@supabase/supabase-js";

import { getRecipes } from "@/lib/recipes";
import type { OrderHistoryRow } from "@/lib/order-history";
import { generateWeeklyPlanDraft } from "@/lib/weekly-generation";

type PlanHistoryRow = {
  id: string;
  order_date: string;
};

type MealHistoryRow = {
  weekly_plan_id: string;
  name: string;
};

type CadenceHistoryRow = {
  weekly_plan_id: string;
  cadence: "weekly" | "fortnightly" | "monthly";
  name: string;
  qty: string;
  note: string;
  position: number;
};

type ShoppingItemRow = {
  name: string;
  qty: string;
  reason: string;
  meal: string;
  group: string;
};

type PendingAdHocRow = {
  id: string;
  name: string;
  qty: string;
};

function getAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecret) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false }
  });
}

export async function generateAndStoreNextWeeklyPlan() {
  const supabase = getAdminSupabaseClient();

  const [latestPlanResult, planHistoryResult, mealHistoryResult, cadenceHistoryResult, orderHistoryResult, recipesResult] =
    await Promise.all([
      supabase
        .from("weekly_plans")
        .select("id, order_date")
        .order("order_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("weekly_plans")
        .select("id, order_date")
        .order("order_date", { ascending: false })
        .returns<PlanHistoryRow[]>(),
      supabase
        .from("weekly_plan_meals")
        .select("weekly_plan_id, name")
        .returns<MealHistoryRow[]>(),
      supabase
        .from("weekly_plan_cadence_items")
        .select("weekly_plan_id, cadence, name, qty, note, position")
        .order("position", { ascending: true })
        .returns<CadenceHistoryRow[]>(),
      supabase
        .from("order_history_items")
        .select("order_date, item_name, quantity, unit, category, notes, source_type, source_name")
        .order("order_date", { ascending: false })
        .order("item_name", { ascending: true })
        .limit(1000)
        .returns<OrderHistoryRow[]>(),
      getRecipes()
    ]);

  if (latestPlanResult.error) throw new Error(latestPlanResult.error.message);
  if (planHistoryResult.error) throw new Error(planHistoryResult.error.message);
  if (mealHistoryResult.error) throw new Error(mealHistoryResult.error.message);
  if (cadenceHistoryResult.error) throw new Error(cadenceHistoryResult.error.message);
  if (orderHistoryResult.error) throw new Error(orderHistoryResult.error.message);

  if (recipesResult.recipes.length === 0) {
    throw new Error("No recipes are available yet.");
  }

  const orderDateByPlanId = new Map((planHistoryResult.data ?? []).map((plan) => [plan.id, plan.order_date]));
  const recipeHistory = (mealHistoryResult.data ?? [])
    .map((meal) => ({
      recipeName: meal.name,
      orderDate: orderDateByPlanId.get(meal.weekly_plan_id) ?? null
    }))
    .filter((meal): meal is { recipeName: string; orderDate: string } => Boolean(meal.orderDate));

  const latestCadenceTemplate = {
    weekly: [] as Array<{ name: string; qty: string; note: string }>,
    fortnightly: [] as Array<{ name: string; qty: string; note: string }>,
    monthly: [] as Array<{ name: string; qty: string; note: string }>
  };

  for (const item of cadenceHistoryResult.data ?? []) {
    if (item.weekly_plan_id !== latestPlanResult.data?.id) continue;

    latestCadenceTemplate[item.cadence].push({
      name: item.name,
      qty: item.qty,
      note: item.note
    });
  }

  const draft = generateWeeklyPlanDraft({
    latestPlanDate: latestPlanResult.data?.order_date ?? null,
    historyRows: orderHistoryResult.data ?? [],
    recipes: recipesResult.recipes,
    recipeHistory,
    cadenceTemplate:
      latestCadenceTemplate.weekly.length ||
      latestCadenceTemplate.fortnightly.length ||
      latestCadenceTemplate.monthly.length
        ? latestCadenceTemplate
        : undefined
  });

  const existingPlan = await supabase
    .from("weekly_plans")
    .select("id")
    .eq("order_date", draft.orderDate)
    .maybeSingle();

  if (existingPlan.error) {
    throw new Error(existingPlan.error.message);
  }

  let preservedAdHocItems: ShoppingItemRow[] = [];

  if (existingPlan.data?.id) {
    const existingAdHocItems = await supabase
      .from("weekly_plan_items")
      .select("name, qty, reason, meal, \"group\"")
      .eq("weekly_plan_id", existingPlan.data.id)
      .eq("reason", "ad hoc")
      .order("position", { ascending: true })
      .returns<ShoppingItemRow[]>();

    if (existingAdHocItems.error) {
      throw new Error(existingAdHocItems.error.message);
    }

    preservedAdHocItems = existingAdHocItems.data ?? [];

    const deleted = await supabase.from("weekly_plans").delete().eq("id", existingPlan.data.id);
    if (deleted.error) {
      throw new Error(deleted.error.message);
    }
  }

  const pendingAdHocItems = await supabase
    .from("pending_ad_hoc_items")
    .select("id, name, qty")
    .eq("target_order_date", draft.orderDate)
    .order("created_at", { ascending: true })
    .returns<PendingAdHocRow[]>();

  if (pendingAdHocItems.error) {
    throw new Error(pendingAdHocItems.error.message);
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
    throw new Error(insertedPlan.error.message);
  }

  const weeklyPlanId = insertedPlan.data?.id;

  if (!weeklyPlanId) {
    throw new Error("Failed to create the weekly plan.");
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

  const adHocItems = [
    ...preservedAdHocItems,
    ...(pendingAdHocItems.data ?? []).map((item) => ({
      name: item.name,
      qty: item.qty,
      reason: "ad hoc",
      meal: "Added during week",
      group: "Other"
    }))
  ];

  const shoppingItems = [...draft.items, ...adHocItems].map((item, index) => ({
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
    const result = await supabase.from(table).insert(rows as never[]);
    if (result.error) {
      throw new Error(`Failed to save ${label}: ${result.error.message}`);
    }
  }

  if (pendingAdHocItems.data?.length) {
    const pendingIds = pendingAdHocItems.data.map((item) => item.id);
    const deletePending = await supabase.from("pending_ad_hoc_items").delete().in("id", pendingIds);

    if (deletePending.error) {
      throw new Error(deletePending.error.message);
    }
  }

  return {
    orderDate: draft.orderDate,
    weeklyPlanId,
    mealsSaved: meals.length,
    cadenceItemsSaved: cadenceItems.length,
    shoppingItemsSaved: shoppingItems.length
  };
}
