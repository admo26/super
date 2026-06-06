import type { OrderHistoryRow } from "@/lib/order-history";
import type { Recipe } from "@/lib/recipes";
import type { CadenceKey, Meal, ShoppingItem } from "@/lib/types";

type WeeklyPlanDraft = {
  orderDate: string;
  analysisWindow: string;
  meals: Meal[];
  cadence: Record<CadenceKey, { name: string; qty: string; note: string }[]>;
  assumptions: string[];
  adjustments: string[];
  items: ShoppingItem[];
};

type HistoryOrder = {
  orderDate: string;
  rows: OrderHistoryRow[];
};

type IngredientEntry = {
  name: string;
  qty: string;
};

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalName(value: string) {
  return normalizeText(value)
    .replace(/\b(pack|bag|each|kg|g|jar|tube|bunch|box|bottle|loaf|punnet|tray|sachet|packet)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(value: string) {
  if (value !== value.toLowerCase()) return value.trim();

  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function formatQuantity(row: OrderHistoryRow) {
  const quantity = row.quantity?.trim();
  const unit = row.unit?.trim();

  if (quantity && unit) return `${quantity} ${unit}`;
  if (quantity) return quantity;
  if (unit) return unit;
  return "1 pack";
}

function isAllowedOptionalIngredient(value: string) {
  return /optional/i.test(value);
}

function isProduce(name: string) {
  return /(banana|apple|berry|berries|broccoli|cucumber|capsicum|carrot|kumara|potato|onion|lettuce|spinach|tomato|avocado|ginger|garlic|slaw)/i.test(name);
}

function parseIngredientSpec(spec: string): IngredientEntry | null {
  const trimmed = spec.trim();

  if (!trimmed || isAllowedOptionalIngredient(trimmed)) {
    return null;
  }

  const match = trimmed.match(/^(.*?)(?:\s*\(([^)]+)\))?$/);
  const name = titleCase((match?.[1] ?? trimmed).trim());
  const quantityRaw = match?.[2]?.trim() ?? "";

  if (quantityRaw) {
    if (/^\d+$/.test(quantityRaw)) {
      return {
        name,
        qty: `${quantityRaw} ${isProduce(name) ? "each" : "pack"}`
      };
    }

    return {
      name,
      qty: quantityRaw
    };
  }

  return {
    name,
    qty: isProduce(name) ? "1 each" : "1 pack"
  };
}

function inferGroup(name: string) {
  if (/(beef|chicken|pork|sausage|sausages|meatball|meatballs|egg|eggs|fish|mince)/i.test(name)) {
    return "Protein";
  }

  if (/(milk|cheese|yoghurt|yogurt|cream|butter|coconut milk|kewpie|mayo)/i.test(name)) {
    return "Dairy";
  }

  if (/(bread|wrap|tortilla|pita|pasta|rice|noodle|panko|breadcrumb|flour|sauce|passata|tomato paste|canned tomatoes|salsa|spice|curry|oil|vinegar|jar|tube|sachet)/i.test(name)) {
    return "Pantry";
  }

  if (/(banana|apple|berries|berry|fruit|avocado)/i.test(name)) {
    return "Fruit";
  }

  if (/(frozen)/i.test(name)) {
    return "Frozen";
  }

  if (/(potato|potatoes|kumara|carrot|broccoli|cucumber|capsicum|lettuce|spinach|tomato|onion|garlic|ginger|slaw)/i.test(name)) {
    return "Vegetables";
  }

  return "Pantry";
}

function makeMealType(frequency: string) {
  if (frequency === "weekly") return "Weekly anchor";
  if (frequency === "fortnightly") return "Fortnightly rotation";
  if (frequency === "monthly_batch") return "Batch cook";
  return "Rotation meal";
}

function groupHistoryOrders(rows: OrderHistoryRow[]): HistoryOrder[] {
  const groups = new Map<string, OrderHistoryRow[]>();

  for (const row of rows) {
    if (!row.order_date) continue;

    const current = groups.get(row.order_date) ?? [];
    current.push(row);
    groups.set(row.order_date, current);
  }

  return [...groups.entries()]
    .map(([orderDate, groupedRows]) => ({
      orderDate,
      rows: groupedRows
    }))
    .sort((left, right) => right.orderDate.localeCompare(left.orderDate));
}

function scoreRecipe(recipe: Recipe, historyCounts: Map<string, number>) {
  return recipe.ingredientsToMap.reduce((score, ingredient) => {
    const parsed = parseIngredientSpec(ingredient);
    if (!parsed) return score;

    const ingredientCanonical = canonicalName(parsed.name);
    if (!ingredientCanonical) return score;

    let bestMatch = 0;

    for (const [historyName, count] of historyCounts.entries()) {
      if (historyName.includes(ingredientCanonical) || ingredientCanonical.includes(historyName)) {
        bestMatch = Math.max(bestMatch, count);
      }
    }

    return score + bestMatch;
  }, 0);
}

function isSimilarItem(left: string, right: string) {
  return left === right || left.includes(right) || right.includes(left);
}

function buildHistorySnapshot(orders: HistoryOrder[]) {
  const historyCounts = new Map<string, number>();
  const latestRowsByName = new Map<string, OrderHistoryRow>();

  for (const order of orders) {
    const seenInOrder = new Set<string>();

    for (const row of order.rows) {
      const name = canonicalName(row.item_name);
      if (!name || seenInOrder.has(name)) continue;

      seenInOrder.add(name);
      historyCounts.set(name, (historyCounts.get(name) ?? 0) + 1);

      if (!latestRowsByName.has(name)) {
        latestRowsByName.set(name, row);
      }
    }
  }

  const totalOrders = orders.length || 1;
  const scoredItems = [...historyCounts.entries()]
    .map(([name, count]) => ({
      name,
      count,
      row: latestRowsByName.get(name)!
    }))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));

  const weekly = scoredItems.filter((item) => item.count / totalOrders >= 0.7).slice(0, 6);
  const fortnightly = scoredItems.filter((item) => item.count / totalOrders >= 0.35 && item.count / totalOrders < 0.7).slice(0, 5);
  const monthly = scoredItems.filter((item) => item.count / totalOrders >= 0.2 && item.count / totalOrders < 0.35).slice(0, 5);

  const seen = new Set<string>();

  const cadence = {
    weekly: weekly.map((item) => {
      seen.add(item.name);
      return {
        name: titleCase(item.row.item_name),
        qty: formatQuantity(item.row),
        note: `${item.count}/${totalOrders} orders`
      };
    }),
    fortnightly: fortnightly.filter((item) => !seen.has(item.name)).map((item) => {
      seen.add(item.name);
      return {
        name: titleCase(item.row.item_name),
        qty: formatQuantity(item.row),
        note: `${item.count}/${totalOrders} orders`
      };
    }),
    monthly: monthly.filter((item) => !seen.has(item.name)).map((item) => {
      seen.add(item.name);
      return {
        name: titleCase(item.row.item_name),
        qty: formatQuantity(item.row),
        note: `${item.count}/${totalOrders} orders`
      };
    })
  };

  return { cadence, historyCounts, totalOrders, scoredItems };
}

