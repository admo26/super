import { History, PackageSearch } from "lucide-react";

import { ImportHistoryManager } from "@/app/import/import-history-manager";
import { EmptyState, PageHeader, Panel, Tag } from "@/app/ui";
import { getOrderHistory } from "@/lib/order-history";
import { formatHumanDate } from "@/lib/date-format";

function formatSourceLabel(sourceType: string) {
  if (sourceType === "repo_csv") return "Repo CSV";
  if (sourceType === "file_import") return "PDF/Image import";
  return sourceType.replaceAll("_", " ");
}

export default async function OrderHistoryPage() {
  const history = await getOrderHistory();

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Order History"
        title="Your grocery history"
        summary="A look back at past shops so Super can spot patterns and make smarter suggestions."
      />

      <ImportHistoryManager />

      <Panel>
        <div className="section-header">
          <div>
            <h2><History aria-hidden="true" size={19} /> Saved shops</h2>
            <p>Grouped by order date and where they came from.</p>
          </div>
        </div>

        {history.orders.length ? (
          <div className="history-list">
            {history.orders.map((order) => (
              <article className="history-card" key={`${order.orderDate}-${order.sourceType}-${order.sourceName ?? "none"}`}>
                <div className="history-card__header">
                  <div>
                    <div className="item-strong">{formatHumanDate(order.orderDate, { includeYear: true })}</div>
                    <p className="shopping-meta">
                      {formatSourceLabel(order.sourceType)}
                      {order.sourceName ? ` · ${order.sourceName}` : ""}
                    </p>
                  </div>
                  <Tag tone="info">{order.items.length} items</Tag>
                </div>

                <div className="history-table">
                  <div className="history-table__head">
                    <span>Item</span>
                    <span>Qty</span>
                    <span>Category</span>
                    <span>Notes</span>
                  </div>

                  {order.items.map((item, index) => (
                    <div className="history-table__row" key={`${order.orderDate}-${item.itemName}-${index}`}>
                      <span data-label="Item">{item.itemName}</span>
                      <span data-label="Qty">
                        {[item.quantity, item.unit].filter(Boolean).join(" ") || "—"}
                      </span>
                      <span data-label="Category">
                        {item.category ? <Tag category={item.category}>{item.category}</Tag> : "—"}
                      </span>
                      <span data-label="Notes">{item.notes ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={<PackageSearch aria-hidden="true" />}>No past orders yet. Import one to get started.</EmptyState>
        )}
      </Panel>
    </main>
  );
}
