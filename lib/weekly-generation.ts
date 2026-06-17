import type { OrderHistoryRow } from "@/lib/order-history";
import { isBatchCook, type Recipe, type RecipeFrequency } from "@/lib/recipes";
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

type RecipeHistoryEntry = {
  orderDate: string;
  recipeName: string;
};

type RecipeUsageStats = {
  timesPlanned: number;
  lastPlannedOrderDate: string | null;
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

function cadenceReason(cadence: CadenceKey) {
  if (cadence === "weekly") return "weekly staple";
  if (cadence === "fortnightly") return "fortnightly staple";
  return "monthly staple";
}

function makeMealType(frequency: RecipeFrequency, batchCook: boolean) {
  if (frequency === "weekly") return "Weekly anchor";
  if (batchCook) return "Batch cook";
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

function buildRecipeUsageByName(entries: RecipeHistoryEntry[]) {
  const usage = new Map<string, RecipeUsageStats>();

  for (const entry of entries) {
    const normalizedName = normalizeText(entry.recipeName);
    if (!normalizedName) continue;

    const current = usage.get(normalizedName) ?? {
      timesPlanned: 0,
      lastPlannedOrderDate: null
    };

    current.timesPlanned += 1;
    if (!current.lastPlannedOrderDate || entry.orderDate > current.lastPlannedOrderDate) {
      current.lastPlannedOrderDate = entry.orderDate;
    }

    usage.set(normalizedName, current);
  }

  return usage;
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

function buildMealPlan(
  recipes: Recipe[],
  historyCounts: Map<string, number>,
  recipeHistory: RecipeHistoryEntry[]
) {
  const batchRecipes = recipes.filter((recipe) => isBatchCook(recipe));
  const weeklyRecipes = recipes.filter((recipe) => recipe.cookFrequency === "weekly" && !isBatchCook(recipe));
  const rotationRecipes = recipes.filter((recipe) => recipe.cookFrequency === "rotating" && !isBatchCook(recipe));
  const recipeUsageByName = buildRecipeUsageByName(recipeHistory);

  const scoredRotation = rotationRecipes
    .map((recipe) => ({
      recipe,
      score: scoreRecipe(recipe, historyCounts),
      usage: recipeUsageByName.get(normalizeText(recipe.name)) ?? {
        timesPlanned: 0,
        lastPlannedOrderDate: null
      }
    }))
    .sort((left, right) => {
      const leftNeverUsed = left.usage.lastPlannedOrderDate === null;
      const rightNeverUsed = right.usage.lastPlannedOrderDate === null;

      if (leftNeverUsed !== rightNeverUsed) {
        return leftNeverUsed ? -1 : 1;
      }

      if (left.usage.lastPlannedOrderDate !== right.usage.lastPlannedOrderDate) {
        return (left.usage.lastPlannedOrderDate ?? "").localeCompare(right.usage.lastPlannedOrderDate ?? "");
      }

      if (left.usage.timesPlanned !== right.usage.timesPlanned) {
        return left.usage.timesPlanned - right.usage.timesPlanned;
      }

      return right.score - left.score || left.recipe.name.localeCompare(right.recipe.name);
    });

  const dinnerRecipes = [...weeklyRecipes];

  for (const candidate of scoredRotation) {
    if (dinnerRecipes.length >= 5) break;
    dinnerRecipes.push(candidate.recipe);
  }

  const batchRecipe = batchRecipes[0] ?? null;

  const meals: Meal[] = dinnerRecipes.slice(0, 5).map((recipe) => ({
    name: recipe.name,
    type: makeMealType(recipe.cookFrequency, isBatchCook(recipe)),
    note: recipe.rotationNotes,
    url: recipe.source.startsWith("http") ? recipe.source : undefined
  }));

  if (batchRecipe) {
    meals.push({
      name: batchRecipe.name,
      type: makeMealType(batchRecipe.cookFrequency, true),
      note: batchRecipe.rotationNotes,
      url: batchRecipe.source.startsWith("http") ? batchRecipe.source : undefined
    });
  }

  return { meals, dinnerRecipes, batchRecipe };
}

export function buildShoppingItems(
  meals: Array<Meal & { recipe?: Recipe }>,
  cadenceItems: Record<CadenceKey, { name: string; qty: string; note: string }[]>
) {
  const items: ShoppingItem[] = [];
  const seen = new Map<string, string>();

  for (const cadence of ["weekly", "fortnightly", "monthly"] as const) {
    for (const item of cadenceItems[cadence]) {
      const canonical = canonicalName(item.name);
      if (!canonical || seen.has(canonical)) continue;

      seen.set(canonical, canonical);
      items.push({
        name: titleCase(item.name),
        qty: item.qty,
        reason: cadenceReason(cadence),
        meal: "Household staple",
        group: inferGroup(item.name)
      });
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
        reason: isBatchCook(recipe) ? "freezer batch" : "planned meal",
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
  recipeHistory: RecipeHistoryEntry[];
}) {
  const orders = groupHistoryOrders(args.historyRows).slice(0, 12);
  const snapshot = buildHistorySnapshot(orders);
  const mealPlan = buildMealPlan(args.recipes, snapshot.historyCounts, args.recipeHistory);

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
      "The shopping list is driven by the most common items from the latest imported orders.",
      "Rotating dinner picks prioritize recipes that have gone the longest without being scheduled."
    ],
    adjustments: [
      "Skip pantry ingredients already on hand.",
      "Trim produce quantities if the fridge is already full.",
      "Swap the rotation meal if the household wants a different dinner this week."
    ],
    items: shoppingItems
  } satisfies WeeklyPlanDraft;
}
