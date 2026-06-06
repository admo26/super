import { generateNextWeeklyPlan } from "@/app/plan/actions";
import { getWeeklyPlan } from "@/lib/weekly-plan";

type HomePageProps = {
  searchParams?: Promise<{
    generated?: string;
    error?: string;
  }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const plan = await getWeeklyPlan();
  const generated = resolvedSearchParams.generated === "1";
  const error = resolvedSearchParams.error ?? null;

  const groupedItems = plan.items.reduce<Record<string, typeof plan.items>>((acc, item) => {
    const current = acc[item.group] ?? [];
    current.push(item);
    acc[item.group] = current;
    return acc;
  }, {});

  return (
    <main className="page-shell">
      {generated ? (
        <section className="notice-banner">
          New weekly plan generated from Supabase history and recipes.
        </section>
      ) : null}
      {error ? <section className="notice-banner notice-banner--error">{error}</section> : null}
      <section className="hero">
        <div>
          <p className="eyebrow">Weekly Planner</p>
          <h1>This Week&apos;s Grocery Run</h1>
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

          <aside className="hero-aside">
            <h2>Meal Line-up</h2>
            <div className="hero-pills">
              {plan.meals.map((meal) => (
                <span className="pill" key={meal.name}>
                  {meal.url ? (
                    <a href={meal.url} target="_blank" rel="noreferrer">
                      {meal.name}
                    </a>
                  ) : (
                    meal.name
                  )}
                </span>
              ))}
            </div>
            <p className="hero-note">{plan.analysisWindow}</p>
            <form action={generateNextWeeklyPlan} className="hero-actions">
              <button className="action-button" type="submit">
                Generate next week
              </button>
              <p className="action-note">Builds a new draft from imported history and the recipe list.</p>
            </form>
          </aside>
        </div>
      </section>

      <div className="content-grid">
        <div className="main-stack">
          <section className="panel">
            <div className="section-header">
              <div>
                <h2>Cadence Snapshot</h2>
                <p>Weekly, fortnightly, and monthly staples from the current plan source.</p>
              </div>
            </div>

            <div className="cadence-grid">
              {(["weekly", "fortnightly", "monthly"] as const).map((cadence) => (
                <article className="cadence-card" key={cadence}>
                  <h3>{cadence[0].toUpperCase() + cadence.slice(1)}</h3>
                  <ul>
                    {plan.cadence[cadence].map((item) => (
                      <li key={`${cadence}-${item.name}`}>
                        <span className="item-strong">
                          {item.name} · {item.qty}
                        </span>
                        <span>{item.note}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="section-header">
              <div>
                <h2>Meal Plan</h2>
                <p>Recipe links appear when a meal has a source URL.</p>
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
                <h2>Shopping List</h2>
                <p>This first Vercel version is read-only; editing can come once the database flow is live.</p>
              </div>
            </div>

            <div className="shopping-list">
              {plan.items.map((item) => (
                <article className="shopping-item" key={`${item.name}-${item.qty}`}>
                  <div>
                    <div className="shopping-name">{item.name}</div>
                    <div className="shopping-meta">Qty: {item.qty}</div>
                    <div className="shopping-meta">{item.meal}</div>
                  </div>
                  <span className="reason-tag">{item.reason}</span>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="side-stack">
          <section className="panel">
            <h2>Grouped For Shopping</h2>
            <div className="group-list">
              {Object.entries(groupedItems).map(([group, items]) => (
                <section className="group-card" key={group}>
                  <h3>{group}</h3>
                  <ul>
                    {items.map((item) => (
                      <li key={`${group}-${item.name}`}>
                        <strong>{item.name}</strong>
                        <span>{item.qty}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Assumptions</h2>
            <ul className="note-list">
              {plan.assumptions.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <h2>Quick Adjustments</h2>
            <ul className="check-list">
              {plan.adjustments.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
