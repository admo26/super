import { NextResponse } from "next/server";

import { isAllowedAuthEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CadenceKey, CadenceItem } from "@/lib/types";

type SaveCadenceRequest = {
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

  const cadenceRows = Object.entries(body.cadence).flatMap(([cadence, items]) =>
    items
      .filter((item) => item.name.trim().length > 0)
      .map((item, index) => ({
        position: index,
        cadence,
        name: item.name.trim(),
        qty: normalizeText(item.qty) ?? "",
        note: normalizeText(item.note) ?? ""
      }))
  );

  const deleteResult = await supabase
    .from("recurring_cadence_items")
    .delete()
    .gte("position", 0);

  if (deleteResult.error) {
    return NextResponse.json({ error: deleteResult.error.message }, { status: 500 });
  }

  if (cadenceRows.length === 0) {
    return NextResponse.json({ ok: true, saved: 0 });
  }

  const insertResult = await supabase.from("recurring_cadence_items").insert(cadenceRows);

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: cadenceRows.length });
}
