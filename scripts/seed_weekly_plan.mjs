import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const planPath = path.join(repoRoot, "data", "current_weekly_plan.json");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecret) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  console.error("Set them in your shell before running the seed script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecret, {
  auth: { persistSession: false }
});

const raw = await readFile(planPath, "utf8");
const plan = JSON.parse(raw);

const existing = await supabase
  .from("weekly_plans")
  .select("id")
  .eq("order_date", plan.orderDate)
  .maybeSingle();

if (existing.error) {
  console.error("Failed looking up existing weekly plan:", existing.error.message);
  process.exit(1);
}

if (existing.data?.id) {
  const deleted = await supabase
    .from("weekly_plans")
    .delete()
    .eq("id", existing.data.id);

  if (deleted.error) {
    console.error("Failed deleting existing weekly plan:", deleted.error.message);
    process.exit(1);
  }
}

const insertedPlan = await supabase
  .from("weekly_plans")
  .insert({
    order_date: plan.orderDate,
    analysis_window: plan.analysisWindow
  })
  .select("id")
  .single();

if (insertedPlan.error) {
  console.error("Failed inserting weekly plan:", insertedPlan.error.message);
  process.exit(1);
}

const weeklyPlanId = insertedPlan.data.id;

const meals = plan.meals.map((meal, index) => ({
  weekly_plan_id: weeklyPlanId,
  position: index,
  name: meal.name,
  type: meal.type,
  note: meal.note,
  recipe_url: meal.url ?? null
}));

const cadenceItems = Object.entries(plan.cadence).flatMap(([cadence, items]) =>
  items.map((item, index) => ({
    weekly_plan_id: weeklyPlanId,
    position: index,
    cadence,
    name: item.name,
    qty: item.qty,
    note: item.note
  }))
);

const shoppingItems = plan.items.map((item, index) => ({
  weekly_plan_id: weeklyPlanId,
  position: index,
  name: item.name,
  qty: item.qty,
  reason: item.reason,
  meal: item.meal,
  group: item.group
}));

for (const [label, rows, table] of [
  ["meals", meals, "weekly_plan_meals"],
  ["cadence items", cadenceItems, "weekly_plan_cadence_items"],
  ["shopping items", shoppingItems, "weekly_plan_items"]
]) {
  const result = await supabase.from(table).insert(rows);
  if (result.error) {
    console.error(`Failed inserting ${label}:`, result.error.message);
    process.exit(1);
  }
}

console.log(`Seeded weekly plan ${plan.orderDate} into Supabase.`);
