import { NextResponse } from "next/server";

import { isAllowedAuthEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Meal } from "@/lib/types";

type SaveMealsRequest = {
  weeklyPlanId: string;
  meals: Meal[];
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

  const mealRows = body.meals
    .filter((meal) => meal.name.trim().length > 0)
    .map((meal, index) => ({
      weekly_plan_id: body.weeklyPlanId,
      position: index,
      name: meal.name.trim(),
      type: meal.type.trim(),
      note: normalizeText(meal.note) ?? "",
      recipe_url: normalizeText(meal.url)
    }));

  const deleteResult = await supabase
    .from("weekly_plan_meals")
    .delete()
    .eq("weekly_plan_id", body.weeklyPlanId);

  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message }, { status: 500 });
  }

  if (mealRows.length === 0) {
    return NextResponse.json({ ok: true, saved: 0 });
  }

  const insertResult = await supabase.from("weekly_plan_meals").insert(mealRows);

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: mealRows.length });
}
