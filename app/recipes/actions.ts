"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

import recipeSeedData from "@/data/recipes.json";
import { isAllowedAuthEmail } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function encodeError(message: string) {
  return encodeURIComponent(message);
}

function redirectWithError(message: string) {
  redirect(`/recipes?error=${encodeError(message)}`);
}

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY ?? null;

  if (!supabaseUrl || !supabaseSecret) {
    redirectWithError("Supabase admin credentials are not configured.");
  }

  return createSupabaseAdminClient(supabaseUrl!, supabaseSecret!, {
    auth: { persistSession: false }
  });
}

export async function syncRecipesToSupabase() {
  const authSupabase = await createClient();
  const {
    data: { user }
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/recipes")}&error=${encodeError("Please sign in first.")}`);
  }

  if (!isAllowedAuthEmail(user.email)) {
    redirect("/unauthorized");
  }

  const supabase = createAdminClient();

  const deleted = await supabase.from("recipes").delete().not("id", "is", null);
  if (deleted.error) {
    redirectWithError(`Failed clearing recipes: ${deleted.error.message}`);
  }

  const inserted = await supabase.from("recipes").insert(
    recipeSeedData.map((recipe) => ({
      name: recipe.name,
      source: recipe.source,
      cook_frequency: recipe.cookFrequency,
      serving_pattern: recipe.servingPattern,
      rotation_notes: recipe.rotationNotes,
      ingredients_to_map: recipe.ingredientsToMap
    }))
  );

  if (inserted.error) {
    redirectWithError(`Failed inserting recipes: ${inserted.error.message}`);
  }

  revalidatePath("/recipes");
  redirect("/recipes?synced=1");
}
