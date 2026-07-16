import { revalidatePath } from "next/cache";

import { NextResponse } from "next/server";

import { isAllowedAuthEmail } from "@/lib/auth";
import { getRecipes } from "@/lib/recipes";
import { getRecurringCadence } from "@/lib/weekly-plan";
import { createClient } from "@/lib/supabase/server";
import { buildShoppingItems } from "@/lib/weekly-generation";
import type { Meal } from "@/lib/types";

type SaveMealsRequest = {
  weeklyPlanId: string;
  meals: Meal[];
};

type ShoppingItemRow = {
  name: string;
  qty: string;
  reason: string;
  meal: string;
  group: string;
};

type ForgottenSuggestionRow = {
  id: string;
  name: string;
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

function normalizeComparableText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalName(value: string) {
  return normalizeComparableText(value)
    .replace(/\b(pack|bag|each|kg|g|jar|tube|bunch|box|bottle|loaf|punnet|tray|sachet|packet)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isSimilarItem(left: string, right: string) {
  return left === right || left.includes(right) || right.includes(left);
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

  const recurringCadence = await getRecurringCadence();
  const cadence = recurringCadence.cadence;

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

  const existingAdHocResult = await supabase
    .from("weekly_plan_items")
    .select("name, qty, reason, meal, \"group\"")
    .eq("weekly_plan_id", body.weeklyPlanId)
    .eq("reason", "ad hoc")
    .order("position", { ascending: true })
    .returns<ShoppingItemRow[]>();

  if (existingAdHocResult.error) {
    return NextResponse.json({ error: existingAdHocResult.error.message }, { status: 500 });
  }

  const existingForgottenSuggestionsResult = await supabase
    .from("weekly_plan_forgotten_suggestions")
    .select("id, name")
    .eq("weekly_plan_id", body.weeklyPlanId)
    .returns<ForgottenSuggestionRow[]>();

  if (existingForgottenSuggestionsResult.error) {
    return NextResponse.json({ error: existingForgottenSuggestionsResult.error.message }, { status: 500 });
  }

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

  const mergedShoppingItemRows = [
    ...shoppingItemRows,
    ...(existingAdHocResult.data ?? []).map((item, index) => ({
      weekly_plan_id: body.weeklyPlanId,
      position: shoppingItemRows.length + index,
      name: item.name,
      qty: item.qty,
      reason: item.reason,
      meal: item.meal,
      group: item.group
    }))
  ];

  if (mergedShoppingItemRows.length > 0) {
    const insertItemsResult = await supabase.from("weekly_plan_items").insert(mergedShoppingItemRows);

    if (insertItemsResult.error) {
      return NextResponse.json({ error: insertItemsResult.error.message }, { status: 500 });
    }
  }

  const refreshedShoppingNames = shoppingItems
    .map((item) => canonicalName(item.name))
    .filter(Boolean);
  const matchedSuggestionIds = (existingForgottenSuggestionsResult.data ?? [])
    .filter((suggestion) => {
      const suggestionName = canonicalName(suggestion.name);
      return suggestionName && refreshedShoppingNames.some((itemName) => isSimilarItem(itemName, suggestionName));
    })
    .map((suggestion) => suggestion.id);

  if (matchedSuggestionIds.length > 0) {
    const deleteSuggestionsResult = await supabase
      .from("weekly_plan_forgotten_suggestions")
      .delete()
      .in("id", matchedSuggestionIds)
      .eq("weekly_plan_id", body.weeklyPlanId);

    if (deleteSuggestionsResult.error) {
      return NextResponse.json({ error: deleteSuggestionsResult.error.message }, { status: 500 });
    }
  }

  revalidatePath("/");
  revalidatePath("/cadence");

  return NextResponse.json({ ok: true, saved: mealRows.length, itemsSaved: mergedShoppingItemRows.length });
}