function buildMealPlan(recipes: Recipe[], historyCounts: Map<string, number>) {
  const monthlyBatchRecipes = recipes.filter((recipe) => recipe.cookFrequency === "monthly_batch");
  const weeklyRecipes = recipes.filter((recipe) => recipe.cookFrequency === "weekly");
  const rotationRecipes = recipes.filter((recipe) => recipe.cookFrequency !== "weekly" && recipe.cookFrequency !== "monthly_batch");

  const scoredRotation = rotationRecipes
    .map((recipe) => ({
      recipe,
      score: scoreRecipe(recipe, historyCounts)
    }))
    .sort((left, right) => right.score - left.score || left.recipe.name.localeCompare(right.recipe.name));

  const dinnerRecipes = [...weeklyRecipes];

  for (const candidate of scoredRotation) {
    if (dinnerRecipes.length >= 5) break;
    dinnerRecipes.push(candidate.recipe);
  }

  const batchRecipe = monthlyBatchRecipes[0] ?? null;

  const meals: Meal[] = dinnerRecipes.slice(0, 5).map((recipe) => ({
    name: recipe.name,
    type: makeMealType(recipe.cookFrequency),
    note: recipe.rotationNotes,
    url: recipe.source.startsWith("http") ? recipe.source : undefined
  }));

  if (batchRecipe) {
    meals.push({
      name: batchRecipe.name,
      type: makeMealType(batchRecipe.cookFrequency),
      note: batchRecipe.rotationNotes,
      url: batchRecipe.source.startsWith("http") ? batchRecipe.source : undefined
    });
  }

  return { meals, dinnerRecipes, batchRecipe };
}

