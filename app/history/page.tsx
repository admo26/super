import { getOrderHistory } from "@/lib/order-history";

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
          <h1>Imported Grocery Data</h1>
          <p className="page-summary">
            Review the order rows used for cadence detection and weekly plan generation.
          </p>
        </div>
      </section>

      <section className="metric-strip" aria-label="Order history summary">
        <article className="metric-card">
          <span className="metric-label">Orders</span>
          <strong>{history.totalOrders}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Rows</span>
          <strong>{history.totalRows}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Window</span>
          <strong>{history.earliestOrderDate ?? "—"} to {history.latestOrderDate ?? "—"}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2>Saved Orders</h2>
            <p>Grouped by order date and import source.</p>
          </div>
        </div>

        {history.orders.length ? (
          <div className="history-list">
            {history.orders.map((order) => (
              <article className="history-card" key={`${order.orderDate}-${order.sourceType}-${order.sourceName ?? "none"}`}>
                <div className="history-card__header">
                  <div>
                    <div className="item-strong">{order.orderDate}</div>
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
          <div className="empty-state">No order history rows are available yet.</div>
        )}
      </section>
    </main>
  );
}
