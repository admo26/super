import { defaultPlan } from "@/lib/default-plan";
import { createClient } from "@/lib/supabase/server";
import type { CadenceItem, CadenceKey, Meal, ShoppingItem, WeeklyPlan } from "@/lib/types";

type PlanRow = {
  id: string;
  order_date: string;
  analysis_window: string | null;
};

type MealRow = {
  name: string;
  type: string;
  note: string;
  recipe_url: string | null;
};

type ItemRow = ShoppingItem;

type CadenceRow = {
  cadence: CadenceKey;
  name: string;
  qty: string;
  note: string;
};

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

function rowsToCadence(rows: CadenceRow[]): Record<CadenceKey, CadenceItem[]> {
  return rows.reduce<Record<CadenceKey, CadenceItem[]>>(
    (acc, row) => {
      acc[row.cadence].push({
        name: row.name,
        qty: row.qty,
        note: row.note
      });
      return acc;
    },
    { weekly: [], fortnightly: [], monthly: [] }
  );
}

function rowsToMeals(rows: MealRow[]): Meal[] {
  return rows.map((row) => ({
    name: row.name,
    type: row.type,
    note: row.note,
    url: row.recipe_url ?? undefined
  }));
}

export async function getWeeklyPlan(): Promise<WeeklyPlan> {
  if (!hasSupabaseConfig()) {
    return defaultPlan;
  }

  try {
    const supabase = await createClient();
    const planResult = await supabase
      .from("weekly_plans")
      .select("id, order_date, analysis_window")
      .order("order_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planResult.error || !planResult.data) {
      return defaultPlan;
    }

    const planRow = planResult.data as PlanRow;
    const [mealsResult, itemsResult, cadenceResult] = await Promise.all([
      supabase
        .from("weekly_plan_meals")
        .select("name, type, note, recipe_url")
        .eq("weekly_plan_id", planRow.id)
        .order("position", { ascending: true })
        .returns<MealRow[]>(),
      supabase
        .from("weekly_plan_items")
        .select("name, qty, reason, meal, \"group\"")
        .eq("weekly_plan_id", planRow.id)
        .order("position", { ascending: true })
        .returns<ItemRow[]>(),
      supabase
        .from("weekly_plan_cadence_items")
        .select("cadence, name, qty, note")
        .eq("weekly_plan_id", planRow.id)
        .order("position", { ascending: true })
        .returns<CadenceRow[]>()
    ]);

    if (mealsResult.error || itemsResult.error || cadenceResult.error) {
      return defaultPlan;
    }

    return {
      orderDate: planRow.order_date,
      analysisWindow: planRow.analysis_window ?? defaultPlan.analysisWindow,
      sourceLabel: "Supabase",
      meals: rowsToMeals(mealsResult.data ?? []),
      cadence: rowsToCadence(cadenceResult.data ?? []),
      assumptions: defaultPlan.assumptions,
      adjustments: defaultPlan.adjustments,
      items: itemsResult.data ?? []
    };
  } catch {
    return defaultPlan;
  }
}
