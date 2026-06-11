import Link from "next/link";

import { deleteShoppingListItem, generateNextWeeklyPlan } from "@/app/plan/actions";
import { getWeeklyPlan } from "@/lib/weekly-plan";
import type { ShoppingItem } from "@/lib/types";

type HomePageProps = {
  searchParams?: Promise<{
    generated?: string;
    error?: string;
    week?: string;
  }>;
};

const reasonOrder = ["planned meal", "weekly staple", "fortnightly staple", "monthly staple", "freezer batch", "pantry check"];

function formatReason(value: string) {
  return value
    .split(" ")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}

function groupItemsByReason(items: ShoppingItem[]) {
  const grouped = items.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const key = item.reason || "other";
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});

  return Object.entries(grouped).sort(([left], [right]) => {
    const leftIndex = reasonOrder.indexOf(left);
    const rightIndex = reasonOrder.indexOf(right);
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex) || left.localeCompare(right);
  });
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const generated = resolvedSearchParams.generated === "1";
  const error = resolvedSearchParams.error ?? null;
  const selectedWeek = resolvedSearchParams.week ?? null;
  const plan = await getWeeklyPlan(selectedWeek ?? undefined);
  const selectedLabel = selectedWeek ? "Next Week Preview" : "Current Week";
  const canEditShoppingList = Boolean(plan.id);
  const groupedItems = groupItemsByReason(plan.items);

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
      <section className="page-header">
        <div>
          <p className="page-kicker">{selectedLabel}</p>
          <h1>This Week&apos;s Grocery Run</h1>
          <p className="page-summary">{plan.analysisWindow}</p>
        </div>
        <div className="page-actions">
          <form action={generateNextWeeklyPlan}>
            <button className="action-button" type="submit">
              Generate next week
            </button>
          </form>
          <Link className="ghost-button" href={selectedWeek ? `/cadence?week=${selectedWeek}` : "/cadence"}>
            Edit meals
          </Link>
        </div>
      </section>

      <section className="metric-strip" aria-label="Weekly plan summary">
        <article className="metric-card">
          <span className="metric-label">Order date</span>
          <strong>{plan.orderDate}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Meals</span>
          <strong>{plan.meals.length}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Items</span>
          <strong>{plan.items.length}</strong>
        </article>
      </section>

      <div className="content-grid">
        <div className="dashboard-board">
          <section className="panel">
            <div className="section-header">
              <div>
                <h2>Shopping List</h2>
                <p>
                  {canEditShoppingList
                    ? "Online-order view grouped by why each item is needed."
                    : "Shopping list editing is available for saved Supabase-backed plans."}
                </p>
              </div>
            </div>

            <div className="shopping-list">
              {groupedItems.map(([reason, items]) => (
                <section className="shopping-group" key={reason}>
                  <div className="shopping-group__header">
                    <span>{formatReason(reason)}</span>
                    <span>{items.length}</span>
                  </div>
                  {items.map((item) => (
                    <article className="shopping-item" key={item.id ?? `${item.name}-${item.qty}`}>
                      <div>
                        <div className="shopping-name">{item.name}</div>
                        <div className="shopping-meta">
                          Qty: {item.qty} · {item.meal}
                        </div>
                      </div>
                      <div className="shopping-item__actions">
                        <span className="reason-tag">{item.group}</span>
                        {item.id ? (
                          <form action={deleteShoppingListItem}>
                            <input type="hidden" name="itemId" value={item.id} />
                            {selectedWeek ? <input type="hidden" name="week" value={selectedWeek} /> : null}
                            <button className="ghost-button ghost-button--small" type="submit">
                              Remove
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <h2>Meal Plan</h2>
                <p>Meals driving this week&apos;s order.</p>
              </div>
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
        </div>
      </div>
    </main>
  );
}
