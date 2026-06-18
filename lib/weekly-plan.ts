import { defaultPlan } from "@/lib/default-plan";
import { createClient } from "@/lib/supabase/server";
import type { CadenceItem, CadenceKey, Meal, PendingAdHocItem, ShoppingItem, WeeklyPlan } from "@/lib/types";

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

type ItemRow = {
  id: string;
  name: string;
  qty: string;
  reason: string;
  meal: string;
  group: string;
};

type CadenceRow = {
  cadence: CadenceKey;
  name: string;
  qty: string;
  note: string;
};

export type RecurringCadence = {
  cadence: Record<CadenceKey, CadenceItem[]>;
  source: "master" | "latest-plan-fallback";
  sourceOrderDate: string | null;
};

type PendingAdHocRow = {
  id: string;
  name: string;
  qty: string;
  target_order_date: string;
  created_at: string;
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

function applyCurrentPlanCutoff<T extends { lt: (column: string, value: string) => T }>(query: T, today: string): T {
  return query.lt("order_date", today);
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

async function fetchCadenceRowsForPlan(
  supabase: Awaited<ReturnType<typeof createClient>>,
  weeklyPlanId: string
): Promise<CadenceRow[] | null> {
  const cadenceResult = await supabase
    .from("weekly_plan_cadence_items")
    .select("cadence, name, qty, note")
    .eq("weekly_plan_id", weeklyPlanId)
    .order("position", { ascending: true })
    .returns<CadenceRow[]>();

  if (cadenceResult.error) {
    return null;
  }

  return cadenceResult.data ?? [];
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
  const [mealsResult, itemsResult, cadenceRows] = await Promise.all([
    supabase
      .from("weekly_plan_meals")
      .select("name, type, note, recipe_url")
      .eq("weekly_plan_id", planRow.id)
      .order("position", { ascending: true })
      .returns<MealRow[]>(),
    supabase
      .from("weekly_plan_items")
      .select("id, name, qty, reason, meal, \"group\"")
      .eq("weekly_plan_id", planRow.id)
      .order("position", { ascending: true })
      .returns<ItemRow[]>(),
    fetchCadenceRowsForPlan(supabase, planRow.id)
  ]);

  if (mealsResult.error || itemsResult.error || cadenceRows === null) {
    return null;
  }

  return {
    id: planRow.id,
    orderDate: planRow.order_date,
    analysisWindow: planRow.analysis_window ?? defaultPlan.analysisWindow,
    sourceLabel: "Supabase",
    meals: rowsToMeals(mealsResult.data ?? []),
    cadence: rowsToCadence(cadenceRows),
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
  const [mealsResult, cadenceRows] = await Promise.all([
    supabase
      .from("weekly_plan_meals")
      .select("name, type, note, recipe_url")
      .eq("weekly_plan_id", planRow.id)
      .order("position", { ascending: true })
      .returns<MealRow[]>(),
    fetchCadenceRowsForPlan(supabase, planRow.id)
  ]);

  if (mealsResult.error || cadenceRows === null) {
    return null;
  }

  return {
    id: planRow.id,
    orderDate: planRow.order_date,
    analysisWindow: planRow.analysis_window,
    meals: rowsToMeals(mealsResult.data ?? []),
    cadence: rowsToCadence(cadenceRows)
  };
}

export async function getRecurringCadence(): Promise<RecurringCadence> {
  const emptyCadence = { weekly: [], fortnightly: [], monthly: [] } satisfies Record<CadenceKey, CadenceItem[]>;

  if (!hasSupabaseConfig()) {
    return {
      cadence: emptyCadence,
      source: "master",
      sourceOrderDate: null
    };
  }

  try {
    const supabase = await createClient();
    const masterResult = await supabase
      .from("recurring_cadence_items")
      .select("cadence, name, qty, note")
      .order("cadence", { ascending: true })
      .order("position", { ascending: true })
      .returns<CadenceRow[]>();

    if (!masterResult.error && masterResult.data?.length) {
      return {
        cadence: rowsToCadence(masterResult.data),
        source: "master",
        sourceOrderDate: null
      };
    }

    const latestPlan = await supabase
      .from("weekly_plans")
      .select("id, order_date")
      .order("order_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPlan.error || !latestPlan.data?.id) {
      return {
        cadence: emptyCadence,
        source: "master",
        sourceOrderDate: null
      };
    }

    const fallbackRows = await fetchCadenceRowsForPlan(supabase, latestPlan.data.id);

    return {
      cadence: rowsToCadence(fallbackRows ?? []),
      source: "latest-plan-fallback",
      sourceOrderDate: latestPlan.data.order_date
    };
  } catch {
    return {
      cadence: emptyCadence,
      source: "master",
      sourceOrderDate: null
    };
  }
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
          await applyCurrentPlanCutoff(
            supabase.from("weekly_plans").select("order_date"),
            today
          )
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
          await applyCurrentPlanCutoff(
            supabase.from("weekly_plans").select("order_date"),
            today
          )
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

export async function getPendingAdHocItems(targetOrderDate: string): Promise<PendingAdHocItem[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  try {
    const supabase = await createClient();
    const result = await supabase
      .from("pending_ad_hoc_items")
      .select("id, name, qty, target_order_date, created_at")
      .eq("target_order_date", targetOrderDate)
      .order("created_at", { ascending: true })
      .returns<PendingAdHocRow[]>();

    if (result.error || !result.data?.length) {
      return [];
    }

    return result.data.map((row) => ({
      id: row.id,
      name: row.name,
      qty: row.qty,
      targetOrderDate: row.target_order_date,
      createdAt: row.created_at
    }));
  } catch {
    return [];
  }
}
