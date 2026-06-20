import Link from "next/link";

import { AdHocItemForm } from "@/app/order-items/ad-hoc-item-form";
import { deleteShoppingListItem } from "@/app/plan/actions";
import { getPendingAdHocItems, getWeeklyPlan, getWeeklyPlanSummaries } from "@/lib/weekly-plan";
import type { PendingAdHocItem, ShoppingItem } from "@/lib/types";

type HomePageProps = {
  searchParams?: Promise<{
    generated?: string;
    error?: string;
    week?: string;
  }>;
};

const reasonOrder = ["planned meal", "ad hoc", "weekly staple", "fortnightly staple", "monthly staple", "freezer batch", "pantry check"];

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

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

function PendingAdHocList({ items, targetWeek }: { items: PendingAdHocItem[]; targetWeek: string }) {
  if (!items.length) return null;

  return (
    <section className="pending-ad-hoc" aria-label="Pending ad hoc items">
      <div className="shopping-group__header">
        <span>Pending For Next Order</span>
        <span>{items.length}</span>
      </div>
      <div className="pending-ad-hoc__list">
        {items.map((item) => (
          <article className="shopping-item" key={item.id}>
            <div>
              <div className="shopping-name">{item.name}</div>
              <div className="shopping-meta">
                Qty: {item.qty} · saved for {targetWeek}
              </div>
            </div>
            <span className="reason-tag">Pending</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const generated = resolvedSearchParams.generated === "1";
  const error = resolvedSearchParams.error ?? null;
  const selectedWeek = resolvedSearchParams.week ?? null;
  const [plan, planSummaries] = await Promise.all([
    getWeeklyPlan(selectedWeek ?? undefined),
    getWeeklyPlanSummaries()
  ]);
  const selectedLabel = selectedWeek ? "Next Week Preview" : "Current Week";
  const pageTitle = selectedWeek ? "Next Week's Grocery Run" : "This Week's Meal Plan";
  const nextWeekSummary = selectedWeek
    ? null
    : planSummaries.find((summary) => summary.orderDate > plan.orderDate) ?? null;
  const shoppingPlan = nextWeekSummary ? await getWeeklyPlan(nextWeekSummary.orderDate) : plan;
  const adHocTargetWeek = selectedWeek ?? shoppingPlan.orderDate ?? addDays(plan.orderDate, 7);
  const pendingAdHocItems = !selectedWeek && !nextWeekSummary
    ? await getPendingAdHocItems(adHocTargetWeek)
    : [];
  const canEditShoppingList = Boolean(shoppingPlan.id);
  const groupedItems = groupItemsByReason(shoppingPlan.items);
  const isPreparingNextOrder = !selectedWeek && Boolean(nextWeekSummary);

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
          <h1>{pageTitle}</h1>
        </div>
        <div className="page-actions">
          {!selectedWeek && nextWeekSummary ? (
            <Link className="action-button" href={`/?week=${nextWeekSummary.orderDate}`}>
              View next meals
            </Link>
          ) : null}
          <Link className="ghost-button" href="/cadence?tab=next-week">
            Edit meals
          </Link>
        </div>
      </section>

      <div className="content-grid">
        <div className="dashboard-board">
          <section className="panel">
            <div className="section-header">
              <div>
                <h2>Meal Plan</h2>
                <p>Meals for the current week.</p>
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

          <section className="panel">
            <div className="section-header">
              <div>
                <h2>{isPreparingNextOrder ? "Next Order Shopping List" : "Shopping List"}</h2>
                <p>
                  {canEditShoppingList
                    ? isPreparingNextOrder
                      ? `Prep list for the ${shoppingPlan.orderDate} order.`
                      : "Online-order view grouped by why each item is needed."
                    : "Shopping list editing is available for saved Supabase-backed plans."}
                </p>
              </div>
              <AdHocItemForm targetWeek={adHocTargetWeek} />
            </div>

            <PendingAdHocList items={pendingAdHocItems} targetWeek={adHocTargetWeek} />

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
        </div>
      </div>
    </main>
  );
}