function buildShoppingItems(
  meals: Array<Meal & { recipe?: Recipe }>,
  cadenceItems: Record<CadenceKey, { name: string; qty: string; note: string }[]>
) {
  const items: ShoppingItem[] = [];
  const seen = new Map<string, string>();

  const seedNames = [
    ...cadenceItems.weekly,
    ...cadenceItems.fortnightly,
    ...cadenceItems.monthly
  ].map((item) => canonicalName(item.name));

  for (const name of seedNames) {
    if (name) {
      seen.set(name, name);
    }
  }

  for (const meal of meals) {
    const recipe = meal.recipe;
    if (!recipe) continue;

    for (const ingredient of recipe.ingredientsToMap) {
      const parsed = parseIngredientSpec(ingredient);
      if (!parsed) continue;

      const canonical = canonicalName(parsed.name);
      if (!canonical) continue;

      const existingKey = [...seen.keys()].find((key) => isSimilarItem(key, canonical));
      if (existingKey) continue;

      seen.set(canonical, canonical);
      items.push({
        name: parsed.name,
        qty: parsed.qty,
        reason: recipe.cookFrequency === "monthly_batch" ? "freezer batch" : "planned meal",
        meal: meal.name,
        group: inferGroup(parsed.name)
      });
    }
  }

  return items;
}

export function generateWeeklyPlanDraft(args: {
  latestPlanDate: string | null;
  historyRows: OrderHistoryRow[];
  recipes: Recipe[];
}) {
  const orders = groupHistoryOrders(args.historyRows).slice(0, 12);
  const snapshot = buildHistorySnapshot(orders);
  const mealPlan = buildMealPlan(args.recipes, snapshot.historyCounts);

  const mealsWithRecipes = mealPlan.meals.map((meal) => ({
    ...meal,
    recipe: args.recipes.find((recipe) => recipe.name === meal.name)
  }));

  const shoppingItems = buildShoppingItems(mealsWithRecipes, snapshot.cadence);
  const latestOrderDate = args.latestPlanDate ?? orders[0]?.orderDate ?? formatDate(new Date());
  const nextOrderDate = addDays(latestOrderDate, 7);

  return {
    orderDate: nextOrderDate,
    analysisWindow: `${orders.length} orders from ${orders.at(-1)?.orderDate ?? "unknown"} to ${orders[0]?.orderDate ?? "unknown"}`,
    meals: mealPlan.meals,
    cadence: snapshot.cadence,
    assumptions: [
      "BBQ sauce, Kewpie mayo, oil, salt, pepper and core pantry sauces are already on hand.",
      "The freezer batch is for bolognese top-ups rather than an extra dinner.",
      "The shopping list is driven by the most common items from the latest imported orders."
    ],
    adjustments: [
      "Skip pantry ingredients already on hand.",
      "Trim produce quantities if the fridge is already full.",
      "Swap the rotation meal if the household wants a different dinner this week."
    ],
    items: shoppingItems
  } satisfies WeeklyPlanDraft;
}
