"use client";

import { useDeferredValue, useState } from "react";

import { recipeFrequencyLabel, type Recipe } from "@/lib/recipes";

type RecipeLibraryProps = {
  recipes: Recipe[];
};

function isUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function RecipeLibrary({ recipes }: RecipeLibraryProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const filteredRecipes = normalizedQuery
    ? recipes.filter((recipe) =>
        [
          recipe.name,
          recipe.cookFrequency,
          recipe.servingPattern,
          recipe.rotationNotes,
          recipe.ingredientsToMap.join(" ")
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : recipes;

  return (
    <>
      <div className="library-controls">
        <input
          className="library-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search meals or ingredients"
          aria-label="Search recipes"
        />
        <span className="status-tag status-tag--muted">{filteredRecipes.length} meals</span>
      </div>

      {filteredRecipes.length ? (
        <div className="recipe-grid">
          {filteredRecipes.map((recipe) => (
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
                    {recipeFrequencyLabel(recipe.cookFrequency)} · {recipe.servingPattern}
                  </p>
                </div>
                <span className="meal-type">{isUrl(recipe.source) ? "Linked" : "Standard"}</span>
              </div>

              <p className="meal-note">{recipe.rotationNotes}</p>

              <div className="ingredients-block">
                <strong>Shopping list ingredients</strong>
                <ul>
                  {recipe.ingredientsToMap.map((item) => (
                    <li key={`${recipe.name}-${item}`}>{item}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">No meals match that search yet.</div>
      )}
    </>
  );
}
