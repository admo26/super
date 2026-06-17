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
  const recurringPlan = await getEditableWeeklyPlan();
  const selectedWeek =
    resolvedSearchParams.week ??
    summaries.filter((plan) => plan.orderDate <= today).at(-1)?.orderDate ??
    summaries.at(-1)?.orderDate ??
    null;
  const mealPlan = selectedWeek ? await getEditableWeeklyPlan(selectedWeek) : null;

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
          <span className="metric-label">Recurring list</span>
          <strong>{recurringPlan ? "Static master" : "Empty"}</strong>
        </article>
        <article className="metric-card">
          <span className="metric-label">Meal week</span>
          <strong>{selectedWeek ?? "None"}</strong>
        </article>
      </section>

      {recurringPlan ? (
        <div className="stack">
          <CadenceEditor
            weeklyPlanId={recurringPlan.id}
            orderDate={recurringPlan.orderDate}
            analysisWindow={recurringPlan.analysisWindow}
            initialCadence={recurringPlan.cadence}
          />

          <section className="panel">
            <div className="section-header cadence-page__header">
              <div>
                <h2>Meal Week Switcher</h2>
                <p>Pick the saved week to inspect or edit its meal lineup.</p>
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

          {mealPlan ? (
            <MealPlanEditor
              weeklyPlanId={mealPlan.id}
              orderDate={mealPlan.orderDate}
              analysisWindow={mealPlan.analysisWindow}
              initialMeals={mealPlan.meals}
              recipes={recipes}
            />
          ) : (
            <section className="panel">
              <p className="helper-text">There is no saved meal plan selected yet.</p>
            </section>
          )}
        </div>
      ) : (
        <section className="panel">
          <p className="helper-text">There is no recurring staples list available yet.</p>
        </section>
      )}
    </main>
  );
}
