import { RecipeLibrary } from "@/app/recipes/recipe-library";
import { getRecipes } from "@/lib/recipes";

export default async function RecipesPage() {
  const { recipes } = await getRecipes();

  return (
    <main className="page-shell">
      <section className="page-header">
        <div>
          <p className="page-kicker">Recipes</p>
          <h1>Your regular dinner rotation</h1>
          <p className="page-summary">
            The meals you come back to, ready to use when planning the week ahead.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Recipes</h2>
            <p>Search by meal name, ingredient, or how often it tends to show up.</p>
          </div>
        </div>

        <RecipeLibrary recipes={recipes} />
      </section>
    </main>
  );
}
