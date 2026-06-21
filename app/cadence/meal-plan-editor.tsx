"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { Button, Panel, Tag } from "@/app/ui";
import { formatHumanDate } from "@/lib/date-format";
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
  const [saveMessage, setSaveMessage] = useState("Changes save automatically.");
  const [error, setError] = useState<string | null>(null);
  const hasMounted = useRef(false);
  const saveRequestId = useRef(0);

  const recipeOptions = useMemo(() => toRecipeOptions(recipes), [recipes]);

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
          setSaveMessage("Auto-save paused.");
          setError(payload.error ?? "Failed to save meal plan.");
          return;
        }

        setSaveMessage(`Saved ${payload.saved} meals and refreshed ${payload.itemsSaved} shopping list items.`);
      } catch {
        if (requestId !== saveRequestId.current) return;
        setSaveMessage("Auto-save paused.");
        setError("Failed to save meal plan.");
      }
    }, 800);

    return () => window.clearTimeout(timeoutId);
  }, [draftMeals, weeklyPlanId]);

  return (
    <Panel className="cadence-editor">
      <div className="section-header cadence-editor__header">
        <div>
          <h2>Next week&apos;s dinners</h2>
          <p>{formatHumanDate(orderDate)} · update the lineup here and your shopping list will keep up.</p>
        </div>
      </div>

      <div className="cadence-editor__meta">
        {saveMessage ? <Tag tone="success"><Save aria-hidden="true" size={14} /> {saveMessage}</Tag> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>

      <div className="editor-card-list">
        {draftMeals.length ? (
          draftMeals.map((meal, index) => (
            <article className="editor-card" key={`meal-${index}`}>
              <div className="editor-card__fields editor-card__fields--meals">
                <select
                  className="ui-input meal-editor__select"
                  value={meal.name}
                  onChange={(event) => swapMeal(index, event.target.value)}
                  aria-label={`Dinner ${index + 1}`}
                >
                  <option value="">Choose a meal</option>
                  {meal.name && !recipeOptions.some((option) => option.name === meal.name) ? (
                    <option value={meal.name}>{meal.name} (current custom)</option>
                  ) : null}
                  {recipeOptions.map((option) => (
                    <option key={option.name} value={option.name}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <div className="meal-editor__details">
                  <Tag className="meal-editor__type" category={meal.type}>
                    {meal.type}
                  </Tag>
                  {meal.note ? <p className="meal-note meal-editor__note">{meal.note}</p> : null}
                </div>
              </div>
              <div className="editor-card__actions">
                <Button
                  className="ghost-button--small"
                  icon={<Trash2 aria-hidden="true" />}
                  variant="danger"
                  type="button"
                  onClick={() => removeMeal(index)}
                >
                  Remove
                </Button>
              </div>
            </article>
          ))
        ) : (
          <div className="cadence-editor__empty">
            Nothing is lined up yet. Add a meal to start building next week.
          </div>
        )}
      </div>

      <div className="import-footer">
        <p className="helper-text">Pick from your saved recipes and the shopping list will update for you.</p>
        <Button icon={<Plus aria-hidden="true" />} variant="secondary" type="button" onClick={addMeal}>
          Add a meal
        </Button>
      </div>
    </Panel>
  );
}
