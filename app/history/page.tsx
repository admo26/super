import { ImportHistoryManager } from "@/app/import/import-history-manager";
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
      <section className="page-header">
        <div>
          <p className="page-kicker">Order History</p>
          <h1>Your grocery history</h1>
          <p className="page-summary">
            A look back at past shops so Super can spot patterns and make smarter suggestions.
          </p>
        </div>
      </section>

      <ImportHistoryManager />

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Saved shops</h2>
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
                  <span className="reason-tag">{order.items.length} items</span>
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
                      <span>{item.itemName}</span>
                      <span>
                        {[item.quantity, item.unit].filter(Boolean).join(" ") || "—"}
                      </span>
                      <span>{item.category ?? "—"}</span>
                      <span>{item.notes ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No past orders yet. Import one to get started.</div>
        )}
      </section>
    </main>
  );
}
