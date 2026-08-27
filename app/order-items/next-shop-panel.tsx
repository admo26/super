import { ShoppingBasket, Trash2 } from "lucide-react";

import { AdHocItemForm } from "@/app/order-items/ad-hoc-item-form";
import { ForgottenSuggestionsList } from "@/app/order-items/forgotten-suggestions-list";
import { deleteShoppingListItem } from "@/app/plan/actions";
import { Panel, Tag } from "@/app/ui";
import { formatHumanDate } from "@/lib/date-format";
import type { PendingAdHocItem, ShoppingItem, WeeklyPlan } from "@/lib/types";

type NextShopPanelProps = {
  plan: WeeklyPlan;
  pendingAdHocItems?: PendingAdHocItem[];
  returnTo?: string;
};

const reasonOrder = [
  "planned meal",
  "ad hoc",
  "weekly staple",
  "fortnightly staple",
  "monthly staple",
  "freezer batch",
  "pantry check"
];

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
        <span>Saved for the next shop</span>
        <span>{items.length}</span>
      </div>
      <div className="pending-ad-hoc__list">
        {items.map((item) => (
          <article className="shopping-item" key={item.id}>
            <div>
              <div className="shopping-name">{item.name}</div>
              <div className="shopping-meta">
                Qty: {item.qty} · saved for {formatHumanDate(targetWeek)}
              </div>
            </div>
            <Tag tone="info">Pending</Tag>
          </article>
        ))}
      </div>
    </section>
  );
}

export function NextShopPanel({
  plan,
  pendingAdHocItems = [],
  returnTo = "/cadence"
}: NextShopPanelProps) {
  const canEditShoppingList = Boolean(plan.id);
  const groupedItems = groupItemsByReason(plan.items);

  return (
    <Panel tone="tinted">
      <div className="section-header">
        <div>
          <h2><ShoppingBasket aria-hidden="true" size={19} /> Next shop</h2>
          <p>
            {canEditShoppingList
              ? `Everything you need for the ${formatHumanDate(plan.orderDate)} order.`
              : "List editing is available once this plan has been saved."}
          </p>
        </div>
        <AdHocItemForm targetWeek={plan.orderDate} />
      </div>

      <PendingAdHocList items={pendingAdHocItems} targetWeek={plan.orderDate} />

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
                  <Tag category={item.group}>{item.group}</Tag>
                  {item.id ? (
                    <form action={deleteShoppingListItem}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <button className="ghost-button ghost-button--small" type="submit">
                        <Trash2 aria-hidden="true" />
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

      <ForgottenSuggestionsList
        canAdd={canEditShoppingList}
        suggestions={plan.forgottenSuggestions}
        targetWeek={plan.orderDate}
      />
    </Panel>
  );
}
