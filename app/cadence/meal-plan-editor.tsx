"use client";

import { useMemo, useState, useTransition } from "react";

import type { Meal } from "@/lib/types";
import type { Recipe } from "@/lib/recipes";

type EditableMeal = Meal;

type MealPlanEditorProps = {
  weeklyPlanId: string;
  orderDate: string;
  analysisWindow: string | null;
  initialMeals: EditableMeal[];
  recipes: Recipe[];
};

type RecipeOption = {
  name: string;
  type: string;
  note: string;
  url?: string;
};

function cloneMeals(meals: EditableMeal[]) {
  return meals.map((meal) => ({ ...meal }));
}

function mealTypeFromFrequency(frequency: string) {
  if (frequency === "weekly") return "Weekly anchor";
  if (frequency === "fortnightly") return "Fortnightly rotation";
  if (frequency === "monthly_batch") return "Batch cook";
  return "Rotation meal";
}

function recipeToMeal(recipe: Recipe): EditableMeal {
  return {
    name: recipe.name,
    type: mealTypeFromFrequency(recipe.cookFrequency),
    note: recipe.rotationNotes,
    url: recipe.source.startsWith("http") ? recipe.source : undefined
  };
}

function createEmptyMeal(): EditableMeal {
  return {
    name: "",
    type: "Rotation meal",
    note: "",
    url: undefined
  };
}

function toRecipeOptions(recipes: Recipe[]): RecipeOption[] {
  return recipes
    .map((recipe) => recipeToMeal(recipe))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function MealPlanEditor({
  weeklyPlanId,
  orderDate,
  analysisWindow,
  initialMeals,
  recipes
}: MealPlanEditorProps) {
  const [draftMeals, setDraftMeals] = useState(() => cloneMeals(initialMeals));
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const recipeOptions = useMemo(() => toRecipeOptions(recipes), [recipes]);

  function updateMeal(index: number, field: keyof EditableMeal, value: string) {
    setDraftMeals((current) =>
      current.map((meal, currentIndex) =>
        currentIndex === index
          ? {
              ...meal,
              [field]: value
            }
          : meal
      )
    );
  }

  function swapMeal(index: number, selectedName: string) {
    if (!selectedName) {
      setDraftMeals((current) =>
        current.map((meal, currentIndex) => (currentIndex === index ? createEmptyMeal() : meal))
      );
      return;
    }

    const recipe = recipeOptions.find((option) => option.name === selectedName);
    if (!recipe) return;

    setDraftMeals((current) =>
      current.map((meal, currentIndex) =>
        currentIndex === index
          ? {
              name: recipe.name,
              type: recipe.type,
              note: recipe.note,
              url: recipe.url
            }
          : meal
      )
    );
  }

  function addMeal() {
    setDraftMeals((current) => [...current, createEmptyMeal()]);
  }

  function removeMeal(index: number) {
    setDraftMeals((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function resetMeals() {
    setDraftMeals(cloneMeals(initialMeals));
    setSaveMessage(null);
    setError(null);
  }

  function saveMeals() {
    setError(null);
    setSaveMessage(null);

    startSaving(async () => {
      const response = await fetch("/api/meals/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          weeklyPlanId,
          meals: draftMeals
        })
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload.error ?? "Failed to save meal plan.");
        return;
      }

      setSaveMessage(`Saved ${payload.saved} meal rows and refreshed ${payload.itemsSaved} shopping list rows.`);
    });
  }

  return (
    <section className="panel cadence-editor">
      <div className="section-header cadence-editor__header">
        <div>
          <h2>Meal Lineup</h2>
          <p>{orderDate} · saving meals refreshes the shopping list.</p>
        </div>
        <div className="cadence-editor__actions">
          <button className="ghost-button" type="button" onClick={resetMeals}>
            Reset draft
          </button>
          <button className="action-button" type="button" onClick={saveMeals} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save meals"}
          </button>
        </div>
      </div>

      <div className="cadence-editor__meta">
        {analysisWindow ? <span className="status-tag status-tag--muted">{analysisWindow}</span> : null}
        {saveMessage ? <span className="success-text">{saveMessage}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>

      <div className="cadence-editor__table">
        <div className="cadence-editor__head cadence-editor__head--meals">
          <span>Recipe</span>
          <span>Type</span>
          <span>Note</span>
          <span>Action</span>
        </div>

        {draftMeals.length ? (
          draftMeals.map((meal, index) => (
            <div className="cadence-editor__row cadence-editor__row--meals" key={`meal-${index}`}>
              <div className="meal-editor__recipe-picker">
                <select
                  className="import-input"
                  value={meal.name}
                  onChange={(event) => swapMeal(index, event.target.value)}
                >
                  <option value="">Remove this slot</option>
                  {meal.name && !recipeOptions.some((option) => option.name === meal.name) ? (
                    <option value={meal.name}>{meal.name} (current custom)</option>
                  ) : null}
                  {recipeOptions.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <input
                  className="import-input"
                  type="text"
                  value={meal.name}
                  onChange={(event) => updateMeal(index, "name", event.target.value)}
                  placeholder="Meal name"
                />
              </div>
              <input
                className="import-input"
                type="text"
                value={meal.type}
                onChange={(event) => updateMeal(index, "type", event.target.value)}
                placeholder="Meal type"
              />
              <textarea
                className="import-textarea"
                value={meal.note}
                onChange={(event) => updateMeal(index, "note", event.target.value)}
                placeholder="Meal note"
                rows={2}
              />
              <button className="ghost-button ghost-button--small" type="button" onClick={() => removeMeal(index)}>
                Remove
              </button>
            </div>
          ))
        ) : (
          <div className="cadence-editor__empty">
            No meals are saved for this week yet. Add one from the recipe list to get started.
          </div>
        )}
      </div>

      <div className="import-footer">
        <p className="helper-text">Recipe-backed meals add mapped ingredients automatically.</p>
        <button className="ghost-button" type="button" onClick={addMeal}>
          Add meal slot
        </button>
      </div>
    </section>
  );
}
