import { NextResponse } from "next/server";

import { isAllowedAuthEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CadenceKey, CadenceItem } from "@/lib/types";

type SaveCadenceRequest = {
  weeklyPlanId: string;
  cadence: Record<CadenceKey, CadenceItem[]>;
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
    return NextResponse.json({ error: "You are not allowed to edit cadence data." }, { status: 403 });
  }

  const body = (await request.json()) as SaveCadenceRequest;

  if (!body.weeklyPlanId) {
    return NextResponse.json({ error: "Missing weekly plan id." }, { status: 400 });
  }

  const cadenceRows = Object.entries(body.cadence).flatMap(([cadence, items]) =>
    items
      .filter((item) => item.name.trim().length > 0)
      .map((item, index) => ({
        weekly_plan_id: body.weeklyPlanId,
        position: index,
        cadence,
        name: item.name.trim(),
        qty: normalizeText(item.qty) ?? "",
        note: normalizeText(item.note) ?? ""
      }))
  );

  const deleteResult = await supabase
    .from("weekly_plan_cadence_items")
    .delete()
    .eq("weekly_plan_id", body.weeklyPlanId);

  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message }, { status: 500 });
  }

  if (cadenceRows.length === 0) {
    return NextResponse.json({ ok: true, saved: 0 });
  }

  const insertResult = await supabase.from("weekly_plan_cadence_items").insert(cadenceRows);

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: cadenceRows.length });
}
