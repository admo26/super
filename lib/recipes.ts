import recipeData from "@/data/recipes.json";

export type Recipe = {
  name: string;
  source: string;
  cookFrequency: string;
  servingPattern: string;
  rotationNotes: string;
  ingredientsToMap: string[];
};

export async function getRecipes(): Promise<{ sourceLabel: string; recipes: Recipe[] }> {
  return {
    sourceLabel: "Repo JSON",
    recipes: recipeData
  };
}
