# Input Schema (Recommended)

## `data/recent_orders.csv`
Recommended columns:
- `order_date` (YYYY-MM-DD)
- `item_name`
- `quantity`
- `unit` (each, g, kg, ml, l, pack)
- `category` (optional)
- `notes` (optional)

Example:
```csv
order_date,item_name,quantity,unit,category,notes
2026-05-10,Bananas,8,each,Produce,
2026-05-10,Milk,3,l,Dairy,
2026-05-10,Chicken Thighs,1.2,kg,Meat,boneless
```

## `data/recipes.md`
Recommended format:
```md
# Family Dinner Recipes

## Spaghetti Bolognese
frequency: weekly
ingredients:
- Beef mince
- Onion
- Garlic
- Canned tomatoes
- Spaghetti

## Butter Chicken
frequency: every_3_weeks
ingredients:
- Chicken thighs
- Onion
- Garlic
- Cream
- Rice
```

## Optional: `data/staples_overrides.md`
Use this for manual rules:
```md
- Oats: weekly
- Dishwasher tablets: monthly
- Rice: fortnightly, quantity_multiplier=1.5
```
