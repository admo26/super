import recipeData from "@/data/recipes.json";

export type RecipeFrequency = "weekly" | "rotating" | "monthly_batch";

export type Recipe = {
  name: string;
  source: string;
  cookFrequency: RecipeFrequency;
  servingPattern: string;
  rotationNotes: string;
  ingredientsToMap: string[];
  swapFor?: string;
};

export function isBatchCook(recipe: Recipe) {
  return recipe.servingPattern === "used_weekly_with_pasta";
}

export function recipeFrequencyLabel(frequency: RecipeFrequency, swapFor?: string) {
  if (swapFor) return "Weekly swap";
  if (frequency === "monthly_batch") return "Batch cook";
  return frequency === "weekly" ? "Weekly" : "Rotating";
}

export async function getRecipes(): Promise<{ sourceLabel: string; recipes: Recipe[] }> {
  return {
    sourceLabel: "Repo JSON",
    recipes: recipeData as Recipe[]
  };
}
