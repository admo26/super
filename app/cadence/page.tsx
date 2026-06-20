import Link from "next/link";

import { CadenceEditor } from "@/app/cadence/cadence-editor";
import { MealPlanEditor } from "@/app/cadence/meal-plan-editor";
import { generateNextWeeklyPlan } from "@/app/plan/actions";
import { formatHumanDate } from "@/lib/date-format";
import { getRecipes } from "@/lib/recipes";
import { getEditableWeeklyPlan, getRecurringCadence, getWeeklyPlanSummaries } from "@/lib/weekly-plan";

type CadencePageProps = {
  searchParams?: Promise<{
    error?: string;
    generated?: string;
    tab?: string;
  }>;
};

type PlannerTab = "staples" | "next-week";

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
  const generated = resolvedSearchParams.generated === "1";
  const error = resolvedSearchParams.error ?? null;
  const today = getTodayInPacificAuckland();
  const summaries = await getWeeklyPlanSummaries();
  const { recipes } = await getRecipes();
  const recurringCadence = await getRecurringCadence();
  const currentWeek = summaries.filter((plan) => plan.orderDate < today).at(-1)?.orderDate ?? null;
  const nextWeek = currentWeek
    ? summaries.find((plan) => plan.orderDate > currentWeek)?.orderDate ?? null
    : summaries.find((plan) => plan.orderDate >= today)?.orderDate ?? summaries.at(-1)?.orderDate ?? null;
  const selectedTab: PlannerTab = resolvedSearchParams.tab === "staples" ? "staples" : "next-week";
  const mealPlan = selectedTab === "next-week" && nextWeek ? await getEditableWeeklyPlan(nextWeek) : null;

  return (
    <main className="page-shell">
      {generated ? (
        <section className="notice-banner">
          Next week&apos;s plan is ready.
        </section>
      ) : null}
      {error ? <section className="notice-banner notice-banner--error">{error}</section> : null}
      <section className="page-header">
        <div>
          <p className="page-kicker">Plan</p>
          <h1>Stay one step ahead</h1>
          <p className="page-summary">
            Keep your regular staples handy and line up next week&apos;s meals before things get hectic.
          </p>
        </div>
      </section>

      <div className="stack">
        <nav className="cadence-tabs" aria-label="Planner sections">
          <Link
            className={`cadence-tab ${selectedTab === "next-week" ? "cadence-tab--active" : ""}`}
            href="/cadence"
          >
            Next Week&apos;s Meals
          </Link>
          <Link
            className={`cadence-tab ${selectedTab === "staples" ? "cadence-tab--active" : ""}`}
            href="/cadence?tab=staples"
          >
            Staples
          </Link>
        </nav>

        {selectedTab === "staples" ? (
          <CadenceEditor
            sourceLabel={
              recurringCadence.source === "master"
                ? "Your go-to staples list for future shops."
                : recurringCadence.sourceOrderDate
                  ? `Starting with your latest saved shop from ${formatHumanDate(recurringCadence.sourceOrderDate)} until you make it your go-to staples list.`
                  : "Your go-to staples list for future shops."
            }
            initialCadence={recurringCadence.cadence}
          />
        ) : mealPlan ? (
          <MealPlanEditor
            weeklyPlanId={mealPlan.id}
            orderDate={mealPlan.orderDate}
            analysisWindow={mealPlan.analysisWindow}
            initialMeals={mealPlan.meals}
            recipes={recipes}
          />
        ) : (
          <section className="panel">
            <div className="section-header">
              <div>
                <h2>Next week hasn&apos;t been lined up yet</h2>
                <p>If Friday&apos;s automatic run missed it, you can spin one up here.</p>
              </div>
              <form action={generateNextWeeklyPlan}>
                <input type="hidden" name="returnTo" value="/cadence" />
                <button className="action-button" type="submit">
                  Build next week&apos;s plan
                </button>
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
