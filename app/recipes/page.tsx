import { getRecipes } from "@/lib/recipes";

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export default async function RecipesPage() {
  const { recipes } = await getRecipes();

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Recipes</p>
          <h1>Family Rotation Meals</h1>
          <p className="hero-copy">
            One place for the family-standard meals, linked recipes, cadence notes, and shopping ingredients that drive the weekly planner.
          </p>
        </div>

        <div className="hero-grid">
          <div className="hero-stats">
            <article className="stat-card">
              <span className="stat-label">Recipes</span>
              <strong>{recipes.length}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Linked</span>
              <strong>{recipes.filter((recipe) => isUrl(recipe.source)).length}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Custom</span>
              <strong>{recipes.filter((recipe) => !isUrl(recipe.source)).length}</strong>
            </article>
          </div>

          <aside className="hero-aside">
            <h2>What This Drives</h2>
            <p className="hero-note">
              These recipes are the planning inputs for weekly meals, ingredient overlap, and future WhatsApp-driven additions.
            </p>
          </aside>
        </div>
      </section>

      <section className="panel" style={{ marginTop: "18px" }}>
        <div className="section-header">
          <div>
            <h2>Recipe Library</h2>
            <p>Each card shows cadence, notes, and the ingredient mapping used by the planner.</p>
          </div>
        </div>

        <div className="recipe-grid">
          {recipes.map((recipe) => (
            <article className="recipe-card" key={recipe.name}>
              <div className="recipe-top">
                <div>
                  <h3 className="recipe-title">
                    {isUrl(recipe.source) ? (
                      <a className="recipe-link" href={recipe.source} target="_blank" rel="noreferrer">
                        {recipe.name}
                      </a>
                    ) : (
                      recipe.name
                    )}
                  </h3>
                  <p className="recipe-meta">
                    {recipe.cookFrequency} · {recipe.servingPattern}
                  </p>
                </div>
                <span className="meal-type">{isUrl(recipe.source) ? "Linked recipe" : "Family standard"}</span>
              </div>

              <p className="meal-note">{recipe.rotationNotes}</p>

              <div className="ingredients-block">
                <strong>Ingredients to map</strong>
                <ul>
                  {recipe.ingredientsToMap.map((item) => (
                    <li key={`${recipe.name}-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
