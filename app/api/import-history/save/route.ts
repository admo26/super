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

  const result = await supabase.from("order_history_items").insert(
    body.items.map((item) => ({
      order_date: item.order_date,
      item_name: item.item_name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      notes: item.notes,
      source_type: "file_import",
      source_name: body.source_name
    }))
  );

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

  return NextResponse.json({ ok: true, saved: body.items.length });
}
