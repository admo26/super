import { RecipeLibrary } from "@/app/recipes/recipe-library";
import { getRecipes } from "@/lib/recipes";

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

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

      <section className="metric-strip" aria-label="Recipe summary">
        <article className="metric-card">
          <span className="metric-label">Recipes</span>
          <strong>{recipes.length}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Linked</span>
          <strong>{recipes.filter((recipe) => isUrl(recipe.source)).length}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Family standards</span>
          <strong>{recipes.filter((recipe) => !isUrl(recipe.source)).length}</strong>
        </article>
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
