export type CadenceKey = "weekly" | "fortnightly" | "monthly";

export type Meal = {
  name: string;
  type: string;
  note: string;
  url?: string;
};

export type CadenceItem = {
  name: string;
  qty: string;
  note: string;
};

export type ShoppingItem = {
  id?: string;
  name: string;
  qty: string;
  reason: string;
  meal: string;
  group: string;
};

export type WeeklyPlan = {
  id?: string;
  orderDate: string;
  analysisWindow: string;
  sourceLabel: string;
  meals: Meal[];
  cadence: Record<CadenceKey, CadenceItem[]>;
  assumptions: string[];
  adjustments: string[];
  items: ShoppingItem[];
};
