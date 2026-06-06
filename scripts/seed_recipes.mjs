import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const recipesPath = path.join(repoRoot, "data", "recipes.json");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { persistSession: false }
});

const recipes = JSON.parse(await readFile(recipesPath, "utf8"));

const deleted = await supabase.from("recipes").delete().not("id", "is", null);
if (deleted.error) {
  console.error("Failed clearing recipes:", deleted.error.message);
  process.exit(1);
}

const inserted = await supabase.from("recipes").insert(
  recipes.map((recipe) => ({
    name: recipe.name,
    source: recipe.source,
    cook_frequency: recipe.cookFrequency,
    serving_pattern: recipe.servingPattern,
    rotation_notes: recipe.rotationNotes,
    ingredients_to_map: recipe.ingredientsToMap
  }))
);

if (inserted.error) {
  console.error("Failed inserting recipes:", inserted.error.message);
  process.exit(1);
}

console.log(`Seeded ${recipes.length} recipes into Supabase.`);
