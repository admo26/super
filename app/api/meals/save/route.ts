import { revalidatePath } from "next/cache";

import { NextResponse } from "next/server";

import { isAllowedAuthEmail } from "@/lib/auth";
import { getRecipes } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import { buildShoppingItems } from "@/lib/weekly-generation";
import type { CadenceItem, CadenceKey, Meal } from "@/lib/types";

type SaveMealsRequest = {
  weeklyPlanId: string;
  meals: Meal[];
};

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

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!isAllowedAuthEmail(user.email)) {
    return NextResponse.json({ error: "You are not allowed to edit meal plans." }, { status: 403 });
  }

  const body = (await request.json()) as SaveMealsRequest;

  if (!body.weeklyPlanId) {
    return NextResponse.json({ error: "Missing weekly plan id." }, { status: 400 });
  }

  const meals = body.meals.filter((meal) => meal.name.trim().length > 0);

  const mealRows = meals
    .filter((meal) => meal.name.trim().length > 0)
    .map((meal, index) => ({
      weekly_plan_id: body.weeklyPlanId,
      position: index,
      name: meal.name.trim(),
      type: meal.type.trim(),
      note: normalizeText(meal.note) ?? "",
      recipe_url: normalizeText(meal.url)
    }));

  const cadenceResult = await supabase
    .from("weekly_plan_cadence_items")
    .select("cadence, name, qty, note")
    .eq("weekly_plan_id", body.weeklyPlanId)
    .order("position", { ascending: true })
    .returns<CadenceRow[]>();

  if (cadenceResult.error) {
    return NextResponse.json({ error: cadenceResult.error.message }, { status: 500 });
  }

  const cadence = (cadenceResult.data ?? []).reduce<Record<CadenceKey, CadenceItem[]>>(
    (acc, item) => {
      acc[item.cadence].push({
        name: item.name,
        qty: item.qty,
        note: item.note
      });
      return acc;
    },
    { weekly: [], fortnightly: [], monthly: [] }
  );

  const { recipes } = await getRecipes();
  const shoppingItems = buildShoppingItems(
    meals.map((meal) => ({
      ...meal,
      recipe: recipes.find((recipe) => recipe.name === meal.name)
    })),
    cadence
  );
  const shoppingItemRows = shoppingItems.map((item, index) => ({
    weekly_plan_id: body.weeklyPlanId,
    position: index,
    name: item.name,
    qty: item.qty,
    reason: item.reason,
    meal: item.meal,
    group: item.group
  }));

  const deleteResult = await supabase
    .from("weekly_plan_meals")
    .delete()
    .eq("weekly_plan_id", body.weeklyPlanId);

  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message }, { status: 500 });
  }

  const deleteItemsResult = await supabase
    .from("weekly_plan_items")
    .delete()
    .eq("weekly_plan_id", body.weeklyPlanId);

  if (deleteItemsResult.error) {
    return NextResponse.json({ error: deleteItemsResult.error.message }, { status: 500 });
  }

  if (mealRows.length > 0) {
    const insertResult = await supabase.from("weekly_plan_meals").insert(mealRows);

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }
  }

  if (shoppingItemRows.length > 0) {
    const insertItemsResult = await supabase.from("weekly_plan_items").insert(shoppingItemRows);

    if (insertItemsResult.error) {
      return NextResponse.json({ error: insertItemsResult.error.message }, { status: 500 });
    }
  }

  revalidatePath("/");
  revalidatePath("/cadence");

  return NextResponse.json({ ok: true, saved: mealRows.length, itemsSaved: shoppingItemRows.length });
}
