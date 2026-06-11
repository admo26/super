import Link from "next/link";

import { CadenceEditor } from "@/app/cadence/cadence-editor";
import { MealPlanEditor } from "@/app/cadence/meal-plan-editor";
import { getRecipes } from "@/lib/recipes";
import { getEditableWeeklyPlan, getWeeklyPlanSummaries } from "@/lib/weekly-plan";

type CadencePageProps = {
  searchParams?: Promise<{
    week?: string;
  }>;
};

function getTodayInPacificAuckland() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export default async function CadencePage({ searchParams }: CadencePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const today = getTodayInPacificAuckland();
  const summaries = await getWeeklyPlanSummaries();
  const { recipes } = await getRecipes();
  const selectedWeek =
    resolvedSearchParams.week ??
    summaries.filter((plan) => plan.orderDate <= today).at(-1)?.orderDate ??
    summaries.at(-1)?.orderDate ??
    null;
  const plan = selectedWeek ? await getEditableWeeklyPlan(selectedWeek) : null;

  return (
    <main className="page-shell">
      <section className="page-header">
        <div>
          <p className="page-kicker">Planning Settings</p>
          <h1>Meals And Recurring Items</h1>
          <p className="page-summary">
            Tune the selected week, recurring staples, and meal lineup that generate the order.
          </p>
        </div>
        <Link className="ghost-button" href="/">
          Back to current week
        </Link>
      </section>

      <section className="metric-strip" aria-label="Planner summary">
        <article className="metric-card">
          <span className="metric-label">Plans</span>
          <strong>{summaries.length}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Selected week</span>
          <strong>{selectedWeek ?? "None"}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Status</span>
          <strong>{plan ? "Editable" : "Empty"}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-header cadence-page__header">
          <div>
            <h2>Week Switcher</h2>
            <p>Pick the saved plan to inspect or edit.</p>
          </div>
        </div>

        <div className="cadence-plan-pills">
          {summaries.length ? (
            summaries.map((summary) => (
              <Link
                key={summary.id}
                href={`/cadence${summary.orderDate ? `?week=${summary.orderDate}` : ""}`}
                className={`pill cadence-plan-pill ${selectedWeek === summary.orderDate ? "cadence-plan-pill--active" : ""}`}
              >
                {summary.orderDate}
              </Link>
            ))
          ) : (
            <p className="helper-text">No weekly plans are available yet.</p>
          )}
        </div>
      </section>

      {plan ? (
        <div className="stack">
          <CadenceEditor
            weeklyPlanId={plan.id}
            orderDate={plan.orderDate}
            analysisWindow={plan.analysisWindow}
            initialCadence={plan.cadence}
          />
          <MealPlanEditor
            weeklyPlanId={plan.id}
            orderDate={plan.orderDate}
            analysisWindow={plan.analysisWindow}
            initialMeals={plan.meals}
            recipes={recipes}
          />
        </div>
      ) : (
        <section className="panel">
          <p className="helper-text">There is no cadence plan selected yet.</p>
        </section>
      )}
    </main>
  );
}
