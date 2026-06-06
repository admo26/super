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
      <section className="hero">
        <div>
          <p className="eyebrow">Order History</p>
          <h1>See What We Already Know</h1>
          <p className="hero-copy">
            Browse the imported grocery history that will drive cadence detection and future weekly order generation.
          </p>
        </div>

        <div className="hero-grid">
          <div className="hero-stats">
            <article className="stat-card">
              <span className="stat-label">Orders</span>
              <strong>{history.totalOrders}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Rows</span>
              <strong>{history.totalRows}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">First order</span>
              <strong>{history.earliestOrderDate ?? "—"}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Latest order</span>
              <strong>{history.latestOrderDate ?? "—"}</strong>
            </article>
          </div>

          <aside className="hero-aside">
            <h2>What This Unlocks</h2>
            <p className="hero-note">
              Once this history looks right, we can generate weekly orders from actual household buying patterns instead of only static seed data.
            </p>
          </aside>
        </div>
      </section>

      <section className="panel" style={{ marginTop: "18px" }}>
        <div className="section-header">
          <div>
            <h2>Imported Orders</h2>
            <p>Each card shows one saved order batch grouped by date and import source.</p>
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
          <p className="helper-text">
            No order history rows are available yet. Import a PDF/image or run the repo CSV seed to populate this page.
          </p>
        )}
      </section>
    </main>
  );
}
