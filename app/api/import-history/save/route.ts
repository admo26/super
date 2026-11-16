import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import type { ParsedOrderHistoryPayload } from "@/lib/order-import";
import { createClient as createAuthClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const authSupabase = await createAuthClient();
  const {
    data: { user }
  } = await authSupabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecret) {
    return NextResponse.json({ error: "Supabase server credentials are not configured." }, { status: 500 });
  }

  const body = (await request.json()) as ParsedOrderHistoryPayload;

  if (!body.items?.length) {
    return NextResponse.json({ error: "No parsed rows to save." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false }
  });

  const items = body.items.map((item) => ({
    order_date: item.order_date,
    item_name: item.item_name,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    notes: item.notes,
    source_type: "file_import",
    source_name: body.source_name
  }));

  // Dedupe: a re-saved draft (double click, retry, raced save) must not
  // insert the same rows twice. Match on the full row content for this
  // source file and skip anything already stored.
  type DedupeRow = {
    order_date: string | null;
    item_name: string;
    quantity: string | null;
    unit: string | null;
    category: string | null;
    notes: string | null;
  };
  const itemKey = (item: DedupeRow) =>
    [
      item.order_date ?? "",
      item.item_name,
      item.quantity ?? "",
      item.unit ?? "",
      item.category ?? "",
      item.notes ?? ""
    ].join("\u0000");

  const { data: existingRows, error: lookupError } = await supabase
    .from("order_history_items")
    .select("order_date, item_name, quantity, unit, category, notes")
    .eq("source_type", "file_import")
    .eq("source_name", body.source_name);

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }

  const existingKeys = new Set((existingRows ?? []).map(itemKey));
  const newItems = items.filter((item) => !existingKeys.has(itemKey(item)));
  const skipped = items.length - newItems.length;

  if (!newItems.length) {
    return NextResponse.json({ ok: true, saved: 0, skipped });
  }

  const result = await supabase.from("order_history_items").insert(newItems);

  if (result.error) {
    if (result.error.message.includes("Could not find the table 'public.order_history_items'")) {
      return NextResponse.json(
        {
          error:
            "Supabase is missing the order_history_items table. Run the latest order history SQL from supabase/schema.sql in the Supabase SQL Editor, then try saving again."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, saved: newItems.length, skipped });
}
