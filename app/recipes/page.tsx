import Link from "next/link";

import { syncRecipesToSupabase } from "@/app/recipes/actions";
import { isAllowedAuthEmail } from "@/lib/auth";
import { getRecipes } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RecipesPageProps = {
  searchParams?: Promise<{
    synced?: string;
    error?: string;
  }>;
};

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const synced = resolvedSearchParams.synced === "1";
  const error = resolvedSearchParams.error ?? null;
  const supabase = hasSupabaseConfig() ? await createClient() : null;
  const userResult = supabase ? await supabase.auth.getUser() : null;
  const user = userResult?.data.user ?? null;
  const canSyncRecipes = isAllowedAuthEmail(user?.email);
  const { recipes } = await getRecipes();

  return (
    <main className="page-shell">
      {synced ? (
        <section className="notice-banner">
          Recipes synced to Supabase. Refresh complete.
        </section>
      ) : null}
      {error ? <section className="notice-banner notice-banner--error">{error}</section> : null}
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
            {canSyncRecipes ? (
              <form action={syncRecipesToSupabase} className="hero-actions">
                <button className="action-button" type="submit">
                  Sync recipes to Supabase
                </button>
                <p className="action-note">Push the repo recipe seed data into the hosted app database.</p>
              </form>
            ) : hasSupabaseConfig() ? (
              <p className="hero-note" style={{ marginTop: "14px" }}>
                <Link href="/login">Sign in</Link> with a household account to sync recipe changes to Supabase.
              </p>
            ) : null}
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
