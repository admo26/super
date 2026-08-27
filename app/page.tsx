import Link from "next/link";
import { ChefHat, Wand2 } from "lucide-react";

import { LinkButton, PageHeader, Panel, Tag } from "@/app/ui";
import { getWeeklyPlan } from "@/lib/weekly-plan";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const plan = await getWeeklyPlan();

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="This Week"
        title="Dinners for the week"
        summary={<>A quick view of what&apos;s on for dinner now.</>}
        actions={
          <LinkButton as={Link} href="/cadence" icon={<Wand2 aria-hidden="true" />} variant="secondary">
            Plan next week
          </LinkButton>
        }
      />

      <div className="content-grid">
        <div className="dashboard-board">
          <Panel>
            <div className="section-header">
              <div>
                <h2><ChefHat aria-hidden="true" size={19} /> What&apos;s for dinner</h2>
                <p>Your current week at a glance.</p>
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
                  <Tag category={meal.type}>{meal.type}</Tag>
                </article>
              ))}
            </div>
          </Panel>

        </div>
      </div>
    </main>
  );
}
