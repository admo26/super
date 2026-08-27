import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isAllowedAuthEmail } from "@/lib/auth";
import { formatHumanDate } from "@/lib/date-format";
import { createClient } from "@/lib/supabase/server";

type AdHocItemRequest = {
  name?: string;
  qty?: string;
  group?: string;
  suggestionId?: string;
  week?: string;
};

type PlanRow = {
  id: string;
  order_date: string;
};

type PositionRow = {
  position: number;
};

type ForgottenSuggestionRow = {
  id: string;
  name: string;
  qty: string;
  group: string;
};

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function getTodayInPacificAuckland() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

async function resolveTargetWeek(supabase: Awaited<ReturnType<typeof createClient>>, requestedWeek: string | null) {
  if (requestedWeek) return requestedWeek;

  const today = getTodayInPacificAuckland();
  const latestCurrentPlan = await supabase
    .from("weekly_plans")
    .select("order_date")
    .lt("order_date", today)
    .order("order_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestCurrentPlan.error) {
    throw new Error(latestCurrentPlan.error.message);
  }

  const latestAnyPlan = latestCurrentPlan.data?.order_date
    ? null
    : await supabase
        .from("weekly_plans")
        .select("order_date")
        .order("order_date", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (latestAnyPlan?.error) {
    throw new Error(latestAnyPlan.error.message);
  }

  const baseDate = latestCurrentPlan.data?.order_date ?? latestAnyPlan?.data?.order_date ?? today;
  return addDays(baseDate, 7);
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
    return NextResponse.json({ error: "You are not allowed to add order items." }, { status: 403 });
  }

  const body = (await request.json()) as AdHocItemRequest;
  const requestedName = body.name?.trim();
  const requestedQty = body.qty?.trim();
  const requestedGroup = body.group?.trim();
  const suggestionId = body.suggestionId?.trim();

  const targetWeek = await resolveTargetWeek(supabase, body.week?.trim() || null);
  const planResult = await supabase
    .from("weekly_plans")
    .select("id, order_date")
    .eq("order_date", targetWeek)
    .maybeSingle()
    .returns<PlanRow>();

  if (planResult.error) {
    return NextResponse.json({ error: planResult.error.message }, { status: 500 });
  }

  let itemToAdd = {
    name: requestedName ?? "",
    qty: requestedQty || "1",
    group: requestedGroup || "Other",
    meal: "Added during week"
  };

  if (suggestionId) {
    if (!planResult.data?.id) {
      return NextResponse.json({ error: "Suggestion quick add is only available for saved plans." }, { status: 400 });
    }

    const suggestionResult = await supabase
      .from("weekly_plan_forgotten_suggestions")
      .select("id, name, qty, \"group\"")
      .eq("id", suggestionId)
      .eq("weekly_plan_id", planResult.data.id)
      .maybeSingle()
      .returns<ForgottenSuggestionRow>();

    if (suggestionResult.error) {
      return NextResponse.json({ error: suggestionResult.error.message }, { status: 500 });
    }

    if (!suggestionResult.data) {
      return NextResponse.json({ error: "That suggestion is no longer available." }, { status: 404 });
    }

    itemToAdd = {
      name: suggestionResult.data.name,
      qty: suggestionResult.data.qty,
      group: suggestionResult.data.group,
      meal: "Forgotten-item suggestion"
    };
  }

  if (!itemToAdd.name) {
    return NextResponse.json({ error: "Enter an item first." }, { status: 400 });
  }

  if (planResult.data?.id) {
    const latestPosition = await supabase
      .from("weekly_plan_items")
      .select("position")
      .eq("weekly_plan_id", planResult.data.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle()
      .returns<PositionRow>();

    if (latestPosition.error) {
      return NextResponse.json({ error: latestPosition.error.message }, { status: 500 });
    }

    const insertResult = await supabase
      .from("weekly_plan_items")
      .insert({
        weekly_plan_id: planResult.data.id,
        position: (latestPosition.data?.position ?? -1) + 1,
        name: itemToAdd.name,
        qty: itemToAdd.qty,
        reason: "ad hoc",
        meal: itemToAdd.meal,
        group: itemToAdd.group
      })
      .select("id, name, qty, reason, meal, group")
      .single();

    if (insertResult.error) {
      return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
    }

    if (suggestionId) {
      const deleteSuggestionResult = await supabase
        .from("weekly_plan_forgotten_suggestions")
        .delete()
        .eq("id", suggestionId)
        .eq("weekly_plan_id", planResult.data.id);

      if (deleteSuggestionResult.error) {
        return NextResponse.json({ error: deleteSuggestionResult.error.message }, { status: 500 });
      }
    }

    revalidatePath("/");
    revalidatePath("/cadence");
    return NextResponse.json({
      ok: true,
      status: "added-to-plan",
      message: `Added to ${formatHumanDate(targetWeek)}.`,
      item: insertResult.data
    });
  }

  const pendingResult = await supabase
    .from("pending_ad_hoc_items")
    .insert({
      name: itemToAdd.name,
      qty: itemToAdd.qty,
      target_order_date: targetWeek
    })
    .select("id, name, qty, target_order_date, created_at")
    .single();

  if (pendingResult.error) {
    return NextResponse.json({ error: pendingResult.error.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/cadence");
  return NextResponse.json({
    ok: true,
    status: "pending",
    message: `Saved for ${formatHumanDate(targetWeek)}.`,
    item: pendingResult.data
  });
}
