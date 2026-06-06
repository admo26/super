import type { WeeklyPlan } from "@/lib/types";

export const defaultPlan: WeeklyPlan = {
  orderDate: "2026-06-04",
  analysisWindow: "12 orders from 2026-01-30 to 2026-05-22",
  sourceLabel: "Repo fallback",
  meals: [
    { name: "Roast Chicken Dinner", type: "Weekly anchor", note: "Main roast night with potatoes, kumara and gravy." },
    { name: "Weekly Fajitas", type: "Weekly anchor", note: "Uses your regular wraps, capsicum, greens and chicken thighs." },
    { name: "Simple Sausages", type: "Easy dinner", note: "Low-effort sausage meal with potatoes, broccoli, carrots and cucumber." },
    { name: "Quick Coconut Chicken Curry", type: "Rotation meal", note: "Mild curry using coconut milk and pantry spices.", url: "https://simplehomeedit.com/recipe/quick-coconut-chicken-curry/" },
    { name: "Simple Chicken Katsu", type: "Rotation meal", note: "Crumbed chicken with bagged slaw and pantry sauces." },
    { name: "Bolognese freezer batch", type: "Batch cook", note: "Separate freezer top-up, not counted as one of the five dinners.", url: "https://www.langbein.com/recipes/bolognese-sauce" }
  ],
  cadence: {
    weekly: [
      { name: "Bananas", qty: "8 each", note: "12/12 weeks" },
      { name: "Bread", qty: "2 pack", note: "12/12 weeks" },
      { name: "Red onions", qty: "1 kg", note: "12/12 weeks" },
      { name: "Cherry tomatoes", qty: "2 pack", note: "12/12 weeks" },
      { name: "Milk", qty: "1 pack", note: "12/12 weeks" },
      { name: "Cucumber", qty: "1 each", note: "12/12 weeks" }
    ],
    fortnightly: [
      { name: "Sausages", qty: "1 pack", note: "7/12 weeks" },
      { name: "Potatoes", qty: "1 pack", note: "6/12 weeks" },
      { name: "Tortillas", qty: "1 pack", note: "5/12 weeks" },
      { name: "Coconut milk", qty: "1 pack", note: "5/12 weeks" },
      { name: "Avocado", qty: "3 each", note: "4/12 weeks" }
    ],
    monthly: [
      { name: "Beef mince", qty: "1 pack", note: "3/12 weeks" },
      { name: "Red kumara", qty: "1 pack", note: "3/12 weeks" },
      { name: "Rice", qty: "1 pack", note: "2/12 weeks" },
      { name: "Lettuce", qty: "1 pack", note: "2/12 weeks" },
      { name: "Peanut butter", qty: "1 pack", note: "2/12 weeks" }
    ]
  },
  assumptions: [
    "BBQ sauce, Kewpie mayo, oil, salt, pepper and core pantry sauces are already on hand.",
    "Four packs of chicken thighs should comfortably cover fajitas, curry and katsu.",
    "The bolognese cook is for freezer replenishment rather than one of this week's five dinners."
  ],
  adjustments: [
    "Skip curry spices and tomato paste if the pantry is already stocked.",
    "Drop avocado this week if fajitas are already covered from an earlier shop.",
    "Double beef mince and tomatoes if you want a larger bolognese freezer batch."
  ],
  items: [
    { name: "Tegel Free Range Oven Ready Sage & Onion Roast Fresh Chicken", qty: "1 pack", reason: "planned meal", meal: "Roast Chicken Dinner", group: "Protein" },
    { name: "Pams Brushed Agria Potatoes", qty: "1 pack", reason: "planned meal", meal: "Roast Chicken Dinner + Simple Sausages", group: "Vegetables" },
    { name: "Value Fresh Carrots", qty: "1 pack", reason: "planned meal", meal: "Roast Chicken Dinner + Simple Sausages", group: "Vegetables" },
    { name: "Red Kumara", qty: "1 pack", reason: "planned meal", meal: "Roast Chicken Dinner", group: "Vegetables" },
    { name: "Maggi Roast Chicken Flavoured Gravy Mix", qty: "1 pack", reason: "planned meal", meal: "Roast Chicken Dinner", group: "Pantry" },
    { name: "Pams Free Range Boneless Skinless Chicken Thighs", qty: "4 pack", reason: "planned meal", meal: "Fajitas + Curry + Katsu", group: "Protein" },
    { name: "Pams Flour Tortillas", qty: "1 pack", reason: "planned meal", meal: "Weekly Fajitas", group: "Bread & wraps" },
    { name: "Red Capsicum", qty: "2 each", reason: "planned meal", meal: "Weekly Fajitas", group: "Vegetables" },
    { name: "Loose Red Onions", qty: "1 kg", reason: "weekly staple", meal: "Fajitas + Curry + Bolognese", group: "Vegetables" },
    { name: "Pams Baby Spinach", qty: "1 pack", reason: "weekly staple", meal: "Weekly Fajitas", group: "Vegetables" },
    { name: "Pams Iceberg Lettuce", qty: "1 pack", reason: "planned meal", meal: "Weekly Fajitas", group: "Vegetables" },
    { name: "Pams Fresh Cherry Tomatoes", qty: "2 pack", reason: "weekly staple", meal: "Weekly Fajitas + household staple", group: "Vegetables" },
    { name: "Salsa", qty: "1 jar", reason: "planned meal", meal: "Weekly Fajitas", group: "Pantry" },
    { name: "Pams Mild Cheese", qty: "1 pack", reason: "planned meal", meal: "Weekly Fajitas", group: "Dairy" },
    { name: "Hellers Craft Angus Beef Sausages", qty: "1 pack", reason: "fortnightly staple", meal: "Simple Sausages", group: "Protein" },
    { name: "Broccoli", qty: "2 each", reason: "weekly staple", meal: "Simple Sausages + curry side", group: "Vegetables" },
    { name: "Telegraph Cucumber", qty: "2 each", reason: "weekly staple", meal: "Simple Sausages + Katsu side", group: "Vegetables" },
    { name: "Trident Premium Coconut Milk", qty: "1 pack", reason: "fortnightly staple", meal: "Quick Coconut Chicken Curry", group: "Pantry" },
    { name: "Tomato Paste", qty: "1 tube", reason: "planned meal", meal: "Curry + Bolognese", group: "Pantry" },
    { name: "Ginger", qty: "1 knob", reason: "planned meal", meal: "Quick Coconut Chicken Curry", group: "Vegetables" },
    { name: "Garlic", qty: "2 bulbs", reason: "planned meal", meal: "Curry + Bolognese", group: "Vegetables" },
    { name: "Curry Powder", qty: "1 pack", reason: "pantry check", meal: "Quick Coconut Chicken Curry", group: "Pantry" },
    { name: "Ground Turmeric", qty: "1 pack", reason: "pantry check", meal: "Quick Coconut Chicken Curry", group: "Pantry" },
    { name: "Ground Cumin", qty: "1 pack", reason: "pantry check", meal: "Quick Coconut Chicken Curry", group: "Pantry" },
    { name: "Basmati or Jasmine Rice", qty: "1 pack", reason: "monthly staple", meal: "Quick Coconut Chicken Curry", group: "Pantry" },
    { name: "Panko Breadcrumbs", qty: "1 pack", reason: "planned meal", meal: "Simple Chicken Katsu", group: "Pantry" },
    { name: "Asian Slaw Mix", qty: "1 bag", reason: "planned meal", meal: "Simple Chicken Katsu", group: "Vegetables" },
    { name: "Woodland Free Range Grade 8 Eggs", qty: "1 pack", reason: "weekly staple", meal: "Simple Chicken Katsu + household staple", group: "Dairy" },
    { name: "Affco Premium Beef Mince", qty: "1 pack", reason: "freezer batch", meal: "Bolognese freezer batch", group: "Protein" },
    { name: "Pams Italian Diced Tomatoes or Passata", qty: "2 to 4 pack", reason: "freezer batch", meal: "Bolognese freezer batch", group: "Pantry" },
    { name: "Spaghetti or Fettuccine", qty: "1 pack", reason: "freezer batch", meal: "Bolognese night or top-up", group: "Pantry" },
    { name: "Bananas", qty: "8 each", reason: "weekly staple", meal: "Household staple", group: "Fruit" },
    { name: "Freya's Swiss Soya Linseed Bread", qty: "2 pack", reason: "weekly staple", meal: "Household staple", group: "Bread & wraps" },
    { name: "Pams Value Standard Milk", qty: "1 pack", reason: "weekly staple", meal: "Household staple", group: "Dairy" },
    { name: "Boring No Added Sugar Oat Milk", qty: "2 pack", reason: "weekly staple", meal: "Household staple", group: "Dairy" },
    { name: "Avocado", qty: "3 each", reason: "fortnightly staple", meal: "Useful for fajitas or lunches", group: "Fruit" },
    { name: "The Berry Fix Snap Frozen Mixed Berries", qty: "1 pack", reason: "fortnightly staple", meal: "Household staple", group: "Frozen" }
  ]
};
