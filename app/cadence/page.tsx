import Link from "next/link";

import { CadenceEditor } from "@/app/cadence/cadence-editor";
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
  const selectedWeek =
    resolvedSearchParams.week ??
    summaries.filter((plan) => plan.orderDate <= today).at(-1)?.orderDate ??
    summaries.at(-1)?.orderDate ??
    null;
  const plan = selectedWeek ? await getEditableWeeklyPlan(selectedWeek) : null;

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Cadence Editor</p>
          <h1>View And Edit Recurring Items</h1>
          <p className="hero-copy">
            Keep the weekly, fortnightly, and monthly lists tidy in one place, then save the changes back to the weekly plan.
          </p>
        </div>

        <div className="hero-grid">
          <div className="hero-stats">
            <article className="stat-card">
              <span className="stat-label">Plans</span>
              <strong>{summaries.length}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Current view</span>
              <strong>{selectedWeek ?? "None"}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Status</span>
              <strong>{plan ? "Editable" : "Empty"}</strong>
            </article>
          </div>

          <aside className="hero-aside">
            <h2>Navigation</h2>
            <p className="hero-note">
              Switch between available weekly plans, then edit each cadence bucket with the tabbed editor below.
            </p>
          </aside>
        </div>
      </section>

      <section className="panel" style={{ marginTop: "18px" }}>
        <div className="section-header cadence-page__header">
          <div>
            <h2>Available Plans</h2>
            <p>Pick the week you want to inspect or edit.</p>
          </div>
          <Link className="ghost-button" href="/">
            Back to dashboard
          </Link>
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
        <div style={{ marginTop: "18px" }}>
          <CadenceEditor
            weeklyPlanId={plan.id}
            orderDate={plan.orderDate}
            analysisWindow={plan.analysisWindow}
            initialCadence={plan.cadence}
          />
        </div>
      ) : (
        <section className="panel" style={{ marginTop: "18px" }}>
          <p className="helper-text">There is no cadence plan selected yet.</p>
        </section>
      )}
    </main>
  );
}
