import { RecipeLibrary } from "@/app/recipes/recipe-library";
import { getRecipes } from "@/lib/recipes";

export default async function RecipesPage() {
  const { recipes } = await getRecipes();

  return (
    <main className="page-shell">
      <section className="page-header">
        <div>
          <p className="page-kicker">Recipe Library</p>
          <h1>Family Rotation Meals</h1>
          <p className="page-summary">
            The source list for meal planning and ingredient mapping.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Library</h2>
            <p>Search by meal, cadence, serving pattern, or ingredient.</p>
          </div>
        </div>

        <RecipeLibrary recipes={recipes} />
      </section>
    </main>
  );
}
