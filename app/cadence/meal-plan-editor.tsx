"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { Meal } from "@/lib/types";
import { isBatchCook, type Recipe, type RecipeFrequency } from "@/lib/recipes";

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

function mealTypeFromFrequency(frequency: RecipeFrequency, batchCook: boolean) {
  if (frequency === "weekly") return "Weekly anchor";
  if (batchCook) return "Batch cook";
  return "Rotation meal";
}

function recipeToMeal(recipe: Recipe): EditableMeal {
  return {
    name: recipe.name,
    type: mealTypeFromFrequency(recipe.cookFrequency, isBatchCook(recipe)),
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
  const [saveMessage, setSaveMessage] = useState("Autosaves changes.");
  const [error, setError] = useState<string | null>(null);
  const hasMounted = useRef(false);
  const saveRequestId = useRef(0);

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

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    setError(null);
    setSaveMessage("Saving...");

    const requestId = saveRequestId.current + 1;
    saveRequestId.current = requestId;
    const timeoutId = window.setTimeout(async () => {
      try {
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

        if (requestId !== saveRequestId.current) return;

        if (!response.ok) {
          setSaveMessage("Autosave paused.");
          setError(payload.error ?? "Failed to save meal plan.");
          return;
        }

        setSaveMessage(`Saved ${payload.saved} meals and refreshed ${payload.itemsSaved} shopping rows.`);
      } catch {
        if (requestId !== saveRequestId.current) return;
        setSaveMessage("Autosave paused.");
        setError("Failed to save meal plan.");
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [draftMeals, weeklyPlanId]);

  return (
    <section className="panel cadence-editor">
      <div className="section-header cadence-editor__header">
        <div>
          <h2>Meal Lineup</h2>
          <p>{orderDate} · changes autosave and refresh the shopping list.</p>
        </div>
      </div>

      <div className="cadence-editor__meta">
        {analysisWindow ? <span className="status-tag status-tag--muted">{analysisWindow}</span> : null}
        {saveMessage ? <span className="success-text">{saveMessage}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>

      <div className="editor-card-list">
        {draftMeals.length ? (
          draftMeals.map((meal, index) => (
            <article className="editor-card" key={`meal-${index}`}>
              <div className="editor-card__fields editor-card__fields--meals">
                <div className="meal-editor__recipe-picker">
                  <label className="field-stack">
                    <span>Recipe</span>
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
                  </label>
                </div>
                <label className="field-stack">
                  <span>Type</span>
                  <input
                    className="import-input"
                    type="text"
                    value={meal.type}
                    onChange={(event) => updateMeal(index, "type", event.target.value)}
                    placeholder="Meal type"
                  />
                </label>
                <label className="field-stack">
                  <span>Note</span>
                  <textarea
                    className="import-textarea"
                    value={meal.note}
                    onChange={(event) => updateMeal(index, "note", event.target.value)}
                    placeholder="Meal note"
                    rows={2}
                  />
                </label>
              </div>
              <div className="editor-card__actions">
                <button className="ghost-button ghost-button--small" type="button" onClick={() => removeMeal(index)}>
                  Remove
                </button>
              </div>
            </article>
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
