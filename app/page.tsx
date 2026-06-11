import Link from "next/link";

import { deleteShoppingListItem, generateNextWeeklyPlan } from "@/app/plan/actions";
import { getWeeklyPlan } from "@/lib/weekly-plan";

type HomePageProps = {
  searchParams?: Promise<{
    generated?: string;
    error?: string;
    week?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const generated = resolvedSearchParams.generated === "1";
  const error = resolvedSearchParams.error ?? null;
  const selectedWeek = resolvedSearchParams.week ?? null;
  const plan = await getWeeklyPlan(selectedWeek ?? undefined);
  const selectedLabel = selectedWeek ? "Next Week Preview" : "Current Week";
  const canEditShoppingList = Boolean(plan.id);

  return (
    <main className="page-shell">
      {generated ? (
        <section className="notice-banner">
          New weekly plan generated from Supabase history and recipes.
        </section>
      ) : null}
      {selectedWeek ? (
        <section className="notice-banner">
          Previewing the generated plan for {selectedWeek}. Use Current Week to jump back.
        </section>
      ) : null}
      {error ? <section className="notice-banner notice-banner--error">{error}</section> : null}
      <section className="hero">
        <div>
          <p className="eyebrow">Weekly Planner</p>
          <h1>This Week&apos;s Grocery Run</h1>
          <p className="hero-copy">{selectedLabel}</p>
        </div>

        <div className="hero-grid">
          <div className="hero-stats">
            <article className="stat-card">
              <span className="stat-label">Order date</span>
              <strong>{plan.orderDate}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Meals</span>
              <strong>{plan.meals.length}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Items</span>
              <strong>{plan.items.length}</strong>
            </article>
          </div>
        </div>

        <form action={generateNextWeeklyPlan} className="hero-actions hero-actions--inline">
          <button className="action-button" type="submit">
            Generate next week
          </button>
          <p className="hero-note">{plan.analysisWindow}</p>
        </form>
      </section>

      <div className="content-grid">
        <div className="main-stack">
          <section className="panel">
            <div className="section-header">
              <div>
                <h2>Meal Plan</h2>
                <p>Recipe links appear when a meal has a source URL.</p>
              </div>
              <Link className="ghost-button" href={selectedWeek ? `/cadence?week=${selectedWeek}` : "/cadence"}>
                Edit meals
              </Link>
            </div>

            <div className="meal-list">
              {plan.meals.map((meal) => (
                <article className="meal-card" key={meal.name}>
                  <div>
                    <div className="item-strong">
                      {meal.url ? (
                        <a className="recipe-link" href={meal.url} target="_blank" rel="noreferrer">
                          {meal.name}
                        </a>
                      ) : (
                        meal.name
                      )}
                    </div>
                    <p className="meal-note">{meal.note}</p>
                  </div>
                  <span className="meal-type">{meal.type}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <h2>Shopping List</h2>
                <p>
                  {canEditShoppingList
                    ? "Remove anything you do not need for this week."
                    : "Shopping list editing is available for saved Supabase-backed plans."}
                </p>
              </div>
            </div>

            <div className="shopping-list">
              {plan.items.map((item) => (
                <article className="shopping-item" key={item.id ?? `${item.name}-${item.qty}`}>
                  <div>
                    <div className="shopping-name">{item.name}</div>
                    <div className="shopping-meta">Qty: {item.qty}</div>
                    <div className="shopping-meta">{item.meal}</div>
                  </div>
                  <div className="shopping-item__actions">
                    <span className="reason-tag">{item.reason}</span>
                    {item.id ? (
                      <form action={deleteShoppingListItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        {selectedWeek ? <input type="hidden" name="week" value={selectedWeek} /> : null}
                        <button className="ghost-button ghost-button--small" type="submit">
                          Delete
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
