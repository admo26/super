import { createClient } from "@supabase/supabase-js";

import recipeFallback from "@/data/recipes.json";

export type Recipe = {
  name: string;
  source: string;
  cookFrequency: string;
  servingPattern: string;
  rotationNotes: string;
  ingredientsToMap: string[];
};

type RecipeRow = {
  name: string;
  source: string;
  cook_frequency: string;
  serving_pattern: string;
  rotation_notes: string;
  ingredients_to_map: string[] | null;
};

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

function createSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } }
  );
}

function mapRecipeRow(row: RecipeRow): Recipe {
  return {
    name: row.name,
    source: row.source,
    cookFrequency: row.cook_frequency,
    servingPattern: row.serving_pattern,
    rotationNotes: row.rotation_notes,
    ingredientsToMap: row.ingredients_to_map ?? []
  };
}

export async function getRecipes(): Promise<{ sourceLabel: string; recipes: Recipe[] }> {
  if (!hasSupabaseConfig()) {
    return {
      sourceLabel: "Repo fallback",
      recipes: recipeFallback
    };
  }

  try {
    const supabase = createSupabase();
    const result = await supabase
      .from("recipes")
      .select("name, source, cook_frequency, serving_pattern, rotation_notes, ingredients_to_map")
      .order("name", { ascending: true });

    if (result.error || !result.data?.length) {
      return {
        sourceLabel: "Repo fallback",
        recipes: recipeFallback
      };
    }

    return {
      sourceLabel: "Supabase",
      recipes: result.data.map((row) => mapRecipeRow(row as RecipeRow))
    };
  } catch {
    return {
      sourceLabel: "Repo fallback",
      recipes: recipeFallback
    };
  }
}
