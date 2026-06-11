import { defaultPlan } from "@/lib/default-plan";
import { createClient } from "@/lib/supabase/server";
import type { CadenceItem, CadenceKey, Meal, ShoppingItem, WeeklyPlan } from "@/lib/types";

type PlanRow = {
  id: string;
  order_date: string;
  analysis_window: string | null;
};

export type WeeklyPlanSummary = {
  id: string;
  orderDate: string;
  analysisWindow: string | null;
};

export type EditableWeeklyPlan = {
  id: string;
  orderDate: string;
  analysisWindow: string | null;
  meals: Meal[];
  cadence: Record<CadenceKey, CadenceItem[]>;
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

function getTodayInPacificAuckland() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
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

async function fetchWeeklyPlanByDate(supabase: Awaited<ReturnType<typeof createClient>>, orderDate: string): Promise<WeeklyPlan | null> {
  const planResult = await supabase
    .from("weekly_plans")
    .select("id, order_date, analysis_window")
    .eq("order_date", orderDate)
    .maybeSingle();

  if (planResult.error || !planResult.data) {
    return null;
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
    return null;
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
}

async function fetchEditableWeeklyPlanByDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderDate: string
): Promise<EditableWeeklyPlan | null> {
  const planResult = await supabase
    .from("weekly_plans")
    .select("id, order_date, analysis_window")
    .eq("order_date", orderDate)
    .maybeSingle();

  if (planResult.error || !planResult.data) {
    return null;
  }

  const planRow = planResult.data as PlanRow;
  const [mealsResult, cadenceResult] = await Promise.all([
    supabase
      .from("weekly_plan_meals")
      .select("name, type, note, recipe_url")
      .eq("weekly_plan_id", planRow.id)
      .order("position", { ascending: true })
      .returns<MealRow[]>(),
    supabase
      .from("weekly_plan_cadence_items")
      .select("cadence, name, qty, note")
      .eq("weekly_plan_id", planRow.id)
      .order("position", { ascending: true })
      .returns<CadenceRow[]>()
  ]);

  if (mealsResult.error || cadenceResult.error) {
    return null;
  }

  return {
    id: planRow.id,
    orderDate: planRow.order_date,
    analysisWindow: planRow.analysis_window,
    meals: rowsToMeals(mealsResult.data ?? []),
    cadence: rowsToCadence(cadenceResult.data ?? [])
  };
}

export async function getWeeklyPlan(targetOrderDate?: string): Promise<WeeklyPlan> {
  if (!hasSupabaseConfig()) {
    return defaultPlan;
  }

  try {
    const supabase = await createClient();
    const today = getTodayInPacificAuckland();
    const selectedOrderDate = targetOrderDate
      ? targetOrderDate
      : (
          await supabase
            .from("weekly_plans")
            .select("order_date")
            .lte("order_date", today)
            .order("order_date", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data?.order_date ??
        (
          await supabase
            .from("weekly_plans")
            .select("order_date")
            .order("order_date", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data?.order_date ??
        "";

    const planData = selectedOrderDate ? await fetchWeeklyPlanByDate(supabase, selectedOrderDate) : null;

    return planData ?? defaultPlan;
  } catch {
    return defaultPlan;
  }
}

export async function getWeeklyPlanSummaries(): Promise<WeeklyPlanSummary[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  try {
    const supabase = await createClient();
    const result = await supabase
      .from("weekly_plans")
      .select("id, order_date, analysis_window")
      .order("order_date", { ascending: true });

    if (result.error || !result.data?.length) {
      return [];
    }

    return (result.data as PlanRow[]).map((row) => ({
      id: row.id,
      orderDate: row.order_date,
      analysisWindow: row.analysis_window
    }));
  } catch {
    return [];
  }
}

export async function getEditableWeeklyPlan(targetOrderDate?: string): Promise<EditableWeeklyPlan | null> {
  if (!hasSupabaseConfig()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const today = getTodayInPacificAuckland();
    const selectedOrderDate = targetOrderDate
      ? targetOrderDate
      : (
          await supabase
            .from("weekly_plans")
            .select("order_date")
            .lte("order_date", today)
            .order("order_date", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data?.order_date ??
        (
          await supabase
            .from("weekly_plans")
            .select("order_date")
            .order("order_date", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data?.order_date ??
        "";

    return selectedOrderDate ? fetchEditableWeeklyPlanByDate(supabase, selectedOrderDate) : null;
  } catch {
    return null;
  }
}
